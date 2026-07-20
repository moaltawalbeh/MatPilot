"""Search Configs API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/search-configs", tags=["Search Configs"])

_search_configs: dict = {}


class SearchConfigCreateRequest(BaseModel):
    name: str
    description: str = ""
    parameters: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


class SearchConfigResponse(BaseModel):
    id: str
    name: str
    description: str
    parameters: Dict[str, Any]
    tags: List[str]
    created_at: str
    updated_at: str


@router.get("", response_model=List[SearchConfigResponse])
async def list_search_configs():
    return [SearchConfigResponse(**c) for c in _search_configs.values()]


@router.get("/{config_id}", response_model=SearchConfigResponse)
async def get_search_config(config_id: str):
    if config_id not in _search_configs:
        raise HTTPException(status_code=404, detail="Search config not found")
    return SearchConfigResponse(**_search_configs[config_id])


@router.post("", response_model=SearchConfigResponse, status_code=201)
async def create_search_config(request: SearchConfigCreateRequest):
    now = datetime.now(timezone.utc).isoformat()
    config_id = str(uuid.uuid4())
    config = {
        "id": config_id,
        "name": request.name,
        "description": request.description,
        "parameters": request.parameters or {},
        "tags": request.tags or [],
        "created_at": now,
        "updated_at": now,
    }
    _search_configs[config_id] = config
    return SearchConfigResponse(**config)


@router.delete("/{config_id}")
async def delete_search_config(config_id: str):
    if config_id not in _search_configs:
        raise HTTPException(status_code=404, detail="Search config not found")
    del _search_configs[config_id]
    return {"success": True, "message": f"Search config {config_id} deleted"}
