
from fastapi import APIRouter, Depends
from backend.application.dtos.report_dto import ReportRequest
from backend.api.dependencies import get_container

router = APIRouter(prefix="/report", tags=["Report"])


@router.get("/{id}")
async def get_report(id: str, container = Depends(get_container)):
    """Get report by ID (placeholder)."""
    return {"report_id": id, "status": "not_implemented"}
