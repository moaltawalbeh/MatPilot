from typing import Dict, Any, List
from ...scientific_engine.raman.engine import RamanComputationEngine
from ...infrastructure.reference_db.connectors.raman_rruff import RRUFFConnector
from ..validation.raman_validator import RamanValidator
from ..ai.scientists.raman_scientist import RamanScientistAgent
from ...domain.entities.instruments.raman_experiment import RamanExperiment
import logging

logger = logging.getLogger(__name__)

class RamanProcessingPipeline:
    """
    Orchestrates the entire Raman scientific workflow.
    """
    
    def __init__(self):
        self.engine = RamanComputationEngine()
        self.reference_db = RRUFFConnector()
        self.validator = RamanValidator()
        self.ai_scientist = RamanScientistAgent()
        
    def process_experiment(self, experiment: RamanExperiment) -> RamanExperiment:
        if not experiment.raw_raman_shift or not experiment.raw_intensity:
            logger.error("No raw data found in experiment")
            return experiment
            
        logger.info(f"Starting Raman Pipeline for {experiment.id}")
        
        # 1. Scientific Computation
        despiked = self.engine.remove_cosmic_rays(experiment.raw_raman_shift, experiment.raw_intensity)
        fluor_corrected = self.engine.fluorescence_correction(experiment.raw_raman_shift, despiked)
        peaks = self.engine.detect_phonons(experiment.raw_raman_shift, fluor_corrected)
        
        computed_results = {
            "processed_intensity": fluor_corrected,
            "peaks": peaks,
            "fluorescence_level": sum(experiment.raw_intensity) - sum(fluor_corrected) # Mock metric
        }
        
        # 2. Validation
        raw_data = {"intensity": experiment.raw_intensity}
        validation_result = self.validator.validate(raw_data, computed_results)
        
        experiment.fluorescence_background_level = validation_result.metrics.get("fluorescence_estimate")
        
        # 3. RDL Matching
        matches = self.reference_db.search({"shifts": [p["raman_shift_cm1"] for p in peaks[:5]]})
        
        # 4. AI
        ai_result = self.ai_scientist.analyze(
            validated_results=computed_results,
            validation_metrics=validation_result.to_dict(),
            reference_matches=matches
        )
        
        # 5. Entity Updates
        experiment.processed_intensity = fluor_corrected
        experiment.detected_peaks = peaks
        experiment.library_matches = matches
        experiment.status = "Analyzed"
        
        experiment.add_history(action="Pipeline Execution", details={
            "validation": validation_result.to_dict(),
            "ai_interpretation": ai_result
        })
        
        return experiment
