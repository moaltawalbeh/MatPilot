"""Job management API endpoints."""

from typing import Optional, List
from fastapi import APIRouter, Query, Depends
from pydantic import BaseModel

from backend.api.dependencies import get_container
from backend.domain.exceptions.domain_exceptions import EntityNotFoundError

router = APIRouter(prefix="/jobs", tags=["Jobs"])


class JobResponse(BaseModel):
    job_id: str
    experiment_id: Optional[str]
    job_type: str
    status: str
    progress: float
    current_step: str
    created_at: str
    started_at: Optional[str]
    finished_at: Optional[str]
    result_id: Optional[str]
    error: Optional[str]


class JobListResponse(BaseModel):
    jobs: List[dict]
    total: int
    limit: int
    offset: int


@router.get("", response_model=JobListResponse)
async def list_jobs(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    container=Depends(get_container),
):
    """List all analysis jobs with optional filtering."""
    jobs = container.analysis_orchestrator.list_jobs(status=status, limit=limit, offset=offset)
    return JobListResponse(
        jobs=jobs,
        total=len(jobs),
        limit=limit,
        offset=offset,
    )


@router.get("/{job_id}")
async def get_job(job_id: str, container=Depends(get_container)):
    """Get a single job by ID with full status and progress."""
    job = await container.analysis_orchestrator.get_job_status(job_id)
    if not job:
        raise EntityNotFoundError(f"Job {job_id} not found")
    return job


@router.post("/{job_id}/execute")
async def execute_job(job_id: str, container=Depends(get_container)):
    """Execute the analysis pipeline for a job."""
    result = await container.analysis_orchestrator.execute_analysis(job_id)
    return result


@router.delete("/{job_id}")
async def delete_job(job_id: str, container=Depends(get_container)):
    """Delete a job record."""
    deleted = container.job_manager.delete_job(job_id)
    if not deleted:
        raise EntityNotFoundError(f"Job {job_id} not found")
    return {"success": True, "message": f"Job {job_id} deleted"}


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, container=Depends(get_container)):
    """Cancel a running or queued job."""
    result = await container.analysis_orchestrator.cancel_job(job_id)
    if not result["success"]:
        from backend.domain.exceptions.domain_exceptions import AnalysisException
        raise AnalysisException(result.get("error", "Failed to cancel job"))
    return result
