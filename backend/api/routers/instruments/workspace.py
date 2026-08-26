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
    batch_id: Optional[str] = None
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
        batch_id=UUID(request.batch_id) if request.batch_id else None,
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


# ── Batch & Comparison System ─────────────────────────────────────────

class BatchSampleCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    material: str = ""
    x: Optional[List[float]] = None
    y: Optional[List[float]] = None
    parameters: Optional[Dict[str, Any]] = None


class BatchCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    samples: List[BatchSampleCreate] = Field(default_factory=list)


class BatchListItem(BaseModel):
    id: str
    project_id: str
    technique: str
    name: str
    description: str
    status: str
    sample_count: int
    completed_count: int
    warning_count: int
    failed_count: int
    created_at: str
    updated_at: str


class BatchDetail(BatchListItem):
    samples: List[Dict[str, Any]]


class CompareRequest(BaseModel):
    sample_ids: Optional[List[str]] = None


class CompareResponse(BaseModel):
    technique: str
    sample_count: int
    comparison_data: Dict[str, Any]


def _compute_technique_comparison(technique: str, samples: List[Any]) -> Dict[str, Any]:
    """Compute technique-specific scientific comparison metrics across samples."""
    tech = (technique or "").strip().lower()
    summary: List[Dict[str, Any]] = []

    for s in samples:
        res = getattr(s, "analysis_results", None) or {}
        peaks = getattr(s, "detected_peaks", None) or res.get("peaks", [])
        
        info: Dict[str, Any] = {
            "sample_id": str(s.id),
            "sample_name": s.name,
            "has_results": s.has_results,
            "peak_count": len(peaks),
        }

        if tech == "xrd":
            info["two_theta_range"] = _x_range(getattr(s, "raw_x", None))
            info["candidate_phases"] = res.get("candidate_phases", [])
            info["goodness_of_fit"] = res.get("rietveld_results", {}).get("gof") or getattr(s, "goodness_of_fit", None)
            info["top_peaks"] = [p.get("position") for p in peaks[:5] if isinstance(p, dict)]
        elif tech == "ftir":
            info["wavenumber_range"] = _x_range(getattr(s, "raw_x", None))
            info["functional_groups"] = res.get("functional_groups", [])
            info["library_matches"] = res.get("library_matches", [])[:3]
            info["key_bands"] = [p.get("position") for p in peaks[:5] if isinstance(p, dict)]
        elif tech == "raman":
            info["shift_range"] = _x_range(getattr(s, "raw_x", None))
            info["phonons"] = res.get("phonons", [])
            info["cosmic_rays"] = res.get("cosmic_rays", {})
            info["key_shifts"] = [p.get("position") for p in peaks[:5] if isinstance(p, dict)]
        elif tech == "uvvis":
            info["wavelength_range"] = _x_range(getattr(s, "raw_x", None))
            info["band_gap_ev"] = res.get("band_gap_ev") or res.get("tauc", {}).get("band_gap_ev")
            info["band_gap_type"] = res.get("band_gap_type") or res.get("tauc", {}).get("mode")
            info["optical_edge_nm"] = res.get("optical_edge_nm")

        summary.append(info)

    return {
        "technique": tech,
        "sample_count": len(samples),
        "samples": summary,
    }


