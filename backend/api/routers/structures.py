"""Structures API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/structures", tags=["Structures"])

_structures: dict = {}


class StructureCreateRequest(BaseModel):
    name: str
    description: str = ""
    formula: str = ""
    source: str = ""
    space_group: Optional[str] = None
    lattice_params: Optional[dict] = None
    atoms: Optional[List[dict]] = None
    cif_text: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None


class CIFImportRequest(BaseModel):
    cif_text: str
    name: str = ""
    source: str = "CIF Import"


class StructureUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    formula: Optional[str] = None
    source: Optional[str] = None
    space_group: Optional[str] = None
    lattice_params: Optional[dict] = None
    atoms: Optional[List[dict]] = None
    cif_text: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None


class StructureResponse(BaseModel):
    id: str
    name: str
    description: str
    formula: str
    source: str
    space_group: Optional[str]
    lattice_params: Optional[dict]
    atoms: Optional[List[dict]]
    cif_text: Optional[str]
    tags: List[str]
    metadata: dict
    created_at: str
    updated_at: str


@router.get("", response_model=List[StructureResponse])
async def list_structures(
    source: Optional[str] = Query(None),
    formula: Optional[str] = Query(None),
    space_group: Optional[str] = Query(None),
):
    results = list(_structures.values())
    if source:
        results = [s for s in results if s["source"] == source]
    if formula:
        q = formula.lower()
        results = [s for s in results if q in s["formula"].lower()]
    if space_group:
        results = [s for s in results if s.get("space_group") == space_group]
    return [StructureResponse(**s) for s in results]


@router.get("/{structure_id}", response_model=StructureResponse)
async def get_structure(structure_id: str):
    if structure_id not in _structures:
        raise HTTPException(status_code=404, detail="Structure not found")
    return StructureResponse(**_structures[structure_id])


@router.post("", response_model=StructureResponse, status_code=201)
async def create_structure(request: StructureCreateRequest):
    now = datetime.now(timezone.utc).isoformat()
    structure_id = str(uuid.uuid4())
    structure = {
        "id": structure_id,
        "name": request.name,
        "description": request.description,
        "formula": request.formula,
        "source": request.source,
        "space_group": request.space_group,
        "lattice_params": request.lattice_params,
        "atoms": request.atoms,
        "cif_text": request.cif_text,
        "tags": request.tags or [],
        "metadata": request.metadata or {},
        "created_at": now,
        "updated_at": now,
    }
    _structures[structure_id] = structure
    return StructureResponse(**structure)


@router.post("/import", response_model=StructureResponse, status_code=201)
async def import_structure_from_cif(request: CIFImportRequest):
    now = datetime.now(timezone.utc).isoformat()
    structure_id = str(uuid.uuid4())
    structure = {
        "id": structure_id,
        "name": request.name or "Imported Structure",
        "description": "",
        "formula": "",
        "source": request.source,
        "space_group": None,
        "lattice_params": None,
        "atoms": None,
        "cif_text": request.cif_text,
        "tags": [],
        "metadata": {},
        "created_at": now,
        "updated_at": now,
    }
    _structures[structure_id] = structure
    return StructureResponse(**structure)


@router.put("/{structure_id}", response_model=StructureResponse)
async def update_structure(structure_id: str, request: StructureUpdateRequest):
    if structure_id not in _structures:
        raise HTTPException(status_code=404, detail="Structure not found")
    structure = _structures[structure_id]
    updates = request.model_dump(exclude_unset=True)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    structure.update(updates)
    return StructureResponse(**structure)


@router.delete("/{structure_id}")
async def delete_structure(structure_id: str):
    if structure_id not in _structures:
        raise HTTPException(status_code=404, detail="Structure not found")
    del _structures[structure_id]
    return {"success": True, "message": f"Structure {structure_id} deleted"}
