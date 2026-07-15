
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
