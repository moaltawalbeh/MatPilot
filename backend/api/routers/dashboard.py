"""Dashboard API endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStatsResponse(BaseModel):
    project_count: int
    experiment_count: int
    sample_count: int
    measurement_count: int
    structure_count: int
    collection_count: int
    pending_jobs: int
    completed_jobs: int
    recent_activities_count: int


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats():
    from backend.api.routers.samples import _samples
    from backend.api.routers.measurements import _measurements
    from backend.api.routers.structures import _structures
    from backend.api.routers.collections import _collections
    from backend.api.routers.activities import _activities

    return DashboardStatsResponse(
        project_count=0,
        experiment_count=0,
        sample_count=len(_samples),
        measurement_count=len(_measurements),
        structure_count=len(_structures),
        collection_count=len(_collections),
        pending_jobs=0,
        completed_jobs=0,
        recent_activities_count=len(_activities),
    )