@router.get("/{technique}/batches", response_model=List[BatchListItem])
async def list_batches(
    project_id: str,
    technique: str,
    container=Depends(get_container),
):
    """List batches for an instrument in a workspace."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)
    experiments = await _experiments(container, project_id)
    tech_exps = [e for e in experiments if (e.technique or "").lower() == tech]

    # Group experiments by batch_id or virtual default batch
    batch_map: Dict[str, List] = {}
    for exp in tech_exps:
        b_id = str(getattr(exp, "batch_id", None) or "default")
        batch_map.setdefault(b_id, []).append(exp)

    results: List[BatchListItem] = []
    for b_id, exps in batch_map.items():
        completed = sum(1 for e in exps if e.has_results)
        # Read batch name/description from first experiment's metadata if available
        first_meta = getattr(exps[0], "metadata", None)
        meta_dict = {}
        if isinstance(first_meta, dict):
            meta_dict = first_meta
        elif hasattr(first_meta, "custom") and isinstance(first_meta.custom, dict):
            meta_dict = first_meta.custom
        elif hasattr(first_meta, "__dict__"):
            meta_dict = first_meta.__dict__

        batch_name = meta_dict.get("batch_name") or (
            f"{TECHNIQUES[tech]} Batch ({b_id[:8]})" if b_id != "default" else f"{TECHNIQUES[tech]} Main Batch"
        )
        batch_desc = meta_dict.get("batch_description") or f"Batch containing {len(exps)} sample measurements"

        results.append(
            BatchListItem(
                id=b_id,
                project_id=project_id,
                technique=tech,
                name=batch_name,
                description=batch_desc,
                status="Completed" if completed == len(exps) and len(exps) > 0 else "Active",
                sample_count=len(exps),
                completed_count=completed,
                warning_count=0,
                failed_count=0,
                created_at=exps[0].created_at.isoformat() if exps else "",
                updated_at=exps[0].updated_at.isoformat() if exps else "",
            )
        )
    return results


@router.post("/{technique}/batches", response_model=BatchDetail, status_code=201)
async def create_batch(
    project_id: str,
    technique: str,
    request: BatchCreateRequest,
    container=Depends(get_container),
):
    """Create a new batch in an instrument workspace (Maximum 20 samples per batch)."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)

    if len(request.samples) > 20:
        raise HTTPException(
            status_code=422,
            detail="Maximum 20 samples allowed per batch per instrument.",
        )

    from uuid import uuid4
    batch_uuid = uuid4()

    from backend.services.instrument_analysis import build_experiment

    created_samples = []
    completed = 0

    for sample_req in request.samples:
        exp = build_experiment(
            technique=tech,
            name=sample_req.name,
            project_id=project_id,
            description=sample_req.description,
            material=sample_req.material,
        )
        exp.batch_id = batch_uuid
        if sample_req.x and sample_req.y:
            exp.raw_x = sample_req.x
            exp.raw_y = sample_req.y
            exp.data_points = len(sample_req.x)
            try:
                _run_analysis(exp, sample_req.parameters or {})
                completed += 1
            except Exception as exc:
                exp.status = "Failed"
                exp.add_history("analyze_error", {"error": str(exc)})

        await container.uow.experiments.add(exp)
        created_samples.append(exp)

    await container.uow.commit()
    batch_id = str(batch_uuid)
    now = created_samples[0].created_at.isoformat() if created_samples else ""
    updated = created_samples[0].updated_at.isoformat() if created_samples else ""

    return BatchDetail(
        id=batch_id,
        project_id=project_id,
        technique=tech,
        name=request.name,
        description=request.description,
        status="Completed" if completed == len(created_samples) and len(created_samples) > 0 else "Active",
        sample_count=len(created_samples),
        completed_count=completed,
        warning_count=0,
        failed_count=0,
        created_at=now,
        updated_at=updated,
        samples=[_detail_dict(s) for s in created_samples],
    )


