"""Organizations API endpoints."""

from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/organizations", tags=["Organizations"])

_organizations: dict = {}


class OrganizationResponse(BaseModel):
    id: str
    name: str
    description: str
    slug: str
    plan: str
    created_at: str
    updated_at: str


class OrganizationCreateRequest(BaseModel):
    name: str
    description: str = ""
    slug: str = ""
    plan: str = "free"


class OrganizationUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    plan: Optional[str] = None


@router.get("", response_model=List[OrganizationResponse])
async def list_organizations():
    return [OrganizationResponse(**o) for o in _organizations.values()]


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str):
    if org_id not in _organizations:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationResponse(**_organizations[org_id])


@router.post("", response_model=OrganizationResponse, status_code=201)
async def create_organization(request: OrganizationCreateRequest):
    import uuid, datetime
    org_id = str(uuid.uuid4())[:8]
    now = datetime.datetime.utcnow().isoformat()
    org = {
        "id": org_id,
        "name": request.name,
        "description": request.description,
        "slug": request.slug or request.name.lower().replace(" ", "-"),
        "plan": request.plan,
        "created_at": now,
        "updated_at": now,
    }
    _organizations[org_id] = org
    return OrganizationResponse(**org)


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(org_id: str, request: OrganizationUpdateRequest):
    if org_id not in _organizations:
        raise HTTPException(status_code=404, detail="Organization not found")
    import datetime
    org = _organizations[org_id]
    updates = request.model_dump(exclude_unset=True)
    org.update(updates)
    org["updated_at"] = datetime.datetime.utcnow().isoformat()
    return OrganizationResponse(**org)


@router.delete("/{org_id}", status_code=204)
async def delete_organization(org_id: str):
    if org_id not in _organizations:
        raise HTTPException(status_code=404, detail="Organization not found")
    del _organizations[org_id]
