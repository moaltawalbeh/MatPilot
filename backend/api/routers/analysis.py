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
    """Submit an analysis job."""
    from backend.application.dtos.analysis_dto import AnalysisRequest
    dto = AnalysisRequest(
        experiment_id=request.experiment_id,
        analysis_type=request.analysis_type,
        parameters=request.parameters or {},
        provider_preferences=request.provider_preferences or [],
        user_id=request.user_id,
    )
    use_case = container.submit_analysis_use_case
    result = await use_case.execute(dto)
    return result


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, container=Depends(get_container)):
    """Get analysis result by job ID."""
    use_case = container.get_analysis_result_use_case
    result = await use_case.execute(analysis_id)
    return result
