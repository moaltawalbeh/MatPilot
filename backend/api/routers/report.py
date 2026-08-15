"""Report API endpoints."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from backend.api.dependencies import get_container
from backend.domain.exceptions.domain_exceptions import (
    EntityNotFoundError,
    UnsupportedFormatException,
)

router = APIRouter(prefix="/report", tags=["Report"])

SUPPORTED_FORMATS = ("pdf", "docx", "txt", "pptx")

FORMAT_MIME = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain; charset=utf-8",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}


def _as_list(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    if hasattr(value, "tolist"):
        return list(value.tolist())
    return []


def _build_experiment_data(exp) -> dict:
    """Collect every piece of experiment data the report generator needs.

    The generator is defensive about keys, but this is where we normalize the
    domain entity into the payload shape the generator consumes, including the
    processed pattern stored as `experiment._processed_pattern` and the
    instrument metadata on `experiment.metadata`.
    """
    metadata = getattr(exp, "metadata", None)

    wavelength = getattr(exp, "wavelength_angstrom", None)
    if wavelength is None and metadata is not None:
        wavelength = getattr(metadata, "wavelength_angstrom", None)

    processed = getattr(exp, "_processed_pattern", None)
    if not isinstance(processed, dict):
        processed = {}

    return {
        "name": getattr(exp, "name", None) or "Untitled Experiment",
        "two_theta": _as_list(getattr(exp, "raw_two_theta", None)),
        "intensity": _as_list(getattr(exp, "raw_intensity", None)),
        "processed_pattern": processed,
        "detected_peaks": list(getattr(exp, "detected_peaks", []) or []),
        "candidate_phases": list(getattr(exp, "candidate_phases", []) or []),
        "rietveld_results": getattr(exp, "rietveld_results", None),
        "pipeline_stages": list(getattr(exp, "pipeline_stages", []) or []),
        "wavelength": wavelength or 1.5406,
        "metadata": {
            "instrument": getattr(metadata, "instrument", ""),
            "radiation_type": getattr(metadata, "radiation_type", ""),
            "wavelength_angstrom": getattr(metadata, "wavelength_angstrom", None),
            "temperature_k": getattr(metadata, "temperature_k", None),
            "scan_range_2theta": _as_list(getattr(metadata, "scan_range_2theta", None)),
            "step_size_2theta": getattr(metadata, "step_size_2theta", None),
            "scan_time_seconds": getattr(metadata, "scan_time_seconds", None),
            "notes": getattr(metadata, "notes", ""),
        } if metadata is not None else {},
    }


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
async def generate_pdf_report(
    experiment_id: str,
    format: str = Query("pdf", description="Output format: pdf, docx, txt, pptx"),
    container=Depends(get_container),
):
    """Generate a report for an experiment in the requested format."""
    from uuid import UUID

    fmt = (format or "pdf").lower()
    if fmt not in SUPPORTED_FORMATS:
        raise UnsupportedFormatException(
            f"Unsupported report format: {format}. Supported: {', '.join(SUPPORTED_FORMATS)}"
        )

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
                "name": getattr(project, "name", ""),
                "material": getattr(project, "material", ""),
                "created_at": getattr(project, "created_at", None),
                "status": getattr(project, "status", ""),
            }
            if project_data["created_at"] is not None:
                project_data["created_at"] = project_data["created_at"].isoformat()

    experiment_data = _build_experiment_data(exp)

    from backend.services.report_generator import FORMAT_MIME, ReportGenerator

    generator = ReportGenerator()
    if fmt == "pdf":
        content = generator.generate_report_bytes(project_data, experiment_data)
    elif fmt == "docx":
        content = generator.generate_docx_bytes(project_data, experiment_data)
    elif fmt == "txt":
        content = generator.generate_txt_bytes(project_data, experiment_data)
    elif fmt == "pptx":
        content = generator.generate_pptx_bytes(project_data, experiment_data)
    else:  # pragma: no cover - guarded above
        raise UnsupportedFormatException(f"Unsupported report format: {format}")

    safe_name = "".join(
        c if c.isalnum() or c in ("-", "_") else "_"
        for c in (getattr(exp, "name", None) or "report")
    ).strip("._ ") or "report"

    return Response(
        content=content,
        media_type=FORMAT_MIME[fmt],
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_report.{fmt}"'
        },
    )


@router.post("/project/{project_id}")
async def generate_project_report(
    project_id: str,
    format: str = Query("pdf", description="Output format: pdf, docx, txt, pptx"),
    container=Depends(get_container),
):
    """Generate an integrated publication-quality report for an entire Project."""
    from uuid import UUID

    fmt = (format or "pdf").lower()
    if fmt not in SUPPORTED_FORMATS:
        raise UnsupportedFormatException(
            f"Unsupported report format: {format}. Supported: {', '.join(SUPPORTED_FORMATS)}"
        )

    try:
        puid = UUID(project_id)
    except ValueError:
        raise EntityNotFoundError(f"Project {project_id} not found")

    project = await container.uow.projects.get_by_id(puid)
    if not project:
        raise EntityNotFoundError(f"Project {project_id} not found")

    # Fetch all experiments belonging to this project
    experiments = await container.uow.experiments.get_by_project_id(puid)
    
    project_data = {
        "name": getattr(project, "name", "Project Report"),
        "description": getattr(project, "description", ""),
        "material": getattr(project, "material", ""),
        "created_at": getattr(project, "created_at", None),
        "status": getattr(project, "status", ""),
        "experiment_count": len(experiments) if experiments else 0,
    }
    if project_data["created_at"] is not None:
        project_data["created_at"] = project_data["created_at"].isoformat()

    # Use the primary experiment or aggregate experiment payload
    primary_exp = experiments[0] if experiments else None
    if primary_exp:
        experiment_data = _build_experiment_data(primary_exp)
    else:
        experiment_data = {
            "name": project_data["name"],
            "two_theta": [],
            "intensity": [],
            "processed_pattern": {},
            "detected_peaks": [],
            "candidate_phases": [],
            "rietveld_results": None,
            "pipeline_stages": [],
            "wavelength": 1.5406,
            "metadata": {},
        }

    from backend.services.report_generator import FORMAT_MIME, ReportGenerator

    generator = ReportGenerator()
    if fmt == "pdf":
        content = generator.generate_report_bytes(project_data, experiment_data)
    elif fmt == "docx":
        content = generator.generate_docx_bytes(project_data, experiment_data)
    elif fmt == "txt":
        content = generator.generate_txt_bytes(project_data, experiment_data)
    elif fmt == "pptx":
        content = generator.generate_pptx_bytes(project_data, experiment_data)
    else:
        raise UnsupportedFormatException(f"Unsupported report format: {format}")

    safe_name = "".join(
        c if c.isalnum() or c in ("-", "_") else "_"
        for c in (getattr(project, "name", None) or "project_report")
    ).strip("._ ") or "project_report"

    return Response(
        content=content,
        media_type=FORMAT_MIME[fmt],
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_report.{fmt}"'
        },
    )

