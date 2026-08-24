"""Instrument workspace API endpoints.

Each characterization technique (XRD, FTIR, Raman, UV-Vis) is an independent
scientific workspace inside a project. Experiments are scoped to a technique
(``experiment.technique``) and analyzed by the matching engine in
``backend.services.instrument_analysis``; FTIR / Raman / UV-Vis also get live
library search and spectral matching through the spectral reference service.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.api.dependencies import get_container
from backend.services.workspace_summary import experiment_summary

logger = logging.getLogger("instruments_router")

router = APIRouter(
    prefix="/projects/{project_id}/instruments",
    tags=["Instruments"],
)

TECHNIQUES: Dict[str, str] = {
    "xrd": "X-ray Diffraction",
    "ftir": "FTIR",
    "raman": "Raman",
    "uvvis": "UV-Vis",
}

MAX_RESPONSE_POINTS = 10000


# ── Schemas ───────────────────────────────────────────────────────────

class InstrumentSummary(BaseModel):
    technique: str
    display_name: str
    experiment_count: int
    analyzed_count: int
    data_count: int


class ExperimentCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    material: str = ""
    x: Optional[List[float]] = None
    y: Optional[List[float]] = None
    parameters: Optional[Dict[str, Any]] = None
    run_analysis: bool = True


class ExperimentListItem(BaseModel):
    id: str
    project_id: str
    technique: str
    name: str
    description: str
    material: str
    status: str
    data_points: int
    x_range: Optional[List[float]]
    has_results: bool
    summary: Dict[str, Any]
    created_at: str
    updated_at: str


class ExperimentDetail(ExperimentListItem):
    x: Optional[List[float]] = None
    y: Optional[List[float]] = None
    analysis_results: Optional[Dict[str, Any]] = None
    detected_peaks: List[Dict[str, Any]] = []
    history: List[Dict[str, Any]] = []


class ExperimentDataRequest(BaseModel):
    x: List[float]
    y: List[float]


class AnalyzeRequest(BaseModel):
    parameters: Optional[Dict[str, Any]] = None
    x: Optional[List[float]] = None
    y: Optional[List[float]] = None


class AnalyzeResponse(BaseModel):
    experiment_id: str
    technique: str
    success: bool
    message: str
    results: Optional[Dict[str, Any]] = None


class InterpretRequest(BaseModel):
    question: Optional[str] = None


class InterpretResponse(BaseModel):
    experiment_id: str
    technique: str
    interpretation: str
    model: str


class AiSummaryResponse(BaseModel):
    project_id: str
    ai_summary: str
    model: str


class ReferenceSearchResponse(BaseModel):
    query: str
    technique: str
    results: List[Dict[str, Any]]


class ReferenceMatchRequest(BaseModel):
    experiment_id: Optional[str] = None
    x: Optional[List[float]] = None
    y: Optional[List[float]] = None
    limit: int = 10


class ReferenceMatchResponse(BaseModel):
    technique: str
    matches: List[Dict[str, Any]]


class ProvidersResponse(BaseModel):
    technique: str
    providers: List[Dict[str, Any]]


class WorkspaceReportResponse(BaseModel):
    project: Dict[str, Any]
    generated_at: str
    summary: Dict[str, Any]
    conclusions: str
    references: List[Dict[str, str]]
    ai_summary: Optional[str] = None
    techniques: List[Dict[str, Any]]


# ── Helpers ───────────────────────────────────────────────────────────

def _validate_technique(technique: str) -> str:
    tech = (technique or "").strip().lower()
    if tech not in TECHNIQUES:
        raise HTTPException(status_code=404, detail=f"Unsupported technique: {technique}")
    return tech


async def _require_project(project_id: str, container):
    try:
        await container.project_use_case.get_project(project_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")


async def _experiments(container, project_id: str) -> List:
    return await container.uow.experiments.get_by_project_id(UUID(project_id))


async def _require_experiment(container, project_id: str, experiment_id: str):
    experiments = await _experiments(container, project_id)
    for exp in experiments:
        if str(exp.id) == experiment_id:
            return exp
    raise HTTPException(
        status_code=404,
        detail=f"Experiment {experiment_id} not found in project {project_id}",
    )


def _decimate(values: Optional[List[float]], limit: int = MAX_RESPONSE_POINTS) -> Optional[List[float]]:
    if not values:
        return values
    if len(values) <= limit:
        return values
    step = max(1, len(values) // limit)
    return [values[i] for i in range(0, len(values), step)]


def _x_range(x: Optional[List[float]]) -> Optional[List[float]]:
    if not x:
        return None
    return [min(x), max(x)]


def _to_list_item(exp) -> Dict[str, Any]:
    return {
        "id": str(exp.id),
        "project_id": str(exp.project_id) if exp.project_id else str(exp.project_id),
        "technique": exp.technique,
        "name": exp.name,
        "description": exp.description,
        "material": exp.material,
        "status": exp.status,
        "data_points": exp.data_points,
        "x_range": _x_range(getattr(exp, "raw_x", None)),
        "has_results": exp.has_results,
        "summary": experiment_summary(exp),
        "created_at": exp.created_at.isoformat(),
        "updated_at": exp.updated_at.isoformat(),
    }


# ── Instruments overview ─────────────────────────────────────────────

@router.get("", response_model=List[InstrumentSummary])
async def list_instruments(project_id: str, container=Depends(get_container)):
    """List instrument workspaces present in a project with experiment counts."""
    await _require_project(project_id, container)
    experiments = await _experiments(container, project_id)
    summary = []
    for technique in TECHNIQUES:
        subset = [e for e in experiments if (e.technique or "").lower() == technique]
        summary.append(
            InstrumentSummary(
                technique=technique,
                display_name=TECHNIQUES[technique],
                experiment_count=len(subset),
                analyzed_count=sum(1 for e in subset if e.has_results),
                data_count=sum(1 for e in subset if getattr(e, "raw_x", None)),
            )
        )
    return summary


# ── Experiment CRUD (technique-scoped) ───────────────────────────────

@router.post("/{technique}/experiments", response_model=ExperimentDetail, status_code=201)
async def create_experiment(
    project_id: str,
    technique: str,
    request: ExperimentCreateRequest,
    container=Depends(get_container),
):
    """Create an experiment in the given instrument workspace."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)

    from backend.domain.entities.experiment import Experiment
    from backend.domain.entities.experiment import ExperimentMetadata

    exp = Experiment(
        project_id=UUID(project_id),
        technique=tech,
        name=request.name.strip(),
        description=request.description,
        material=request.material,
        status="Created",
        raw_x=request.x,
        raw_y=request.y,
        metadata=ExperimentMetadata(instrument=tech),
    )
    if request.x is not None and request.y is not None:
        if len(request.x) != len(request.y):
            raise HTTPException(status_code=422, detail="x and y must have the same length")
        if len(request.x) < 5:
            raise HTTPException(status_code=422, detail="At least 5 data points required")
        exp.data_points = len(request.x)
        exp.has_pattern_data = True
        exp.status = "Uploaded"

    await container.uow.experiments.add(exp)
    await container.uow.commit()

    if request.run_analysis and request.x is not None and request.y is not None:
        if tech in ("ftir", "raman", "uvvis"):
            try:
                _run_analysis(exp, request.parameters or {})
            except ValueError as exc:
                exp.status = "Uploaded"
                raise HTTPException(status_code=422, detail=str(exc))
            await container.uow.experiments.update(exp)
            await container.uow.commit()

    exp.add_history("experiment_created", {
        "technique": tech,
        "data_points": exp.data_points,
    })
    await container.uow.experiments.update(exp)
    await container.uow.commit()
    return ExperimentDetail(**_detail_dict(exp))


