"""Collections API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/collections", tags=["Collections"])

_collections: dict = {}


class CollectionCreateRequest(BaseModel):
    name: str
    description: str = ""
    tags: Optional[List[str]] = None


class CollectionUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class CollectionResponse(BaseModel):
    id: str
    name: str
    description: str
    tags: List[str]
    sample_ids: List[str]
    created_at: str
    updated_at: str


@router.get("", response_model=List[CollectionResponse])
async def list_collections():
    return [CollectionResponse(**c) for c in _collections.values()]


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(collection_id: str):
    if collection_id not in _collections:
        raise HTTPException(status_code=404, detail="Collection not found")
    return CollectionResponse(**_collections[collection_id])


@router.post("", response_model=CollectionResponse, status_code=201)
async def create_collection(request: CollectionCreateRequest):
    now = datetime.now(timezone.utc).isoformat()
    collection_id = str(uuid.uuid4())
    collection = {
        "id": collection_id,
        "name": request.name,
        "description": request.description,
        "tags": request.tags or [],
        "sample_ids": [],
        "created_at": now,
        "updated_at": now,
    }
    _collections[collection_id] = collection
    return CollectionResponse(**collection)


@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(collection_id: str, request: CollectionUpdateRequest):
    if collection_id not in _collections:
        raise HTTPException(status_code=404, detail="Collection not found")
    collection = _collections[collection_id]
    updates = request.model_dump(exclude_unset=True)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    collection.update(updates)
    return CollectionResponse(**collection)


@router.delete("/{collection_id}")
async def delete_collection(collection_id: str):
    if collection_id not in _collections:
        raise HTTPException(status_code=404, detail="Collection not found")
    del _collections[collection_id]
    return {"success": True, "message": f"Collection {collection_id} deleted"}


@router.post("/{collection_id}/samples/{sample_id}", response_model=CollectionResponse)
async def add_sample_to_collection(collection_id: str, sample_id: str):
    if collection_id not in _collections:
        raise HTTPException(status_code=404, detail="Collection not found")
    collection = _collections[collection_id]
    if sample_id not in collection["sample_ids"]:
        collection["sample_ids"].append(sample_id)
        collection["updated_at"] = datetime.now(timezone.utc).isoformat()
    return CollectionResponse(**collection)


@router.delete("/{collection_id}/samples/{sample_id}", response_model=CollectionResponse)
async def remove_sample_from_collection(collection_id: str, sample_id: str):
    if collection_id not in _collections:
        raise HTTPException(status_code=404, detail="Collection not found")
    collection = _collections[collection_id]
    if sample_id in collection["sample_ids"]:
        collection["sample_ids"].remove(sample_id)
        collection["updated_at"] = datetime.now(timezone.utc).isoformat()
    return CollectionResponse(**collection)
