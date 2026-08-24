"""Global Search Router.

Provides cross-module search across samples, measurements, structures,
experiments, projects, and collections. Reads from the same stores the
individual routers use, so results always match what the UI displays.
"""

from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from backend.api.dependencies import get_container
from backend.api.routers.samples import _samples
from backend.api.routers.measurements import _measurements
from backend.api.routers.structures import _structures
from backend.api.routers.collections import _collections

router = APIRouter(prefix="/search", tags=["Search"])

# singular type -> plural store key
_TYPE_MAP = {
    "sample": "samples",
    "measurement": "measurements",
    "structure": "structures",
    "experiment": "experiments",
    "project": "projects",
    "collection": "collections",
}

_STORE_TYPE = {
    "samples": "sample",
    "measurements": "measurement",
    "structures": "structure",
    "experiments": "experiment",
    "projects": "project",
    "collections": "collection",
}


def _field(item, name, default=""):
    if isinstance(item, dict):
        value = item.get(name, default)
    else:
        value = getattr(item, name, default)
    return value if value is not None else default


def _normalize(item, etype: str) -> dict:
    tags = _field(item, "tags", [])
    if not isinstance(tags, (list, tuple)):
        tags = []
    created = _field(item, "created_at", None)
    if created is None:
        created = datetime.now(timezone.utc)
    if isinstance(created, datetime):
        created = created.isoformat()
    return {
        "id": str(_field(item, "id", "")),
        "type": etype,
        "name": _field(item, "name", ""),
        "formula": _field(item, "formula", ""),
        "description": _field(item, "description", ""),
        "material": _field(item, "material", ""),
        "tags": list(tags),
        "space_group": _field(item, "space_group", "") or "",
        "status": str(_field(item, "status", "")),
        "created_at": created,
    }


async def _load_items(container, key: str) -> List[dict]:
    etype = _STORE_TYPE[key]

    if key == "projects":
        try:
            return [_normalize(e, etype) for e in await container.uow.projects.get_all()]
        except Exception:
            return []
    if key == "experiments":
        try:
            return [_normalize(e, etype) for e in await container.uow.experiments.get_all()]
        except Exception:
            return []

    module_stores = {
        "samples": _samples,
        "measurements": _measurements,
        "structures": _structures,
        "collections": _collections,
    }
    store = module_stores.get(key, {})
    return [_normalize(v, etype) for v in store.values()]


def _match_item(item: dict, query: str) -> bool:
    q = query.lower()
    searchable = [
        item.get("name", ""),
        item.get("formula", ""),
        item.get("material", ""),
        item.get("description", ""),
        item.get("space_group", "") or "",
        " ".join(item.get("tags", [])),
    ]
    return any(q in field.lower() for field in searchable)


class SearchResponse(BaseModel):
    items: List[dict]
    total: int
    query: str
    page: int
    page_size: int


class SearchRecentItem(BaseModel):
    id: str
    type: str
    name: str
    description: str
    updated_at: str


@router.get("", response_model=SearchResponse)
async def global_search(
    q: str = Query("", description="Search query"),
    type: Optional[str] = Query(None, description="Filter by entity type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    container=Depends(get_container),
):
    keys: List[str] = list(_TYPE_MAP.values())
    if type and type.lower() in _TYPE_MAP:
        keys = [_TYPE_MAP[type.lower()]]

    all_items: List[dict] = []
    for key in keys:
        all_items.extend(await _load_items(container, key))

    if q.strip():
        matched = [i for i in all_items if _match_item(i, q)]
    else:
        matched = all_items

    total = len(matched)
    start = (page - 1) * page_size
    return SearchResponse(
        items=matched[start : start + page_size],
        total=total,
        query=q,
        page=page,
        page_size=page_size,
    )


@router.get("/recent", response_model=List[SearchRecentItem])
async def recent_items(container=Depends(get_container)):
    all_items: List[dict] = []
    for key in _TYPE_MAP.values():
        all_items.extend(await _load_items(container, key))

    all_items.sort(key=lambda i: i.get("created_at", ""), reverse=True)

    return [
        SearchRecentItem(
            id=item["id"],
            type=item["type"],
            name=item["name"],
            description=item.get("description", ""),
            updated_at=item.get("created_at", ""),
        )
        for item in all_items[:10]
    ]
