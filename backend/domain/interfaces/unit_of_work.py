
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from typing import AsyncContextManager

from backend.domain.interfaces.repository import (
    IExperimentRepository,
    IAnalysisJobRepository,
    IAnalysisResultRepository,
    IReportRepository,
    IProjectRepository,
)


class IUnitOfWork(ABC):
    """
    Unit of Work pattern interface.

    Ensures atomic transactions across multiple repositories.
    All business operations that modify state must use a UoW.
    """

    experiments: IExperimentRepository
    analysis_jobs: IAnalysisJobRepository
    analysis_results: IAnalysisResultRepository
    reports: IReportRepository
    projects: IProjectRepository

    @abstractmethod
    async def commit(self):
        """Commit all pending changes."""
        raise NotImplementedError

    @abstractmethod
    async def rollback(self):
        """Rollback all pending changes."""
        raise NotImplementedError

    @abstractmethod
    async def __aenter__(self):
        raise NotImplementedError

    @abstractmethod
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        raise NotImplementedError
