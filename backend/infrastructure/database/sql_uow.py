
from backend.domain.interfaces.unit_of_work import IUnitOfWork
from backend.infrastructure.database.memory_repositories import (
    MemoryExperimentRepository,
    MemoryAnalysisJobRepository,
    MemoryAnalysisResultRepository,
    MemoryReportRepository
)


class InMemoryUnitOfWork(IUnitOfWork):
    def __init__(self):
        self.experiments = MemoryExperimentRepository()
        self.analysis_jobs = MemoryAnalysisJobRepository()
        self.analysis_results = MemoryAnalysisResultRepository()
        self.reports = MemoryReportRepository()
        self._committed = False

    async def commit(self):
        self._committed = True

    async def rollback(self):
        self._committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.rollback()
