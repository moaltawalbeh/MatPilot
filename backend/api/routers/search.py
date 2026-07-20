"""Global Search Router.

Provides cross-module search across samples, measurements, structures,
experiments, projects, and collections.
"""

import re
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/search", tags=["Search"])

_search_data = {
    "samples": [],
    "measurements": [],
    "structures": [],
    "experiments": [],
    "projects": [],
    "collections": [],
}

_seed_done = False


def _seed_demo_data():
    global _seed_done
    if _seed_done:
        return
    _seed_done = True

    now = datetime.now(timezone.utc).isoformat()

    _search_data["samples"] = [
        {"id": "s1", "type": "sample", "name": "BaTiO3 Ceramic", "formula": "BaTiO3", "description": "Barium titanate ceramic pellet for piezoelectric testing", "tags": ["ceramic", "piezoelectric"], "status": "Active", "created_at": now},
        {"id": "s2", "type": "sample", "name": "Si wafer", "formula": "Si", "description": "Single crystal silicon wafer reference standard", "tags": ["reference", "silicon"], "status": "Active", "created_at": now},
        {"id": "s3", "type": "sample", "name": "Fe2O3 Nanopowder", "formula": "Fe2O3", "description": "Hematite nanopowder for magnetic characterization", "tags": ["nanopowder", "magnetic"], "status": "Active", "created_at": now},
    ]

    _search_data["measurements"] = [
        {"id": "m1", "type": "measurement", "name": "XRD Scan — BaTiO3", "formula": "", "description": "Room temperature XRD pattern collected at Cu K-alpha radiation", "tags": ["xrd", "room-temp"], "status": "Completed", "created_at": now},
        {"id": "m2", "type": "measurement", "name": "XRD Scan — Fe2O3", "formula": "", "description": "High-temperature XRD scan of hematite nanopowder", "tags": ["xrd", "high-temp"], "status": "Completed", "created_at": now},
    ]

    _search_data["structures"] = [
        {"id": "st1", "type": "structure", "name": "Quartz (SiO2)", "formula": "SiO2", "description": "Alpha-quartz structure from COD database", "tags": ["quartz", "reference"], "space_group": "P3121", "status": "Active", "created_at": now},
        {"id": "st2", "type": "structure", "name": "Corundum (Al2O3)", "formula": "Al2O3", "description": "Alpha-alumina corundum structure", "tags": ["corundum", "reference"], "space_group": "R-3c", "status": "Active", "created_at": now},
        {"id": "st3", "type": "structure", "name": "Perovskite (CaTiO3)", "formula": "CaTiO3", "description": "Cubic perovskite crystal structure", "tags": ["perovskite"], "space_group": "Pm-3m", "status": "Active", "created_at": now},
    ]

    _search_data["experiments"] = [
        {"id": "e1", "type": "experiment", "name": "Phase ID — BaTiO3 Batch", "formula": "", "description": "Automated phase identification for BaTiO3 ceramic batch", "tags": ["phase-id", "batch"], "status": "Analyzed", "created_at": now},
    ]

    _search_data["projects"] = [
        {"id": "p1", "type": "project", "name": "Piezoelectric Research", "formula": "", "description": "Research project studying piezoelectric ceramics for sensor applications", "tags": ["piezoelectric", "sensors"], "status": "Active", "created_at": now},
        {"id": "p2", "type": "project", "name": "Battery Materials", "formula": "", "description": "Characterization of lithium-ion battery cathode materials", "tags": ["battery", "energy"], "status": "Active", "created_at": now},
    ]

    _search_data["collections"] = [
        {"id": "c1", "type": "collection", "name": "Reference Standards", "formula": "", "description": "Collection of certified reference material samples for calibration", "tags": ["reference", "calibration"], "status": "Active", "created_at": now},
        {"id": "c2", "type": "collection", "name": "Perovskite Library", "formula": "", "description": "Curated set of perovskite-structure samples", "tags": ["perovskite", "library"], "status": "Active", "created_at": now},
    ]


def _match_item(item: dict, query: str) -> bool:
    q = query.lower()
    searchable = [
        item.get("name", ""),
        item.get("formula", ""),
        item.get("description", ""),
        item.get("space_group", "") or "",
        " ".join(item.get("tags", [])),
    ]
    return any(q in field.lower() for field in searchable)


_TYPE_MAP = {
    "sample": "samples",
    "measurement": "measurements",
    "structure": "structures",
    "experiment": "experiments",
    "project": "projects",
    "collection": "collections",
}


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
):
    _seed_demo_data()

    stores_to_search = _search_data
    if type and type.lower() in _TYPE_MAP:
        stores_to_search = {type.lower(): _search_data.get(type.lower(), [])}

    if not q.strip():
        all_items = []
        for store in stores_to_search.values():
            all_items.extend(store)
        total = len(all_items)
        start = (page - 1) * page_size
        return SearchResponse(
            items=all_items[start : start + page_size],
            total=total,
            query=q,
            page=page,
            page_size=page_size,
        )

    matched: List[dict] = []
    for store in stores_to_search.values():
        for item in store:
            if _match_item(item, q):
                matched.append(item)

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
async def recent_items():
    _seed_demo_data()

    recent = []
    for store in _search_data.values():
        for item in store[-3:]:
            recent.append(SearchRecentItem(
                id=item["id"],
                type=item["type"],
                name=item["name"],
                description=item.get("description", ""),
                updated_at=item.get("created_at", ""),
            ))
    return recent[:10]
