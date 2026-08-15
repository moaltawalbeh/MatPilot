from fastapi import APIRouter, HTTPException, UploadFile, File
from uuid import UUID
from typing import Dict, Any, List
import numpy as np

from ....domain.entities.instruments.raman_experiment import RamanExperiment
from ....services.pipelines.raman_pipeline import RamanProcessingPipeline
from ....parsers.raman_parser import RamanParser

router = APIRouter(prefix="/v2/instruments/raman", tags=["Raman Instrument"])
pipeline = RamanProcessingPipeline()
parser = RamanParser()

_raman_db: Dict[UUID, RamanExperiment] = {}

@router.post("/experiments", response_model=Dict[str, Any])
async def create_raman_experiment(name: str, workspace_id: str):
    exp = RamanExperiment(name=name, workspace_id=UUID(workspace_id))
    _raman_db[exp.id] = exp
    return {"id": exp.id, "status": exp.status, "name": exp.name}

@router.get("/experiments/{experiment_id}")
async def get_raman_experiment(experiment_id: UUID):
    if experiment_id not in _raman_db:
        raise HTTPException(status_code=404, detail="Raman Experiment not found")
    exp = _raman_db[experiment_id]
    return {
        "id": exp.id,
        "name": exp.name,
        "status": exp.status,
        "raw_raman_shift": exp.raw_raman_shift,
        "raw_intensity": exp.raw_intensity,
        "processed_intensity": exp.processed_intensity,
        "detected_peaks": exp.detected_peaks,
        "library_matches": exp.library_matches,
        "analysis_history": exp.analysis_history
    }

@router.post("/experiments/{experiment_id}/upload")
async def upload_raman_file(experiment_id: UUID, file: UploadFile = File(...)):
    if experiment_id not in _raman_db:
        raise HTTPException(status_code=404, detail="Raman Experiment not found")
    exp = _raman_db[experiment_id]
    content = await file.read()
    
    parsed = parser.parse(content, file.filename)
    exp.raw_raman_shift = parsed["raman_shift"]
    exp.raw_intensity = parsed["intensity"]
    exp.status = "Data Uploaded"
    return {"message": "Raman file uploaded successfully", "data_points": parsed["data_points"]}

@router.post("/experiments/{experiment_id}/upload-mock-data")
async def upload_mock_raman_data(experiment_id: UUID):
    if experiment_id not in _raman_db:
        raise HTTPException(status_code=404, detail="Raman Experiment not found")
        
    exp = _raman_db[experiment_id]
    raman_shift = np.linspace(100, 3200, 1000).tolist()
    intensity = np.random.normal(50, 5, 1000)
    
    # Add mock D-band (~1350) and G-band (~1580)
    idx_d = np.abs(np.array(raman_shift) - 1350).argmin()
    idx_g = np.abs(np.array(raman_shift) - 1580).argmin()
    intensity[idx_d-10:idx_d+10] += 300 * np.exp(-0.5 * ((np.linspace(100, 3200, 1000)[idx_d-10:idx_d+10] - 1350) / 15)**2)
    intensity[idx_g-10:idx_g+10] += 600 * np.exp(-0.5 * ((np.linspace(100, 3200, 1000)[idx_g-10:idx_g+10] - 1580) / 15)**2)
    
    exp.raw_raman_shift = raman_shift
    exp.raw_intensity = intensity.tolist()
    exp.status = "Data Uploaded"
    return {"message": "Mock Raman data loaded", "data_points": len(raman_shift)}

@router.post("/experiments/{experiment_id}/process")
async def process_raman_data(experiment_id: UUID):
    if experiment_id not in _raman_db:
        raise HTTPException(status_code=404, detail="Raman Experiment not found")
        
    exp = _raman_db[experiment_id]
    if not exp.raw_raman_shift:
        raise HTTPException(status_code=400, detail="No raw data to process")
        
    processed_exp = pipeline.process_experiment(exp)
    
    return {
        "status": processed_exp.status,
        "fluorescence": processed_exp.fluorescence_background_level,
        "detected_peaks": processed_exp.detected_peaks,
        "library_matches": processed_exp.library_matches,
        "ai_analysis": processed_exp.analysis_history[-1]["details"].get("ai_interpretation") if processed_exp.analysis_history else None
    }

