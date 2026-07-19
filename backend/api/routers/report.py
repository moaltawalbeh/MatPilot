"""Report API endpoints."""

from fastapi import APIRouter, Depends
from fastapi.responses import Response

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


@router.post("/generate/{experiment_id}")
async def generate_pdf_report(experiment_id: str, container=Depends(get_container)):
    """Generate a PDF report for an experiment."""
    from uuid import UUID
    try:
        uid = UUID(experiment_id)
    except ValueError:
        raise EntityNotFoundError(f"Experiment {experiment_id} not found")

    exp = await container.uow.experiments.get_by_id(uid)
    if not exp:
        raise EntityNotFoundError(f"Experiment {experiment_id} not found")

    project_data = {}
    if exp.project_id:
        project = await container.uow.projects.get_by_id(exp.project_id)
        if project:
            project_data = {
                "name": project.name,
                "material": getattr(project, "material", ""),
                "created_at": project.created_at.isoformat() if hasattr(project, "created_at") else "",
                "status": getattr(project, "status", ""),
            }

    experiment_data = {
        "name": exp.name or "Untitled Experiment",
        "two_theta": list(getattr(exp, "raw_two_theta", []) or []),
        "intensity": list(getattr(exp, "raw_intensity", []) or []),
        "processed_two_theta": [],
        "processed_intensity": [],
        "detected_peaks": list(getattr(exp, "detected_peaks", []) or []),
        "candidate_phases": list(getattr(exp, "candidate_phases", []) or []),
        "rietveld_results": getattr(exp, "rietveld_results", None),
        "pipeline_stages": list(getattr(exp, "pipeline_stages", []) or []),
        "wavelength": getattr(exp, "wavelength_angstrom", 1.5406) or 1.5406,
    }

    from backend.services.report_generator import ReportGenerator
    generator = ReportGenerator()
    pdf_bytes = generator.generate_report_bytes(project_data, experiment_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{exp.name or "report"}_report.pdf"'
        },
    )
