"""Experiments API endpoints.

Dedicated router for experiment-level scientific operations.
All actions happen inside an Experiment — the user never leaves.
"""

import logging
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel

from backend.api.dependencies import get_container

logger = logging.getLogger("experiments_router")

router = APIRouter(prefix="/experiments", tags=["Experiments"])


# ── Response Models ────────────────────────────────────────────────

class ExperimentDetailResponse(BaseModel):
    id: str
    project_id: Optional[str]
    name: str
    description: str
    material: str
    status: str
    file_ids: List[str]
    primary_file_id: Optional[str]
    has_pattern_data: bool
    has_crystal_structure: bool
    data_points: int
    two_theta_range: Optional[List[float]]
    wavelength_angstrom: Optional[float]
    raw_two_theta: Optional[List[float]] = None
    raw_intensity: Optional[List[float]] = None
    job_ids: List[str]
    has_results: bool
    candidate_phases: List[Dict[str, Any]]
    cif_files: List[Dict[str, Any]]
    selected_refinement_phases: List[Dict[str, Any]]
    rietveld_results: Optional[Dict[str, Any]]
    detected_peaks: List[Dict[str, Any]]
    pipeline_stages: List[Dict[str, Any]]
    analysis_history: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    created_at: str
    updated_at: str


class PipelineRequest(BaseModel):
    stages: Optional[List[str]] = None  # Run specific stages, or all if None
    stage_params: Optional[Dict[str, Dict[str, Any]]] = None


class PipelineResponse(BaseModel):
    success: bool
    message: str
    completed_stages: List[str]
    results: Dict[str, Any]


class PhaseIdRequest(BaseModel):
    query: str = ""
    elements: Optional[List[str]] = None
    limit: int = 20


class PhaseIdResponse(BaseModel):
    success: bool
    message: str
    candidate_phases: List[Dict[str, Any]]
    cif_files: List[Dict[str, Any]]
    peaks_detected: int = 0
    candidates_searched: int = 0


class RietveldResponse(BaseModel):
    success: bool
    message: str
    phases_used: List[Dict[str, Any]]
    rietveld_results: Optional[Dict[str, Any]] = None


class RietveldRequest(BaseModel):
    workflow: str  # "auto" (use downloaded CIFs) or "upload" (use uploaded CIFs)
    selected_cif_ids: Optional[List[str]] = None  # For workflow "auto"
    # CIF content is uploaded as files for workflow "upload"


class CIFUploadResponse(BaseModel):
    success: bool
    message: str
    cif_files: List[Dict[str, Any]]


# ── Endpoints ──────────────────────────────────────────────────────

@router.get("/{experiment_id}", response_model=ExperimentDetailResponse)
async def get_experiment(experiment_id: str, container=Depends(get_container)):
    """Get full experiment details including scientific state."""
    exp = await container.uow.experiments.get_by_id(UUID(experiment_id))
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    return _experiment_to_response(exp)


@router.post("/{experiment_id}/phase-identification", response_model=PhaseIdResponse)
async def run_phase_identification(
    experiment_id: str,
    request: PhaseIdRequest,
    container=Depends(get_container),
):
    """Run full phase identification on the experiment's diffraction pattern.

    Workflow: detect peaks → search COD → download CIFs → compare → rank → store.
    """
    exp = await container.uow.experiments.get_by_id(UUID(experiment_id))
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    from backend.services.phase_identification_service import PhaseIdentificationService
    service = PhaseIdentificationService(
        reference_engine=container.reference_engine,
        upload_service=container.upload_service,
    )

    result = await service.run_phase_identification(
        experiment=exp,
        query=request.query,
        elements=request.elements,
        limit=request.limit,
    )

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    # Store results on the experiment
    exp.candidate_phases = result["candidate_phases"]
    # Merge new CIFs with existing
    existing_cif_ids = {c["cod_id"] for c in exp.cif_files}
    for cif in result["cif_files"]:
        if cif["cod_id"] not in existing_cif_ids:
            exp.cif_files.append(cif)
    exp.has_results = True
    exp.status = "Analyzed"
    exp.add_history("phase_identification", {
        "query": request.query,
        "elements": request.elements,
        "candidates_found": len(result["candidate_phases"]),
        "cifs_downloaded": len(result["cif_files"]),
    })
    await container.uow.experiments.update(exp)

    return PhaseIdResponse(
        success=True,
        message=result["message"],
        candidate_phases=result["candidate_phases"],
        cif_files=result["cif_files"],
        peaks_detected=result.get("peaks_detected", 0),
        candidates_searched=result.get("candidates_searched", 0),
    )


