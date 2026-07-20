"""Measurements API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/measurements", tags=["Measurements"])

_measurements: dict = {}


class MeasurementCreateRequest(BaseModel):
    sample_id: str
    name: str = ""
    description: str = ""
    type: str = ""
    status: str = "pending"
    values: Optional[Dict[str, Any]] = None
    units: Optional[Dict[str, str]] = None
    metadata: Optional[dict] = None


class MeasurementUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    values: Optional[Dict[str, Any]] = None
    units: Optional[Dict[str, str]] = None
    metadata: Optional[dict] = None


class MeasurementResponse(BaseModel):
    id: str
    sample_id: str
    name: str
    description: str
    type: str
    status: str
    values: Dict[str, Any]
    units: Dict[str, str]
    metadata: dict
    created_at: str
    updated_at: str


@router.get("", response_model=List[MeasurementResponse])
async def list_measurements(
    sample_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    results = list(_measurements.values())
    if sample_id:
        results = [m for m in results if m["sample_id"] == sample_id]
    if status:
        results = [m for m in results if m["status"] == status]
    return [MeasurementResponse(**m) for m in results]


@router.get("/{measurement_id}", response_model=MeasurementResponse)
async def get_measurement(measurement_id: str):
    if measurement_id not in _measurements:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return MeasurementResponse(**_measurements[measurement_id])


@router.post("", response_model=MeasurementResponse, status_code=201)
async def create_measurement(request: MeasurementCreateRequest):
    now = datetime.now(timezone.utc).isoformat()
    measurement_id = str(uuid.uuid4())
    measurement = {
        "id": measurement_id,
        "sample_id": request.sample_id,
        "name": request.name,
        "description": request.description,
        "type": request.type,
        "status": request.status,
        "values": request.values or {},
        "units": request.units or {},
        "metadata": request.metadata or {},
        "created_at": now,
        "updated_at": now,
    }
    _measurements[measurement_id] = measurement
    return MeasurementResponse(**measurement)


@router.put("/{measurement_id}", response_model=MeasurementResponse)
async def update_measurement(measurement_id: str, request: MeasurementUpdateRequest):
    if measurement_id not in _measurements:
        raise HTTPException(status_code=404, detail="Measurement not found")
    measurement = _measurements[measurement_id]
    updates = request.model_dump(exclude_unset=True)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    measurement.update(updates)
    return MeasurementResponse(**measurement)


@router.delete("/{measurement_id}")
async def delete_measurement(measurement_id: str):
    if measurement_id not in _measurements:
        raise HTTPException(status_code=404, detail="Measurement not found")
    del _measurements[measurement_id]
    return {"success": True, "message": f"Measurement {measurement_id} deleted"}
