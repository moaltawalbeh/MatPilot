from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID


class IRepository(ABC):
    """Generic repository interface following Repository Pattern."""

    @abstractmethod
    async def get_by_id(self, id: UUID) -> Optional[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_all(self) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def add(self, entity: object) -> object:
        raise NotImplementedError

    @abstractmethod
    async def update(self, entity: object) -> object:
        raise NotImplementedError

    @abstractmethod
    async def delete(self, id: UUID) -> bool:
        raise NotImplementedError


class IExperimentRepository(IRepository):
    """Repository for XRDExperiment entities."""

    @abstractmethod
    async def get_by_name(self, name: str) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_dataset(self, dataset_id: UUID) -> List[object]:
        raise NotImplementedError


class IAnalysisJobRepository(IRepository):
    """Repository for AnalysisJob entities."""

    @abstractmethod
    async def get_by_status(self, status: str) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_experiment(self, experiment_id: UUID) -> List[object]:
        raise NotImplementedError


class IAnalysisResultRepository(IRepository):
    """Repository for AnalysisResult entities."""

    @abstractmethod
    async def get_by_job(self, job_id: UUID) -> Optional[object]:
        raise NotImplementedError


class IReportRepository(IRepository):
    """Repository for Report entities."""
    pass


class IProjectRepository(IRepository):
    """Repository for Project entities."""

    @abstractmethod
    async def get_by_owner(self, owner_id: str) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_status(self, status: str) -> List[object]:
        raise NotImplementedError


class ISampleRepository(IRepository):
    """Repository for Sample entities."""

    @abstractmethod
    async def get_by_owner(self, owner_id: UUID) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_status(self, status: str) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def search(self, query: str, tags: Optional[List[str]] = None) -> List[object]:
        raise NotImplementedError


class IMeasurementRepository(IRepository):
    """Repository for Measurement entities."""

    @abstractmethod
    async def get_by_sample(self, sample_id: UUID) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_status(self, status: str) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_experiment(self, experiment_id: UUID) -> Optional[object]:
        raise NotImplementedError


class ICrystalStructureRepository(IRepository):
    """Repository for CrystalStructure entities."""

    @abstractmethod
    async def get_by_source(self, source: str, source_id: str) -> Optional[object]:
        raise NotImplementedError

    @abstractmethod
    async def search_by_formula(self, formula: str) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def search_by_space_group(self, space_group: str) -> List[object]:
        raise NotImplementedError


class ICollectionRepository(IRepository):
    """Repository for Collection entities."""

    @abstractmethod
    async def get_by_owner(self, owner_id: UUID) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_type(self, collection_type: str) -> List[object]:
        raise NotImplementedError


class IDownloadRepository(IRepository):
    """Repository for Download entities."""

    @abstractmethod
    async def get_by_user(self, user_id: UUID) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_status(self, status: str) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_pending(self) -> List[object]:
        raise NotImplementedError


class INotificationRepository(IRepository):
    """Repository for Notification entities."""

    @abstractmethod
    async def get_by_user(self, user_id: UUID, unread_only: bool = False) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_unread_count(self, user_id: UUID) -> int:
        raise NotImplementedError

    @abstractmethod
    async def mark_all_read(self, user_id: UUID) -> int:
        raise NotImplementedError


class ISearchConfigRepository(IRepository):
    """Repository for SearchConfig entities."""

    @abstractmethod
    async def get_by_owner(self, owner_id: UUID) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_type(self, search_type: str) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_popular(self, limit: int = 10) -> List[object]:
        raise NotImplementedError


class IActivityRepository(IRepository):
    """Repository for Activity entities."""

    @abstractmethod
    async def get_by_user(self, user_id: UUID, limit: int = 50) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_project(self, project_id: UUID, limit: int = 50) -> List[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_recent(self, limit: int = 100) -> List[object]:
        raise NotImplementedError


class IUserRepository(IRepository):
    """Repository for User entities."""

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_username(self, username: str) -> Optional[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_organization(self, org_id: UUID) -> List[object]:
        raise NotImplementedError


class IOrganizationRepository(IRepository):
    """Repository for Organization entities."""

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Optional[object]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_owner(self, owner_id: UUID) -> List[object]:
        raise NotImplementedError