@router.post("/{experiment_id}/cifs", response_model=CIFUploadResponse)
async def upload_cif_files(
    experiment_id: str,
    files: List[UploadFile] = File(...),
    container=Depends(get_container),
):
    """Upload external CIF files for Rietveld refinement (Workflow B)."""
    exp = await container.uow.experiments.get_by_id(UUID(experiment_id))
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    from backend.reference.cif_parser import CIFParser
    cif_parser = CIFParser()

    new_cifs = []
    for upload_file in files:
        content = await upload_file.read()
        text = content.decode("utf-8", errors="replace")

        try:
            parsed = cif_parser.parse(text)
        except Exception as e:
            logger.warning("Failed to parse CIF %s: %s", upload_file.filename, e)
            parsed = {"formula": upload_file.filename, "error": str(e)}

        cif_entry = {
            "cod_id": f"upload_{upload_file.filename}",
            "material_name": parsed.get("name", upload_file.filename),
            "material_formula": parsed.get("formula", ""),
            "source_provider": "UserUpload",
            "filename": upload_file.filename,
            "downloaded": False,
            "uploaded": True,
            "used_for_phase_id": False,
            "parsed_data": parsed,
        }
        exp.cif_files.append(cif_entry)
        new_cifs.append(cif_entry)

    exp.add_history("cif_upload", {
        "files_uploaded": len(new_cifs),
        "filenames": [f.filename for f in files],
    })
    await container.uow.experiments.update(exp)

    return CIFUploadResponse(
        success=True,
        message=f"Uploaded {len(new_cifs)} CIF file(s)",
        cif_files=new_cifs,
    )


@router.get("/{experiment_id}/cifs")
async def list_cif_files(experiment_id: str, container=Depends(get_container)):
    """List all CIF files (auto-downloaded + user-uploaded) for this experiment."""
    exp = await container.uow.experiments.get_by_id(UUID(experiment_id))
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    return {"cif_files": exp.cif_files}


