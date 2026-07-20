from __future__ import annotations

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

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

    async def __aenter__(self) -> AsyncUnitOfWork:
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is not None:
            await self.rollback()
        elif not self._committed:
            await self.commit()
        await self._session.close()
