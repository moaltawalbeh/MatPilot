
from typing import List, Optional, Dict
from uuid import UUID

from backend.domain.interfaces.repository import (
    IExperimentRepository,
    IAnalysisJobRepository,
    IAnalysisResultRepository,
    IReportRepository
)


class MemoryExperimentRepository(IExperimentRepository):
    def __init__(self):
        self._data: Dict[UUID, object] = {}

    async def get_by_id(self, id: UUID) -> Optional[object]:
        return self._data.get(id)

    async def get_all(self) -> List[object]:
        return list(self._data.values())

    async def add(self, entity: object) -> object:
        self._data[entity.id] = entity
        return entity

    async def update(self, entity: object) -> object:
        self._data[entity.id] = entity
        return entity

    async def delete(self, id: UUID) -> bool:
        if id in self._data:
            del self._data[id]
            return True
        return False

    async def get_by_name(self, name: str) -> List[object]:
        return [e for e in self._data.values() if getattr(e, "name", "") == name]

    async def get_by_dataset(self, dataset_id: UUID) -> List[object]:
        return []


class MemoryAnalysisJobRepository(IAnalysisJobRepository):
    def __init__(self):
        self._data: Dict[UUID, object] = {}

    async def get_by_id(self, id: UUID) -> Optional[object]:
        return self._data.get(id)

    async def get_all(self) -> List[object]:
        return list(self._data.values())

    async def add(self, entity: object) -> object:
        self._data[entity.id] = entity
        return entity

    async def update(self, entity: object) -> object:
        self._data[entity.id] = entity
        return entity

    async def delete(self, id: UUID) -> bool:
        return self._data.pop(id, None) is not None

    async def get_by_status(self, status: str) -> List[object]:
        return [j for j in self._data.values() if getattr(j, "status", None) and j.status.name == status]

    async def get_by_experiment(self, experiment_id: UUID) -> List[object]:
        return [j for j in self._data.values() if getattr(j, "experiment_id", None) == experiment_id]


class MemoryAnalysisResultRepository(IAnalysisResultRepository):
    def __init__(self):
        self._data: Dict[UUID, object] = {}

    async def get_by_id(self, id: UUID) -> Optional[object]:
        return self._data.get(id)

    async def get_all(self) -> List[object]:
        return list(self._data.values())

    async def add(self, entity: object) -> object:
        self._data[entity.id] = entity
        return entity

    async def update(self, entity: object) -> object:
        self._data[entity.id] = entity
        return entity

    async def delete(self, id: UUID) -> bool:
        return self._data.pop(id, None) is not None

    async def get_by_job(self, job_id: UUID) -> Optional[object]:
        return next((r for r in self._data.values() if getattr(r, "job_id", None) == job_id), None)


class MemoryReportRepository(IReportRepository):
    def __init__(self):
        self._data: Dict[UUID, object] = {}

    async def get_by_id(self, id: UUID) -> Optional[object]:
        return self._data.get(id)

    async def get_all(self) -> List[object]:
        return list(self._data.values())

    async def add(self, entity: object) -> object:
        self._data[entity.id] = entity
        return entity

    async def update(self, entity: object) -> object:
        self._data[entity.id] = entity
        return entity

    async def delete(self, id: UUID) -> bool:
        return self._data.pop(id, None) is not None
