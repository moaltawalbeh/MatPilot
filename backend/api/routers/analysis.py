"""Analysis API endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List

from backend.api.dependencies import get_container

router = APIRouter(prefix="/analysis", tags=["Analysis"])


class AnalysisSubmitRequest(BaseModel):
    experiment_id: str
    analysis_type: str = "peak_detection"
    parameters: Optional[Dict] = None
    provider_preferences: Optional[List[str]] = None
    user_id: Optional[str] = None


@router.post("")
async def submit_analysis(request: AnalysisSubmitRequest, container=Depends(get_container)):
    """Submit an analysis job for an existing experiment.

    Jobs are queued through the analysis orchestrator so they appear in
    ``/jobs`` and are executed by the pipeline, matching the upload flow.
    """
    from uuid import UUID

    from backend.domain.exceptions.domain_exceptions import EntityNotFoundError

    try:
        uid = UUID(request.experiment_id)
    except ValueError:
        raise EntityNotFoundError(f"Experiment {request.experiment_id} not found")

    exp = await container.uow.experiments.get_by_id(uid)
    if exp is None:
        raise EntityNotFoundError(f"Experiment {request.experiment_id} not found")

    job = container.analysis_orchestrator.submit_experiment_analysis(
        experiment_id=str(exp.id),
        file_id=getattr(exp, "primary_file_id", None),
        project_id=str(exp.project_id) if exp.project_id else None,
        analysis_type=request.analysis_type,
        parameters=request.parameters or {},
        provider_preferences=request.provider_preferences or [],
    )

    return {
        "job_id": job.get("job_id"),
        "status": job.get("status"),
        "analysis_type": request.analysis_type,
        "experiment_id": request.experiment_id,
        "created_at": job.get("created_at"),
        "message": "Analysis job submitted successfully",
    }


@router.get("/{job_id}")
async def get_analysis(job_id: str, container=Depends(get_container)):
    """Get analysis result by job ID."""
    from backend.domain.exceptions.domain_exceptions import EntityNotFoundError

    status = container.analysis_orchestrator.get_job_status(job_id)
    if not status:
        raise EntityNotFoundError(f"Analysis job {job_id} not found")

    result = container.analysis_orchestrator.get_result(job_id)

    return {
        "job_id": job_id,
        "status": status.get("status"),
        "progress_percent": status.get("progress_percent"),
        "current_step": status.get("current_step"),
        "result": (result or {}).get("results"),
    }
