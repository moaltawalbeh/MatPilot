"""Activities API endpoints."""

from typing import Optional, List

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/activities", tags=["Activities"])

_activities: list = []


class ActivityResponse(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str
    entity_name: str
    details: str
    created_at: str


@router.get("", response_model=List[ActivityResponse])
async def list_activities(
    project_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    results = _activities
    if project_id:
        results = [a for a in results if a.get("project_id") == project_id]
    results = results[-limit:]
    return [ActivityResponse(**a) for a in reversed(results)]
