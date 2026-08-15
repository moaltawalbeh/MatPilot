from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from uuid import UUID
from typing import Dict, Any, Optional
import numpy as np

from ....domain.entities.instruments.xrd_experiment import XRDExperiment
from ....services.pipelines.xrd_pipeline import XRDProcessingPipeline

router = APIRouter(prefix="/v2/instruments/xrd", tags=["XRD Instrument"])
pipeline = XRDProcessingPipeline()

_xrd_db: Dict[UUID, XRDExperiment] = {}

@router.post("/experiments", response_model=Dict[str, Any])
async def create_xrd_experiment(name: str, workspace_id: str):
    exp = XRDExperiment(name=name, workspace_id=UUID(workspace_id))
    _xrd_db[exp.id] = exp
    return {"id": exp.id, "status": exp.status, "name": exp.name}

@router.get("/experiments/{experiment_id}")
async def get_xrd_experiment(experiment_id: UUID):
    if experiment_id not in _xrd_db:
        raise HTTPException(status_code=404, detail="XRD Experiment not found")
    exp = _xrd_db[experiment_id]
    return {
        "id": exp.id,
        "name": exp.name,
        "status": exp.status,
        "radiation_type": exp.radiation_type,
        "wavelength_angstrom": exp.wavelength_angstrom,
        "raw_two_theta": exp.raw_two_theta,
        "raw_intensity": exp.raw_intensity,
        "processed_intensity": exp.processed_intensity,
        "detected_peaks": exp.detected_peaks,
        "rietveld_results": exp.rietveld_results,
        "candidate_phases": exp.candidate_phases,
        "analysis_history": exp.analysis_history
    }

@router.post("/experiments/{experiment_id}/upload")
async def upload_xrd_file(experiment_id: UUID, file: UploadFile = File(...)):
    if experiment_id not in _xrd_db:
        raise HTTPException(status_code=404, detail="XRD Experiment not found")
    exp = _xrd_db[experiment_id]
    content = await file.read()
    
    # Parse text/xy/raw diffractogram format
    lines = content.decode("utf-8", errors="ignore").strip().split("\n")
    two_theta = []
    intensity = []
    for line in lines:
        parts = line.strip().replace(",", " ").split()
        if len(parts) >= 2:
            try:
                two_theta.append(float(parts[0]))
                intensity.append(float(parts[1]))
            except ValueError:
                continue

    if len(two_theta) < 2:
        raise HTTPException(status_code=400, detail="XRD file contains fewer than two readable 2θ/intensity rows")

    exp.raw_two_theta = two_theta
    exp.raw_intensity = intensity
    exp.status = "Data Uploaded"
    return {"message": "XRD file uploaded successfully", "data_points": len(two_theta)}

@router.post("/experiments/{experiment_id}/upload-mock-data")
async def upload_mock_xrd_data(experiment_id: UUID):
    if experiment_id not in _xrd_db:
        raise HTTPException(status_code=404, detail="XRD Experiment not found")
        
    exp = _xrd_db[experiment_id]
    two_theta = np.linspace(10, 90, 1000).tolist()
    intensity = np.random.normal(100, 10, 1000)
    idx_peak = np.abs(np.array(two_theta) - 25.3).argmin()
    intensity[idx_peak-2:idx_peak+2] += [50, 400, 50, 10]
    
    exp.raw_two_theta = two_theta
    exp.raw_intensity = intensity.tolist()
    exp.status = "Data Uploaded"
    return {"message": "Mock XRD data loaded", "data_points": len(two_theta)}

@router.post("/experiments/{experiment_id}/process")
async def process_xrd_data(experiment_id: UUID):
    if experiment_id not in _xrd_db:
        raise HTTPException(status_code=404, detail="XRD Experiment not found")
        
    exp = _xrd_db[experiment_id]
    if not exp.raw_two_theta:
        raise HTTPException(status_code=400, detail="No raw data to process")
        
    processed_exp = pipeline.process_experiment(exp)
    
    return {
        "status": processed_exp.status,
        "chi_squared": processed_exp.goodness_of_fit,
        "peaks_found": len(processed_exp.detected_peaks),
        "detected_peaks": processed_exp.detected_peaks,
        "candidate_phases": processed_exp.candidate_phases,
        "rietveld_results": processed_exp.rietveld_results,
        "ai_analysis": processed_exp.analysis_history[-1]["details"].get("ai_interpretation") if processed_exp.analysis_history else None
    }
