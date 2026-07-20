from typing import List, Optional, Dict
from uuid import UUID

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

    async def get_by_project_id(self, project_id) -> List[object]:
        from uuid import UUID
        if isinstance(project_id, str):
            project_id = UUID(project_id)
        return [e for e in self._data.values() if getattr(e, "project_id", None) == project_id]


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


class MemoryProjectRepository(IProjectRepository):
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

    async def get_by_owner(self, owner_id: str) -> List[object]:
        return [p for p in self._data.values() if getattr(p, "owner_id", "") == owner_id]

    async def get_by_status(self, status: str) -> List[object]:
        return [p for p in self._data.values() if getattr(p, "status", "") == status]


# ── New Enterprise Repositories ──────────────────────────────────────


class MemorySampleRepository(ISampleRepository):
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

    async def get_by_owner(self, owner_id: UUID) -> List[object]:
        return [s for s in self._data.values() if getattr(s, "owner_id", None) == owner_id]

    async def get_by_status(self, status: str) -> List[object]:
        return [s for s in self._data.values() if getattr(s, "status", None) and s.status.name == status]

    async def search(self, query: str, tags: Optional[List[str]] = None) -> List[object]:
        q = query.lower()
        results = [s for s in self._data.values()
                   if q in getattr(s, "name", "").lower()
                   or q in getattr(s, "formula", "").lower()
                   or q in getattr(s, "description", "").lower()]
        if tags:
            results = [s for s in results if any(t in getattr(s, "tags", []) for t in tags)]
        return results


class MemoryMeasurementRepository(IMeasurementRepository):
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

    async def get_by_sample(self, sample_id: UUID) -> List[object]:
        return [m for m in self._data.values() if getattr(m, "sample_id", None) == sample_id]

    async def get_by_status(self, status: str) -> List[object]:
        return [m for m in self._data.values() if getattr(m, "status", None) and m.status.name == status]

    async def get_by_experiment(self, experiment_id: UUID) -> Optional[object]:
        return next((m for m in self._data.values() if getattr(m, "experiment_id", None) == experiment_id), None)


class MemoryCrystalStructureRepository(ICrystalStructureRepository):
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

    async def get_by_source(self, source: str, source_id: str) -> Optional[object]:
        return next((s for s in self._data.values()
                     if getattr(s, "source", "") == source and getattr(s, "source_id", "") == source_id), None)

    async def search_by_formula(self, formula: str) -> List[object]:
        f = formula.lower()
        return [s for s in self._data.values() if f in getattr(s, "formula", "").lower()]

    async def search_by_space_group(self, space_group: str) -> List[object]:
        sg = space_group.lower()
        return [s for s in self._data.values() if getattr(s, "space_group", "").lower() == sg]


class MemoryCollectionRepository(ICollectionRepository):
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

    async def get_by_owner(self, owner_id: UUID) -> List[object]:
        return [c for c in self._data.values() if getattr(c, "owner_id", None) == owner_id]

    async def get_by_type(self, collection_type: str) -> List[object]:
        return [c for c in self._data.values()
                if getattr(c, "collection_type", None) and c.collection_type.name == collection_type]


class MemoryDownloadRepository(IDownloadRepository):
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

    async def get_by_user(self, user_id: UUID) -> List[object]:
        return [d for d in self._data.values() if getattr(d, "user_id", None) == user_id]

    async def get_by_status(self, status: str) -> List[object]:
        return [d for d in self._data.values() if getattr(d, "status", None) and d.status.name == status]

    async def get_pending(self) -> List[object]:
        return [d for d in self._data.values()
                if getattr(d, "status", None) and d.status.name == "PENDING"]


class MemoryNotificationRepository(INotificationRepository):
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

    async def get_by_user(self, user_id: UUID, unread_only: bool = False) -> List[object]:
        results = [n for n in self._data.values() if getattr(n, "user_id", None) == user_id]
        if unread_only:
            results = [n for n in results if not getattr(n, "is_read", False)]
        return sorted(results, key=lambda n: getattr(n, "created_at", ""), reverse=True)

    async def get_unread_count(self, user_id: UUID) -> int:
        return len([n for n in self._data.values()
                    if getattr(n, "user_id", None) == user_id and not getattr(n, "is_read", False)])

    async def mark_all_read(self, user_id: UUID) -> int:
        count = 0
        for n in self._data.values():
            if getattr(n, "user_id", None) == user_id and not getattr(n, "is_read", False):
                n.mark_read()
                count += 1
        return count


class MemorySearchConfigRepository(ISearchConfigRepository):
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

    async def get_by_owner(self, owner_id: UUID) -> List[object]:
        return [sc for sc in self._data.values() if getattr(sc, "owner_id", None) == owner_id]

    async def get_by_type(self, search_type: str) -> List[object]:
        return [sc for sc in self._data.values() if getattr(sc, "search_type", "") == search_type]

    async def get_popular(self, limit: int = 10) -> List[object]:
        all_configs = list(self._data.values())
        all_configs.sort(key=lambda c: getattr(c, "use_count", 0), reverse=True)
        return all_configs[:limit]


class MemoryActivityRepository(IActivityRepository):
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

    async def get_by_user(self, user_id: UUID, limit: int = 50) -> List[object]:
        results = [a for a in self._data.values() if getattr(a, "user_id", None) == user_id]
        results.sort(key=lambda a: getattr(a, "created_at", ""), reverse=True)
        return results[:limit]

    async def get_by_project(self, project_id: UUID, limit: int = 50) -> List[object]:
        results = [a for a in self._data.values() if getattr(a, "project_id", None) == project_id]
        results.sort(key=lambda a: getattr(a, "created_at", ""), reverse=True)
        return results[:limit]

    async def get_recent(self, limit: int = 100) -> List[object]:
        all_activities = list(self._data.values())
        all_activities.sort(key=lambda a: getattr(a, "created_at", ""), reverse=True)
        return all_activities[:limit]


class MemoryUserRepository(IUserRepository):
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

    async def get_by_email(self, email: str) -> Optional[object]:
        return next((u for u in self._data.values() if getattr(u, "email", "") == email), None)

    async def get_by_username(self, username: str) -> Optional[object]:
        return next((u for u in self._data.values() if getattr(u, "username", "") == username), None)

    async def get_by_organization(self, org_id: UUID) -> List[object]:
        return [u for u in self._data.values() if getattr(u, "organization_id", None) == org_id]


class MemoryOrganizationRepository(IOrganizationRepository):
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

    async def get_by_slug(self, slug: str) -> Optional[object]:
        return next((o for o in self._data.values() if getattr(o, "slug", "") == slug), None)

    async def get_by_owner(self, owner_id: UUID) -> List[object]:
        return [o for o in self._data.values() if getattr(o, "owner_id", None) == owner_id]
