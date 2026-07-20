"""Teams API endpoints."""

from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/teams", tags=["Teams"])

_teams: dict = {}


class TeamResponse(BaseModel):
    id: str
    name: str
    description: str
    organization_id: str
    members: List[str]
    created_at: str
    updated_at: str


class TeamCreateRequest(BaseModel):
    name: str
    description: str = ""
    organization_id: str = ""


class TeamUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    organization_id: Optional[str] = None


@router.get("", response_model=List[TeamResponse])
async def list_teams():
    return [TeamResponse(**t) for t in _teams.values()]


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str):
    if team_id not in _teams:
        raise HTTPException(status_code=404, detail="Team not found")
    return TeamResponse(**_teams[team_id])


@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(request: TeamCreateRequest):
    import uuid, datetime
    team_id = str(uuid.uuid4())[:8]
    now = datetime.datetime.utcnow().isoformat()
    team = {
        "id": team_id,
        "name": request.name,
        "description": request.description,
        "organization_id": request.organization_id,
        "members": [],
        "created_at": now,
        "updated_at": now,
    }
    _teams[team_id] = team
    return TeamResponse(**team)


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(team_id: str, request: TeamUpdateRequest):
    if team_id not in _teams:
        raise HTTPException(status_code=404, detail="Team not found")
    import datetime
    team = _teams[team_id]
    updates = request.model_dump(exclude_unset=True)
    team.update(updates)
    team["updated_at"] = datetime.datetime.utcnow().isoformat()
    return TeamResponse(**team)


@router.delete("/{team_id}", status_code=204)
async def delete_team(team_id: str):
    if team_id not in _teams:
        raise HTTPException(status_code=404, detail="Team not found")
    del _teams[team_id]


@router.post("/{team_id}/members/{user_id}", response_model=TeamResponse)
async def add_member(team_id: str, user_id: str):
    if team_id not in _teams:
        raise HTTPException(status_code=404, detail="Team not found")
    import datetime
    team = _teams[team_id]
    if user_id not in team["members"]:
        team["members"].append(user_id)
    team["updated_at"] = datetime.datetime.utcnow().isoformat()
    return TeamResponse(**team)


@router.delete("/{team_id}/members/{user_id}", response_model=TeamResponse)
async def remove_member(team_id: str, user_id: str):
    if team_id not in _teams:
        raise HTTPException(status_code=404, detail="Team not found")
    import datetime
    team = _teams[team_id]
    if user_id in team["members"]:
        team["members"].remove(user_id)
    team["updated_at"] = datetime.datetime.utcnow().isoformat()
    return TeamResponse(**team)
