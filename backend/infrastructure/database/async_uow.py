from __future__ import annotations

from typing import Optional, Tuple

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from backend.domain.interfaces.repository import (
    IActivityRepository,
    IAnalysisJobRepository,
    IAnalysisResultRepository,
    ICollectionRepository,
    ICrystalStructureRepository,
    IDownloadRepository,
    IExperimentRepository,
    IMeasurementRepository,
    INotificationRepository,
    IOrganizationRepository,
    IProjectRepository,
    IReportRepository,
    ISampleRepository,
    ISearchConfigRepository,
    IUserRepository,
)
from backend.domain.interfaces.unit_of_work import IUnitOfWork
from backend.infrastructure.database.connection import _normalize_database_url
from backend.infrastructure.database.async_repositories import (
    AsyncActivityRepository,
    AsyncAnalysisJobRepository,
    AsyncAnalysisResultRepository,
    AsyncCollectionRepository,
    AsyncCrystalStructureRepository,
    AsyncDownloadRepository,
    AsyncExperimentRepository,
    AsyncMeasurementRepository,
    AsyncNotificationRepository,
    AsyncOrganizationRepository,
    AsyncProjectRepository,
    AsyncReportRepository,
    AsyncSampleRepository,
    AsyncSearchConfigRepository,
    AsyncUserRepository,
)


class AsyncUnitOfWork(IUnitOfWork):
    """Async Unit of Work using SQLAlchemy async sessions."""

    def __init__(self, session: AsyncSession):
        self._session = session
        self._committed = False

        # Repositories
        self.users: IUserRepository = AsyncUserRepository(session)
        self.projects: IProjectRepository = AsyncProjectRepository(session)
        self.samples: ISampleRepository = AsyncSampleRepository(session)
        self.measurements: IMeasurementRepository = AsyncMeasurementRepository(session)
        self.crystal_structures: ICrystalStructureRepository = AsyncCrystalStructureRepository(session)
        self.experiments: IExperimentRepository = AsyncExperimentRepository(session)
        self.analysis_jobs: IAnalysisJobRepository = AsyncAnalysisJobRepository(session)
        self.analysis_results: IAnalysisResultRepository = AsyncAnalysisResultRepository(session)
        self.reports: IReportRepository = AsyncReportRepository(session)
        self.collections: ICollectionRepository = AsyncCollectionRepository(session)
        self.downloads: IDownloadRepository = AsyncDownloadRepository(session)
        self.notifications: INotificationRepository = AsyncNotificationRepository(session)
        self.search_configs: ISearchConfigRepository = AsyncSearchConfigRepository(session)
        self.activities: IActivityRepository = AsyncActivityRepository(session)
        self.organizations: IOrganizationRepository = AsyncOrganizationRepository(session)

    async def commit(self) -> None:
        await self._session.commit()
        self._committed = True

    async def rollback(self) -> None:
        await self._session.rollback()
        self._committed = False

    async def close(self) -> None:
        """Close the underlying session, releasing its connection."""
        await self._session.close()
        self._committed = False

    async def __aenter__(self) -> AsyncUnitOfWork:
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is not None:
            await self.rollback()
        elif not self._committed:
            await self.commit()
        await self._session.close()


def build_async_uow(db_url: str) -> Tuple[object, AsyncUnitOfWork]:
    """Create an :class:`AsyncUnitOfWork` bound to ``db_url``.

    Returns a ``(engine, uow)`` tuple so callers can keep the engine around
    for disposal. Creating the engine/session does not connect to the
    database; the first query or ``create_all`` establishes the connection.
    """
    clean_url, connect_args = _normalize_database_url(db_url)
    is_sqlite = "sqlite" in clean_url

    if is_sqlite:
        engine = create_async_engine(
            clean_url,
            connect_args=connect_args,
            poolclass=NullPool,
            echo=False,
        )
    else:
        engine = create_async_engine(
            clean_url,
            connect_args=connect_args,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300,
            echo=False,
        )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    uow = AsyncUnitOfWork(session_factory())
    return engine, uow