@router.get("/{technique}/batches/{batch_id}", response_model=BatchDetail)
async def get_batch(
    project_id: str,
    technique: str,
    batch_id: str,
    container=Depends(get_container),
):
    """Fetch batch details and all its constituent sample experiments."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)
    experiments = await _experiments(container, project_id)
    tech_exps = [e for e in experiments if (e.technique or "").lower() == tech]

    batch_samples = [
        e for e in tech_exps
        if str(getattr(e, "batch_id", None) or "default") == batch_id or str(e.id) == batch_id
    ]
    if not batch_samples and batch_id != "default":
        # Fallback to all technique samples if batch_id matched single id or default
        batch_samples = tech_exps

    completed = sum(1 for e in batch_samples if e.has_results)
    first_exp = batch_samples[0] if batch_samples else None

    # Read batch name/description from metadata if available
    meta_dict = {}
    if first_exp:
        first_meta = getattr(first_exp, "metadata", None)
        if isinstance(first_meta, dict):
            meta_dict = first_meta
        elif hasattr(first_meta, "custom") and isinstance(first_meta.custom, dict):
            meta_dict = first_meta.custom
        elif hasattr(first_meta, "__dict__"):
            meta_dict = first_meta.__dict__

    batch_name = meta_dict.get("batch_name") or f"{TECHNIQUES[tech]} Batch"
    batch_desc = meta_dict.get("batch_description") or f"Batch containing {len(batch_samples)} sample measurements"

    return BatchDetail(
        id=batch_id,
        project_id=project_id,
        technique=tech,
        name=batch_name,
        description=batch_desc,
        status="Completed" if completed == len(batch_samples) and len(batch_samples) > 0 else "Active",
        sample_count=len(batch_samples),
        completed_count=completed,
        warning_count=0,
        failed_count=0,
        created_at=first_exp.created_at.isoformat() if first_exp else "",
        updated_at=first_exp.updated_at.isoformat() if first_exp else "",
        samples=[_detail_dict(s) for s in batch_samples],
    )


@router.post("/{technique}/batches/{batch_id}/analyze")
async def analyze_batch(
    project_id: str,
    technique: str,
    batch_id: str,
    parameters: Optional[Dict[str, Any]] = None,
    container=Depends(get_container),
):
    """Run batch analysis across all samples in the batch independently."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)
    experiments = await _experiments(container, project_id)
    batch_samples = [
        e for e in experiments
        if (e.technique or "").lower() == tech
        and (str(getattr(e, "batch_id", None) or "default") == batch_id or str(e.id) == batch_id or batch_id == "default")
    ]

    analyzed = 0
    failed = 0
    for exp in batch_samples:
        if getattr(exp, "raw_x", None) and getattr(exp, "raw_y", None):
            try:
                _run_analysis(exp, parameters or {})
                await container.uow.experiments.update(exp)
                analyzed += 1
            except Exception:
                failed += 1

    await container.uow.commit()
    return {
        "batch_id": batch_id,
        "technique": tech,
        "total_samples": len(batch_samples),
        "analyzed_count": analyzed,
        "failed_count": failed,
    }


@router.post("/{technique}/batches/{batch_id}/compare", response_model=CompareResponse)
async def compare_batch_samples(
    project_id: str,
    technique: str,
    batch_id: str,
    request: CompareRequest,
    container=Depends(get_container),
):
    """Run instrument-specific comparison across selected samples in a batch."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)
    experiments = await _experiments(container, project_id)
    tech_exps = [e for e in experiments if (e.technique or "").lower() == tech]

    if request.sample_ids:
        selected = [e for e in tech_exps if str(e.id) in request.sample_ids]
    else:
        selected = tech_exps

    comp_data = _compute_technique_comparison(tech, selected)
    return CompareResponse(
        technique=tech,
        sample_count=len(selected),
        comparison_data=comp_data,
    )


# ── Batch Update / Delete ───────────────────────────────────────────

class BatchUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


@router.put("/{technique}/batches/{batch_id}")
async def update_batch(
    project_id: str,
    technique: str,
    batch_id: str,
    request: BatchUpdateRequest,
    container=Depends(get_container),
):
    """Update batch metadata (name, description, status)."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)
    experiments = await _experiments(container, project_id)
    tech_exps = [e for e in experiments if (e.technique or "").lower() == tech]
    batch_samples = [
        e for e in tech_exps
        if str(getattr(e, "batch_id", None) or "default") == batch_id
    ]
    if not batch_samples and batch_id != "default":
        batch_samples = [e for e in tech_exps if str(e.id) == batch_id]
    if not batch_samples:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    updated_fields = {}
    for exp in batch_samples:
        if request.name is not None:
            updated_fields["batch_name"] = request.name
        if request.description is not None:
            updated_fields["batch_description"] = request.description
        if request.status is not None:
            exp.status = request.status

    for exp in batch_samples:
        meta = getattr(exp, "metadata", None) or {}
        if isinstance(meta, dict):
            meta.update(updated_fields)
            exp.metadata = meta
        await container.uow.experiments.update(exp)

    await container.uow.commit()
    return {"batch_id": batch_id, "technique": tech, "updated": len(batch_samples)}