@router.get("/{technique}/experiments", response_model=List[ExperimentListItem])
async def list_experiments(
    project_id: str,
    technique: str,
    container=Depends(get_container),
):
    """List experiments in an instrument workspace."""
    tech = _validate_technique(technique)
    experiments = await _experiments(container, project_id)
    subset = [e for e in experiments if (e.technique or "").lower() == tech]
    subset.sort(key=lambda e: e.created_at, reverse=True)
    return [ExperimentListItem(**_to_list_item(e)) for e in subset]


@router.get("/{technique}/experiments/{experiment_id}", response_model=ExperimentDetail)
async def get_experiment(
    project_id: str,
    technique: str,
    experiment_id: str,
    container=Depends(get_container),
):
    """Get full experiment detail (raw data, results, history)."""
    tech = _validate_technique(technique)
    exp = await _require_experiment(container, project_id, experiment_id)
    if (exp.technique or "").lower() != tech:
        raise HTTPException(
            status_code=404,
            detail=f"Experiment {experiment_id} is not a {tech} experiment",
        )
    return ExperimentDetail(**_detail_dict(exp))


@router.delete("/{technique}/experiments/{experiment_id}")
async def delete_experiment(
    project_id: str,
    technique: str,
    experiment_id: str,
    container=Depends(get_container),
):
    """Delete an experiment from the instrument workspace."""
    tech = _validate_technique(technique)
    exp = await _require_experiment(container, project_id, experiment_id)
    if (exp.technique or "").lower() != tech:
        raise HTTPException(status_code=404, detail=f"Experiment {experiment_id} is not a {tech} experiment")
    deleted = await container.uow.experiments.delete(UUID(experiment_id))
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Experiment {experiment_id} not found")
    await container.uow.commit()
    return {"success": True, "message": f"{TECHNIQUES[tech]} experiment {experiment_id} deleted"}


