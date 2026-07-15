"""Report API endpoints."""

from fastapi import APIRouter, Depends

from backend.api.dependencies import get_container
from backend.domain.exceptions.domain_exceptions import EntityNotFoundError

router = APIRouter(prefix="/report", tags=["Report"])


@router.get("/{report_id}")
async def get_report(report_id: str, container=Depends(get_container)):
    """Get report by ID."""
    from uuid import UUID
    try:
        uid = UUID(report_id)
    except ValueError:
        raise EntityNotFoundError(f"Report {report_id} not found")

    report = await container.uow.reports.get_by_id(uid)
    if not report:
        raise EntityNotFoundError(f"Report {report_id} not found")

    return {
        "report_id": str(report.id),
        "title": report.title,
        "description": report.description,
        "format": report.format.name,
        "generated_at": report.generated_at.isoformat(),
        "experiment_ids": [str(eid) for eid in report.experiment_ids],
        "result_ids": [str(rid) for rid in report.result_ids],
    }
