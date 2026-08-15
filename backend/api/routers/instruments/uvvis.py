from fastapi import APIRouter, HTTPException, UploadFile, File
from uuid import UUID
from typing import Dict, Any, List
import numpy as np

from ....domain.entities.instruments.uvvis_experiment import UVVisExperiment
from ....services.pipelines.uvvis_pipeline import UVVisProcessingPipeline
from ....parsers.uvvis_parser import UVVisParser

router = APIRouter(prefix="/v2/instruments/uvvis", tags=["UV-Vis Instrument"])
pipeline = UVVisProcessingPipeline()
parser = UVVisParser()

_uvvis_db: Dict[UUID, UVVisExperiment] = {}

@router.post("/experiments", response_model=Dict[str, Any])
async def create_uvvis_experiment(name: str, workspace_id: str, measurement_mode: str = "Transmission"):
    exp = UVVisExperiment(name=name, workspace_id=UUID(workspace_id))
    exp.measurement_mode = measurement_mode
    _uvvis_db[exp.id] = exp
    return {"id": exp.id, "status": exp.status, "name": exp.name, "measurement_mode": exp.measurement_mode}

@router.get("/experiments/{experiment_id}")
async def get_uvvis_experiment(experiment_id: UUID):
    if experiment_id not in _uvvis_db:
        raise HTTPException(status_code=404, detail="UV-Vis Experiment not found")
    exp = _uvvis_db[experiment_id]
    return {
        "id": exp.id,
        "name": exp.name,
        "status": exp.status,
        "measurement_mode": getattr(exp, "measurement_mode", "Transmission"),
        "raw_wavelength_nm": exp.raw_wavelength_nm,
        "raw_absorbance": exp.raw_absorbance,
        "tauc_energy_ev": exp.tauc_energy_ev,
        "tauc_quantity": exp.tauc_quantity,
        "band_gap_ev": exp.band_gap_ev,
        "band_gap_type": exp.band_gap_type,
        "linear_fit_r_squared": getattr(exp, "linear_fit_r_squared", None),
        "library_matches": exp.library_matches,
        "analysis_history": exp.analysis_history
    }

@router.post("/experiments/{experiment_id}/upload")
async def upload_uvvis_file(experiment_id: UUID, file: UploadFile = File(...)):
    if experiment_id not in _uvvis_db:
        raise HTTPException(status_code=404, detail="UV-Vis Experiment not found")
    exp = _uvvis_db[experiment_id]
    content = await file.read()
    
    parsed = parser.parse(content, file.filename)
    exp.raw_wavelength_nm = parsed["wavelength_nm"]
    exp.raw_absorbance = parsed["signal_values"]
    if "measurement_mode" in parsed:
        exp.measurement_mode = parsed["measurement_mode"]
    exp.status = "Data Uploaded"
    return {"message": "UV-Vis file uploaded successfully", "data_points": parsed["data_points"]}

@router.post("/experiments/{experiment_id}/upload-mock-data")
async def upload_mock_uvvis_data(experiment_id: UUID, mode: str = "Reflectance"):
    if experiment_id not in _uvvis_db:
        raise HTTPException(status_code=404, detail="UV-Vis Experiment not found")
        
    exp = _uvvis_db[experiment_id]
    exp.measurement_mode = mode
    wavelength = np.linspace(250, 800, 500).tolist()
    
    # Generate mock absorption edge around 387 nm (~3.2 eV for TiO2)
    ev = 1239.8 / np.array(wavelength)
    signal = 10.0 + 80.0 / (1.0 + np.exp((ev - 3.20) / 0.15))
    
    exp.raw_wavelength_nm = wavelength
    exp.raw_absorbance = signal.tolist()
    exp.status = "Data Uploaded"
    return {"message": "Mock UV-Vis data loaded", "data_points": len(wavelength), "mode": mode}

@router.post("/experiments/{experiment_id}/process")
async def process_uvvis_data(experiment_id: UUID, transition_type: str = "Direct"):
    if experiment_id not in _uvvis_db:
        raise HTTPException(status_code=404, detail="UV-Vis Experiment not found")
        
    exp = _uvvis_db[experiment_id]
    exp.band_gap_type = transition_type
    if not exp.raw_wavelength_nm:
        raise HTTPException(status_code=400, detail="No raw data to process")
        
    processed_exp = pipeline.process_experiment(exp)
    
    return {
        "status": processed_exp.status,
        "band_gap_ev": processed_exp.band_gap_ev,
        "fit_r_squared": getattr(processed_exp, "linear_fit_r_squared", None),
        "library_matches": processed_exp.library_matches,
        "ai_analysis": processed_exp.analysis_history[-1]["details"].get("ai_interpretation") if processed_exp.analysis_history else None
    }

