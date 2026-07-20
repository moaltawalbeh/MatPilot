from backend.domain.interfaces.unit_of_work import IUnitOfWork
from backend.domain.interfaces.repository import (
    IExperimentRepository,
    IAnalysisJobRepository,
    IAnalysisResultRepository,
    IReportRepository,
    IProjectRepository,
    ISampleRepository,
    IMeasurementRepository,
    ICrystalStructureRepository,
    ICollectionRepository,
    IDownloadRepository,
    INotificationRepository,
    ISearchConfigRepository,
    IActivityRepository,
    IUserRepository,
    IOrganizationRepository,
)
from backend.infrastructure.database.memory_repositories import (
    MemoryExperimentRepository,
    MemoryAnalysisJobRepository,
    MemoryAnalysisResultRepository,
    MemoryReportRepository,
    MemoryProjectRepository,
    MemorySampleRepository,
    MemoryMeasurementRepository,
    MemoryCrystalStructureRepository,
    MemoryCollectionRepository,
    MemoryDownloadRepository,
    MemoryNotificationRepository,
    MemorySearchConfigRepository,
    MemoryActivityRepository,
    MemoryUserRepository,
    MemoryOrganizationRepository,
)


class InMemoryUnitOfWork(IUnitOfWork):
    def __init__(self):
        self.experiments = MemoryExperimentRepository()
        self.analysis_jobs = MemoryAnalysisJobRepository()
        self.analysis_results = MemoryAnalysisResultRepository()
        self.reports = MemoryReportRepository()
        self.projects = MemoryProjectRepository()
        self.samples = MemorySampleRepository()
        self.measurements = MemoryMeasurementRepository()
        self.crystal_structures = MemoryCrystalStructureRepository()
        self.collections = MemoryCollectionRepository()
        self.downloads = MemoryDownloadRepository()
        self.notifications = MemoryNotificationRepository()
        self.search_configs = MemorySearchConfigRepository()
        self.activities = MemoryActivityRepository()
        self.users = MemoryUserRepository()
        self.organizations = MemoryOrganizationRepository()
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
