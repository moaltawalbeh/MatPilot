
"""Job management API endpoints."""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from backend.api.dependencies import get_container
from fastapi import Depends

router = APIRouter(prefix="/jobs", tags=["Jobs"])


class JobCreateRequest(BaseModel):
    experiment_id: Optional[str] = None
    job_type: str = "analysis"
    parameters: Optional[dict] = None
    provider_preferences: Optional[list] = None


@router.get("")
async def list_jobs(
    status: Optional[str] = Query(None, description="Filter by status: queued, running, completed, failed, cancelled"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    container = Depends(get_container)
):
    """List all analysis jobs with optional filtering."""
    jobs = container.analysis_orchestrator.list_jobs(status=status, limit=limit, offset=offset)
    return {
        "jobs": jobs,
        "total": len(jobs),
        "limit": limit,
        "offset": offset
    }


@router.get("/{job_id}")
async def get_job(job_id: str, container = Depends(get_container)):
    """Get a single job by ID with full status and progress."""
    job = await container.analysis_orchestrator.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


@router.post("/{job_id}/execute")
async def execute_job(job_id: str, container = Depends(get_container)):
    """Execute the analysis pipeline for a job."""
    result = await container.analysis_orchestrator.execute_analysis(job_id)
    return result


@router.delete("/{job_id}")
async def delete_job(job_id: str, container = Depends(get_container)):
    """Delete a job record."""
    deleted = container.job_manager.delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return {"success": True, "message": f"Job {job_id} deleted"}


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, container = Depends(get_container)):
    """Cancel a running or queued job."""
    result = await container.analysis_orchestrator.cancel_job(job_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