@router.delete("/{technique}/batches/{batch_id}")
async def delete_batch(
    project_id: str,
    technique: str,
    batch_id: str,
    container=Depends(get_container),
):
    """Delete a batch and all its constituent sample experiments."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)
    experiments = await _experiments(container, project_id)
    tech_exps = [e for e in experiments if (e.technique or "").lower() == tech]
    batch_samples = [
        e for e in tech_exps
        if str(getattr(e, "batch_id", None) or "default") == batch_id
    ]
    if not batch_samples and batch_id != "default":
        batch_samples = [e for e in tech_exps if str(e.id) == batch_id]
    if not batch_samples:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    deleted = 0
    for exp in batch_samples:
        try:
            await container.uow.experiments.delete(exp.id)
            deleted += 1
        except Exception:
            pass

    await container.uow.commit()
    return {"batch_id": batch_id, "technique": tech, "deleted": deleted}


# ── Sample management within batches ────────────────────────────────

class SampleAddRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    material: str = ""
    x: Optional[List[float]] = None
    y: Optional[List[float]] = None
    parameters: Optional[Dict[str, Any]] = None


@router.post("/{technique}/batches/{batch_id}/samples", response_model=ExperimentDetail, status_code=201)
async def add_sample_to_batch(
    project_id: str,
    technique: str,
    batch_id: str,
    request: SampleAddRequest,
    container=Depends(get_container),
):
    """Add a single sample (experiment) to an existing batch."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)

    experiments = await _experiments(container, project_id)
    tech_exps = [e for e in experiments if (e.technique or "").lower() == tech]
    existing_batch = [
        e for e in tech_exps
        if str(getattr(e, "batch_id", None) or "default") == batch_id
        or str(e.id) == batch_id
    ]
    if not existing_batch and batch_id != "default":
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    if len(existing_batch) >= 20:
        raise HTTPException(status_code=422, detail="Batch already has maximum 20 samples.")

    from backend.domain.entities.experiment import Experiment, ExperimentMetadata

    # Resolve the batch_id: if it's a real UUID, use it; otherwise fall back to first experiment's id
    resolved_batch_id = None
    try:
        from uuid import UUID as _UUID
        resolved_batch_id = _UUID(batch_id)
    except ValueError:
        if existing_batch:
            resolved_batch_id = getattr(existing_batch[0], "batch_id", None) or existing_batch[0].id

    exp = Experiment(
        project_id=UUID(project_id),
        technique=tech,
        name=request.name.strip(),
        description=request.description,
        material=request.material,
        status="Created",
        raw_x=request.x,
        raw_y=request.y,
        batch_id=resolved_batch_id,
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

    if request.x is not None and request.y is not None:
        try:
            _run_analysis(exp, request.parameters or {})
        except Exception:
            exp.status = "Uploaded"

    exp.add_history("sample_added_to_batch", {
        "batch_id": batch_id,
        "technique": tech,
    })
    await container.uow.experiments.update(exp)
    await container.uow.commit()
    return ExperimentDetail(**_detail_dict(exp))


@router.delete("/{technique}/batches/{batch_id}/samples/{sample_id}")
async def remove_sample_from_batch(
    project_id: str,
    technique: str,
    batch_id: str,
    sample_id: str,
    container=Depends(get_container),
):
    """Remove a sample (experiment) from a batch."""
    tech = _validate_technique(technique)
    await _require_project(project_id, container)
    exp = await _require_experiment(container, project_id, sample_id)
    if (exp.technique or "").lower() != tech:
        raise HTTPException(status_code=404, detail="Experiment not found in this technique workspace")

    await container.uow.experiments.delete(exp.id)
    await container.uow.commit()
    return {"deleted": True, "sample_id": sample_id}
