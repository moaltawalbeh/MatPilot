
from fastapi import APIRouter, Depends
from backend.application.dtos.analysis_dto import AnalysisRequest
from backend.api.dependencies import get_container

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("")
async def submit_analysis(
    request: AnalysisRequest,
    container = Depends(get_container)
):
    """Submit an analysis job (placeholder)."""
    use_case = container.submit_analysis_use_case
    result = await use_case.execute(request)
    return result


@router.get("/{id}")
async def get_analysis(id: str, container = Depends(get_container)):
    """Get analysis result by job ID (placeholder)."""
    use_case = container.get_analysis_result_use_case
    result = await use_case.execute(id)
    return result