@router.post("/{experiment_id}/rietveld", response_model=RietveldResponse)
async def run_rietveld(
    experiment_id: str,
    request: RietveldRequest,
    container=Depends(get_container),
):
    """Run Rietveld refinement.

    Workflow A ("auto"): Select from CIFs already downloaded during phase identification.
    Workflow B ("upload"): Use CIF files uploaded via the /cifs endpoint.
    """
    exp = await container.uow.experiments.get_by_id(UUID(experiment_id))
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    selected_phases = []

    if request.workflow == "auto":
        # Select from existing CIF files by cod_id
        if not request.selected_cif_ids:
            raise HTTPException(
                status_code=400,
                detail="selected_cif_ids required for workflow 'auto'"
            )
        logger.info("[RIETVELD DEBUG] received selected_cif_ids=%s", request.selected_cif_ids)
        logger.info("[RIETVELD DEBUG] exp.cif_files count=%d, cod_ids=%s", len(exp.cif_files), [c.get("cod_id") for c in exp.cif_files])
        logger.info("[RIETVELD DEBUG] candidate_phases count=%d, source_ids=%s", len(exp.candidate_phases or []), [p.get("source_id") for p in (exp.candidate_phases or [])])
        cif_map = {c["cod_id"]: c for c in exp.cif_files}
        logger.info("[RIETVELD DEBUG] cif_map keys=%s", list(cif_map.keys()))
        for cid in request.selected_cif_ids:
            if cid in cif_map:
                selected_phases.append(cif_map[cid])
                logger.info("[RIETVELD DEBUG] MATCHED cid=%s", cid)
            else:
                logger.warning("[RIETVELD DEBUG] NO MATCH cid=%s NOT in cif_map keys=%s", cid, list(cif_map.keys()))
        logger.info("[RIETVELD DEBUG] selected_phases count=%d", len(selected_phases))

    elif request.workflow == "upload":
        # Use all uploaded CIFs (not auto-downloaded)
        selected_phases = [
            c for c in exp.cif_files
            if c.get("uploaded") and not c.get("used_for_phase_id")
        ]

    else:
        raise HTTPException(status_code=400, detail="workflow must be 'auto' or 'upload'")

    if not selected_phases:
        raise HTTPException(
            status_code=400,
            detail="No phases selected for refinement"
        )

    # Get experimental pattern — try upload registry first, then experiment entity
    import numpy as np
    from backend.services.rietveld_service import RietveldService

    file_id = exp.primary_file_id
    two_theta_obs = None
    intensity_obs = None
    wavelength = exp.wavelength_angstrom or 1.5406

    if file_id:
        upload_record = container.upload_service.get_upload(file_id)
        if upload_record and upload_record.experiment:
            parsed = upload_record.experiment
            two_theta_obs = np.array(parsed.two_theta)
            intensity_obs = np.array(parsed.intensity)
            wavelength = parsed.wavelength.value_angstrom if parsed.wavelength else wavelength

    # Fallback: use raw data stored on the experiment entity
    if two_theta_obs is None or intensity_obs is None:
        raw_tt = getattr(exp, "raw_two_theta", None)
        raw_int = getattr(exp, "raw_intensity", None)
        if raw_tt and raw_int:
            two_theta_obs = np.array(raw_tt)
            intensity_obs = np.array(raw_int)

    if two_theta_obs is None or intensity_obs is None:
        raise HTTPException(status_code=400, detail="No parsed data available for refinement")

    if len(two_theta_obs) < 10:
        raise HTTPException(status_code=400, detail="Insufficient data points for refinement")

    # Gather CIF data for selected phases
    phase_cifs = []
    for phase_entry in selected_phases:
        cod_id = phase_entry.get("cod_id", "")
        parsed_data = phase_entry.get("parsed_data")
        if not parsed_data and cod_id:
            # Try to get from reference engine cache (use async version)
            parsed_data = await container.reference_engine.get_parsed_cif_async(cod_id)
        if not parsed_data:
            logger.warning("Could not get CIF data for %s, skipping", cod_id)
            continue

        # Also get raw CIF content for pymatgen-based pattern generation
        cif_content = phase_entry.get("_cif_content")
        if not cif_content and cod_id and phase_entry.get("source_provider") != "LocalCOD":
            cif_content = await container.reference_engine.get_or_download_cif_async(cod_id)

        # Build the phase dict with both parsed data and raw CIF content
        phase_dict = dict(parsed_data)
        if cif_content:
            phase_dict["_cif_content"] = cif_content
        phase_cifs.append(phase_dict)

    if not phase_cifs:
        raise HTTPException(
            status_code=400,
            detail="Could not load CIF data for any selected phases"
        )

    # Run real Rietveld refinement
    rietveld_svc = RietveldService(wavelength=wavelength)
    try:
        refinement_result = rietveld_svc.refine(
            two_theta_obs=two_theta_obs,
            intensity_obs=intensity_obs,
            phase_cifs=phase_cifs,
            wavelength=wavelength,
        )
    except Exception as e:
        logger.error("Rietveld refinement failed: %s", e)
        raise HTTPException(status_code=500, detail="Rietveld refinement failed. Check the input data and try again.")

    if not refinement_result.success:
        raise HTTPException(status_code=400, detail=refinement_result.message)

    # Build response data
    params = refinement_result.parameters
    rietveld_result = {
        "status": "completed",
        "workflow": request.workflow,
        "message": refinement_result.message,
        "r_wp": refinement_result.r_wp,
        "r_p": refinement_result.r_p,
        "r_exp": refinement_result.r_exp,
        "chi_squared": refinement_result.chi_squared,
        "gof": refinement_result.gof,
        "iterations": refinement_result.iterations,
        "parameters": {
            "scale": params.scale if params else None,
            "zero_shift": params.zero_shift if params else None,
            "background_coeffs": params.background_coeffs if params else [],
            "U": params.U if params else None,
            "V": params.V if params else None,
            "W": params.W if params else None,
            "phase_fractions": params.phase_fractions if params else [],
        },
        "patterns": {
            "two_theta": refinement_result.two_theta,
            "observed": refinement_result.observed,
            "calculated": refinement_result.calculated,
            "difference": refinement_result.difference,
            "background": refinement_result.background,
        },
        "phases_used": refinement_result.phases_used,
        "bragg_markers": refinement_result.bragg_markers,
        "refinement_history": refinement_result.refinement_history,
    }

    exp.selected_refinement_phases = selected_phases
    exp.rietveld_results = rietveld_result
    exp.status = "Refined"
    exp.add_history("rietveld_refinement", {
        "workflow": request.workflow,
        "phases_count": len(selected_phases),
        "r_wp": refinement_result.r_wp,
        "r_p": refinement_result.r_p,
        "chi_squared": refinement_result.chi_squared,
        "gof": refinement_result.gof,
        "iterations": refinement_result.iterations,
    })
    await container.uow.experiments.update(exp)

    return RietveldResponse(
        success=True,
        message=refinement_result.message,
        phases_used=refinement_result.phases_used,
        rietveld_results=rietveld_result,
    )


# ── Helpers ────────────────────────────────────────────────────────