@router.post("/{technique}/experiments/{experiment_id}/data", response_model=ExperimentDetail)
async def set_experiment_data(
    project_id: str,
    technique: str,
    experiment_id: str,
    request: ExperimentDataRequest,
    container=Depends(get_container),
):
    """Store raw spectrum data on an experiment."""
    tech = _validate_technique(technique)
    exp = await _require_experiment(container, project_id, experiment_id)
    if len(request.x) != len(request.y):
        raise HTTPException(status_code=422, detail="x and y must have the same length")
    if len(request.x) < 5:
        raise HTTPException(status_code=422, detail="At least 5 data points required")
    exp.raw_x = list(request.x)
    exp.raw_y = list(request.y)
    exp.data_points = len(request.x)
    exp.has_pattern_data = True
    exp.status = "Uploaded"
    exp.add_history("data_updated", {"data_points": len(request.x)})
    await container.uow.experiments.update(exp)
    await container.uow.commit()
    return ExperimentDetail(**_detail_dict(exp))


@router.post("/{technique}/experiments/{experiment_id}/analyze", response_model=AnalyzeResponse)
async def analyze_experiment(
    project_id: str,
    technique: str,
    experiment_id: str,
    request: AnalyzeRequest,
    container=Depends(get_container),
):
    """Run the technique-specific analysis engine on the experiment's spectrum."""
    tech = _validate_technique(technique)
    if tech == "xrd":
        raise HTTPException(
            status_code=422,
            detail="XRD analysis runs through the scientific pipeline (see /experiments/{id}/pipeline)",
        )
    exp = await _require_experiment(container, project_id, experiment_id)
    if (exp.technique or "").lower() != tech:
        raise HTTPException(status_code=404, detail=f"Experiment {experiment_id} is not a {tech} experiment")

    x = request.x if request.x is not None else getattr(exp, "raw_x", None)
    y = request.y if request.y is not None else getattr(exp, "raw_y", None)
    if x is None or y is None:
        raise HTTPException(status_code=422, detail="No spectrum data; upload data first")
    if len(x) != len(y):
        raise HTTPException(status_code=422, detail="x and y must have the same length")

    try:
        results = _run_analysis(exp, request.parameters or {})
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    await container.uow.experiments.update(exp)
    await container.uow.commit()
    return AnalyzeResponse(
        experiment_id=experiment_id,
        technique=tech,
        success=True,
        message=f"Analysis complete: {len(results.get('peaks', []))} peaks detected",
        results=results,
    )


# ── Reference library (FTIR / Raman / UV-Vis) ────────────────────────

@router.get("/{technique}/reference/providers", response_model=ProvidersResponse)
async def reference_providers(
    project_id: str,
    technique: str,
    container=Depends(get_container),
):
    """List spectral reference providers available for the technique."""
    tech = _validate_technique(technique)
    if tech == "xrd":
        raise HTTPException(status_code=404, detail="XRD uses crystallographic reference providers")
    service = container.spectral_reference_service
    return ProvidersResponse(
        technique=tech,
        providers=[
            p for p in service.provider_status()
            if tech in p["techniques"]
        ],
    )


@router.get("/{technique}/reference/search", response_model=ReferenceSearchResponse)
async def reference_search(
    project_id: str,
    technique: str,
    query: str = Query("", description="Material / formula / category search term"),
    limit: int = Query(20, ge=1, le=100),
    container=Depends(get_container),
):
    """Search reference spectra in the instrument workspace's library."""
    tech = _validate_technique(technique)
    if tech == "xrd":
        raise HTTPException(status_code=404, detail="XRD uses crystallographic reference providers")
    results = await container.spectral_reference_service.search(query, limit=limit, technique=tech)
    return ReferenceSearchResponse(
        query=query,
        technique=tech,
        results=[r.to_dict() for r in results],
    )


@router.post("/{technique}/reference/match", response_model=ReferenceMatchResponse)
async def reference_match(
    project_id: str,
    technique: str,
    request: ReferenceMatchRequest,
    container=Depends(get_container),
):
    """Match a spectrum against the reference library."""
    tech = _validate_technique(technique)
    if tech == "xrd":
        raise HTTPException(status_code=404, detail="XRD uses crystallographic reference providers")

    x = request.x
    y = request.y
    if request.experiment_id:
        exp = await _require_experiment(container, project_id, request.experiment_id)
        if (exp.technique or "").lower() != tech:
            raise HTTPException(status_code=404, detail="experiment_id is not a " + tech + " experiment")
        x = getattr(exp, "raw_x", None)
        y = getattr(exp, "raw_y", None)
    if x is None or y is None:
        raise HTTPException(status_code=422, detail="Provide experiment_id or x/y data to match")
    if len(x) != len(y):
        raise HTTPException(status_code=422, detail="x and y must have the same length")

    matches = await container.spectral_reference_service.match_spectrum(
        x, y, limit=request.limit, technique=tech
    )
    return ReferenceMatchResponse(
        technique=tech,
        matches=[m.to_dict() for m in matches],
    )


