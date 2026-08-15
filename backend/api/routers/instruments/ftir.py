from fastapi import APIRouter, HTTPException, UploadFile, File
from uuid import UUID
from typing import Dict, Any, List
import numpy as np

from ....domain.entities.instruments.ftir_experiment import FTIRExperiment
from ....services.pipelines.ftir_pipeline import FTIRProcessingPipeline
from ....parsers.ftir_parser import FTIRParser

router = APIRouter(prefix="/v2/instruments/ftir", tags=["FTIR Instrument"])
pipeline = FTIRProcessingPipeline()
parser = FTIRParser()

_ftir_db: Dict[UUID, FTIRExperiment] = {}

@router.post("/experiments", response_model=Dict[str, Any])
async def create_ftir_experiment(name: str, workspace_id: str):
    exp = FTIRExperiment(name=name, workspace_id=UUID(workspace_id))
    _ftir_db[exp.id] = exp
    return {"id": exp.id, "status": exp.status, "name": exp.name}

@router.get("/experiments/{experiment_id}")
async def get_ftir_experiment(experiment_id: UUID):
    if experiment_id not in _ftir_db:
        raise HTTPException(status_code=404, detail="FTIR Experiment not found")
    exp = _ftir_db[experiment_id]
    return {
        "id": exp.id,
        "name": exp.name,
        "status": exp.status,
        "raw_wavenumbers": exp.raw_wavenumbers,
        "raw_transmittance": exp.raw_transmittance,
        "processed_transmittance": exp.processed_transmittance,
        "detected_peaks": exp.detected_peaks,
        "functional_groups": exp.functional_groups,
        "library_matches": exp.library_matches,
        "analysis_history": exp.analysis_history
    }

@router.post("/experiments/{experiment_id}/upload")
async def upload_ftir_file(experiment_id: UUID, file: UploadFile = File(...)):
    if experiment_id not in _ftir_db:
        raise HTTPException(status_code=404, detail="FTIR Experiment not found")
    exp = _ftir_db[experiment_id]
    content = await file.read()
    
    parsed = parser.parse(content, file.filename)
    exp.raw_wavenumbers = parsed["wavenumbers"]
    exp.raw_transmittance = parsed["transmittance"]
    exp.status = "Data Uploaded"
    return {"message": "FTIR file uploaded successfully", "data_points": parsed["data_points"]}

@router.post("/experiments/{experiment_id}/upload-mock-data")
async def upload_mock_ftir_data(experiment_id: UUID):
    if experiment_id not in _ftir_db:
        raise HTTPException(status_code=404, detail="FTIR Experiment not found")
        
    exp = _ftir_db[experiment_id]
    wavenumbers = np.linspace(4000, 400, 1000).tolist()
    transmittance = np.random.normal(90, 1, 1000)
    
    idx_oh = np.abs(np.array(wavenumbers) - 3300).argmin()
    transmittance[idx_oh-10:idx_oh+10] -= 40
    idx_co = np.abs(np.array(wavenumbers) - 1700).argmin()
    transmittance[idx_co-5:idx_co+5] -= 60
    
    exp.raw_wavenumbers = wavenumbers
    exp.raw_transmittance = transmittance.tolist()
    exp.status = "Data Uploaded"
    return {"message": "Mock FTIR data loaded", "data_points": len(wavenumbers)}

@router.post("/experiments/{experiment_id}/process")
async def process_ftir_data(experiment_id: UUID):
    if experiment_id not in _ftir_db:
        raise HTTPException(status_code=404, detail="FTIR Experiment not found")
        
    exp = _ftir_db[experiment_id]
    if not exp.raw_wavenumbers:
        raise HTTPException(status_code=400, detail="No raw data to process")
        
    processed_exp = pipeline.process_experiment(exp)
    
    return {
        "status": processed_exp.status,
        "signal_to_noise_db": processed_exp.signal_to_noise_ratio,
        "peaks_found": len(processed_exp.detected_peaks),
        "detected_peaks": processed_exp.detected_peaks,
        "functional_groups": processed_exp.functional_groups,
        "library_matches": processed_exp.library_matches,
        "ai_analysis": processed_exp.analysis_history[-1]["details"].get("ai_interpretation") if processed_exp.analysis_history else None
    }

@router.get("/experiments/{experiment_id}/results")
async def get_ftir_results(experiment_id: UUID):
    if experiment_id not in _ftir_db:
        raise HTTPException(status_code=404, detail="FTIR Experiment not found")
    exp = _ftir_db[experiment_id]
    return {
        "wavenumbers": exp.raw_wavenumbers,
        "raw_transmittance": exp.raw_transmittance,
        "processed_transmittance": exp.processed_transmittance,
        "peaks": exp.detected_peaks,
        "functional_groups": exp.functional_groups
    }

