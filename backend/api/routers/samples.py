"""Samples API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/samples", tags=["Samples"])

_samples: dict = {}


class SampleCreateRequest(BaseModel):
    name: str
    description: str = ""
    material: str = ""
    project_id: Optional[str] = None
    status: str = "pending"
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None


class SampleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    material: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None


class SampleResponse(BaseModel):
    id: str
    name: str
    description: str
    material: str
    project_id: Optional[str]
    status: str
    tags: List[str]
    metadata: dict
    created_at: str
    updated_at: str


@router.get("", response_model=List[SampleResponse])
async def list_samples(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    results = list(_samples.values())
    if status:
        results = [s for s in results if s["status"] == status]
    if search:
        q = search.lower()
        results = [s for s in results if q in s["name"].lower() or q in s["description"].lower() or q in s["material"].lower()]
    return [SampleResponse(**s) for s in results]


@router.get("/{sample_id}", response_model=SampleResponse)
async def get_sample(sample_id: str):
    if sample_id not in _samples:
        raise HTTPException(status_code=404, detail="Sample not found")
    return SampleResponse(**_samples[sample_id])


@router.post("", response_model=SampleResponse, status_code=201)
async def create_sample(request: SampleCreateRequest):
    now = datetime.now(timezone.utc).isoformat()
    sample_id = str(uuid.uuid4())
    sample = {
        "id": sample_id,
        "name": request.name,
        "description": request.description,
        "material": request.material,
        "project_id": request.project_id,
        "status": request.status,
        "tags": request.tags or [],
        "metadata": request.metadata or {},
        "created_at": now,
        "updated_at": now,
    }
    _samples[sample_id] = sample
    return SampleResponse(**sample)


@router.put("/{sample_id}", response_model=SampleResponse)
async def update_sample(sample_id: str, request: SampleUpdateRequest):
    if sample_id not in _samples:
        raise HTTPException(status_code=404, detail="Sample not found")
    sample = _samples[sample_id]
    updates = request.model_dump(exclude_unset=True)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    sample.update(updates)
    return SampleResponse(**sample)


@router.delete("/{sample_id}")
async def delete_sample(sample_id: str):
    if sample_id not in _samples:
        raise HTTPException(status_code=404, detail="Sample not found")
    del _samples[sample_id]
    return {"success": True, "message": f"Sample {sample_id} deleted"}