# ── AI interpretation ───────────────────────────────────────────────

@router.post("/{technique}/experiments/{experiment_id}/interpret", response_model=InterpretResponse)
async def interpret_experiment(
    project_id: str,
    technique: str,
    experiment_id: str,
    request: InterpretRequest,
    container=Depends(get_container),
):
    """Technique-specific AI interpretation of an experiment's results."""
    tech = _validate_technique(technique)
    exp = await _require_experiment(container, project_id, experiment_id)
    if (exp.technique or "").lower() != tech:
        raise HTTPException(
            status_code=404,
            detail=f"Experiment {experiment_id} is not a {tech} experiment",
        )

    from backend.services.ai_interpretation import interpret

    result = interpret(
        tech,
        getattr(exp, "name", "") or "Untitled Experiment",
        getattr(exp, "analysis_results", None),
        question=request.question or "Interpret these results for me.",
    )
    return InterpretResponse(
        experiment_id=experiment_id,
        technique=tech,
        interpretation=result["interpretation"],
        model=result["model"],
    )


# ── Workspace report ────────────────────────────────────────────────

@router.post("/report/ai-summary", response_model=AiSummaryResponse)
async def workspace_report_ai_summary(
    project_id: str,
    container=Depends(get_container),
):
    """Generate a cross-technique AI summary of the unified workspace report."""
    await _require_project(project_id, container)

    from backend.services.workspace_report import WorkspaceReportService, render_text
    from backend.services.ai_interpretation import summarize_report

    service = WorkspaceReportService(container.uow)
    report = await service.generate(project_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    text = render_text(report)
    result = summarize_report(text, report["project"].get("name", "Untitled Project"))
    return AiSummaryResponse(
        project_id=project_id,
        ai_summary=result["ai_summary"],
        model=result["model"],
    )


@router.get("/report", response_model=WorkspaceReportResponse)
async def workspace_report(
    project_id: str,
    container=Depends(get_container),
):
    """Unified report covering every instrument experiment in the project."""
    await _require_project(project_id, container)

    from backend.services.workspace_report import WorkspaceReportService

    service = WorkspaceReportService(container.uow)
    report = await service.generate(project_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return report


@router.get("/report/download")
async def workspace_report_download(
    project_id: str,
    container=Depends(get_container),
):
    """Download the unified workspace report as plain text."""
    await _require_project(project_id, container)

    from backend.services.workspace_report import WorkspaceReportService, render_text
    from fastapi.responses import Response

    service = WorkspaceReportService(container.uow)
    report = await service.generate(project_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    content = render_text(report)
    safe_name = "".join(
        c if c.isalnum() or c in ("-", "_") else "_"
        for c in report["project"].get("name", "workspace")
    ).strip("._ ") or "workspace"
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_workspace_report.txt"'
        },
    )


# ── Internal ─────────────────────────────────────────────────────────

def _run_analysis(exp, parameters: Dict[str, Any]) -> Dict[str, Any]:
    from backend.services.instrument_analysis import analyze_instrument

    x = list(getattr(exp, "raw_x", None) or [])
    y = list(getattr(exp, "raw_y", None) or [])
    if not x or not y:
        raise ValueError("No spectrum data available")
    results = analyze_instrument(exp.technique, x, y, parameters)
    exp.analysis_results = results
    exp.detected_peaks = results.get("peaks", [])
    exp.has_results = True
    exp.status = "Analyzed"
    exp.data_points = len(x)
    exp.add_history("analyze", {
        "engine": results.get("engine"),
        "parameters": results.get("parameters"),
        "peaks": len(results.get("peaks", [])),
    })
    return results


def _detail_dict(exp) -> Dict[str, Any]:
    item = _to_list_item(exp)
    x = getattr(exp, "raw_x", None)
    y = getattr(exp, "raw_y", None)
    item.update({
        "x": _decimate(x) if x else None,
        "y": _decimate(y) if y else None,
        "analysis_results": getattr(exp, "analysis_results", None),
        "detected_peaks": getattr(exp, "detected_peaks", []),
        "history": getattr(exp, "analysis_history", []),
    })
    return item