def _experiment_to_response(exp) -> ExperimentDetailResponse:
    raw_tt = getattr(exp, "raw_two_theta", None)
    raw_int = getattr(exp, "raw_intensity", None)
    if raw_tt and len(raw_tt) > 10000:
        step = max(1, len(raw_tt) // 10000)
        raw_tt = [raw_tt[i] for i in range(0, len(raw_tt), step)]
        raw_int = [raw_int[i] for i in range(0, len(raw_int), step)]

    return ExperimentDetailResponse(
        id=str(exp.id),
        project_id=str(exp.project_id) if exp.project_id else None,
        name=exp.name,
        description=exp.description,
        material=exp.material,
        status=exp.status,
        file_ids=exp.file_ids,
        primary_file_id=exp.primary_file_id,
        has_pattern_data=exp.has_pattern_data,
        has_crystal_structure=exp.has_crystal_structure,
        data_points=exp.data_points,
        two_theta_range=exp.two_theta_range,
        wavelength_angstrom=exp.wavelength_angstrom,
        raw_two_theta=raw_tt,
        raw_intensity=raw_int,
        job_ids=[str(jid) for jid in exp.job_ids],
        has_results=exp.has_results,
        candidate_phases=exp.candidate_phases,
        cif_files=exp.cif_files,
        selected_refinement_phases=exp.selected_refinement_phases,
        rietveld_results=exp.rietveld_results,
        detected_peaks=getattr(exp, "detected_peaks", []),
        pipeline_stages=getattr(exp, "pipeline_stages", []),
        analysis_history=exp.analysis_history,
        metadata={
            "instrument": exp.metadata.instrument,
            "radiation_type": exp.metadata.radiation_type,
            "wavelength_angstrom": exp.metadata.wavelength_angstrom,
            "temperature_k": exp.metadata.temperature_k,
            "notes": exp.metadata.notes,
            **(exp.metadata.custom or {}),
        },
        created_at=exp.created_at.isoformat(),
        updated_at=exp.updated_at.isoformat(),
    )


# ── Pipeline Endpoint ─────────────────────────────────────────────

@router.post("/{experiment_id}/pipeline", response_model=PipelineResponse)
async def run_pipeline(
    experiment_id: str,
    request: PipelineRequest,
    container=Depends(get_container),
):
    """Run the scientific processing pipeline.

    Stages: background_correction → ka2_stripping → noise_reduction →
    intensity_normalization → peak_detection → phase_identification →
    candidate_selection → rietveld_refinement

    Each stage consumes the output of the previous stage.
    All stages are tracked in experiment.pipeline_stages.
    """
    exp = await container.uow.experiments.get_by_id(UUID(experiment_id))
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    from backend.services.scientific_pipeline import ScientificPipeline
    pipeline = ScientificPipeline(
        reference_engine=container.reference_engine,
        upload_service=container.upload_service,
    )

    result = await pipeline.run_full_pipeline(
        experiment=exp,
        stages_to_run=request.stages,
        stage_params=request.stage_params,
    )

    # Update pipeline_stages on experiment
    exp.pipeline_stages = [
        s for s in exp.analysis_history
        if s.get("stage_id")
    ]

    exp.has_results = bool(exp.rietveld_results or exp.candidate_phases)
    if exp.rietveld_results:
        exp.status = "Refined"
    elif exp.candidate_phases:
        exp.status = "Analyzed"
    else:
        exp.status = "Processing"

    await container.uow.experiments.update(exp)

    return PipelineResponse(
        success=result["success"],
        message=f"Pipeline: {len(result['completed_stages'])} stages completed",
        completed_stages=result["completed_stages"],
        results=result["results"],
    )


@router.get("/{experiment_id}/pipeline/stages")
async def get_pipeline_stages(experiment_id: str, container=Depends(get_container)):
    """Get the pipeline stage definitions and current status."""
    from backend.services.scientific_pipeline import ScientificPipeline
    pipeline = ScientificPipeline()

    exp = await container.uow.experiments.get_by_id(UUID(experiment_id))
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    stage_defs = pipeline.get_stage_definitions()
    completed_stages = {
        s.get("stage_id"): s
        for s in getattr(exp, "pipeline_stages", [])
    }

    enriched = []
    for stage_def in stage_defs:
        stage_id = stage_def["id"]
        history = completed_stages.get(stage_id)
        enriched.append({
            **stage_def,
            "status": history.get("status", "pending") if history else "pending",
            "completed_at": history.get("completed_at") if history else None,
            "duration_seconds": history.get("duration_seconds") if history else None,
            "error": history.get("error") if history else None,
        })

    return {"stages": enriched}
