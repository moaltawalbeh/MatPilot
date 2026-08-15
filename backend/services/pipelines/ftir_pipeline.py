from typing import Dict, Any, List
from ...scientific_engine.ftir.engine import FTIRComputationEngine
from ...infrastructure.reference_db.connectors.ftir_openspecy import OpenSpecyConnector
from ..validation.ftir_validator import FTIRValidator
from ..ai.scientists.ftir_scientist import FTIRScientistAgent
from ...domain.entities.instruments.ftir_experiment import FTIRExperiment
import logging

logger = logging.getLogger(__name__)

class FTIRProcessingPipeline:
    """
    Orchestrates the entire FTIR scientific workflow.
    """
    
    def __init__(self):
        self.engine = FTIRComputationEngine()
        self.reference_db = OpenSpecyConnector()
        self.validator = FTIRValidator()
        self.ai_scientist = FTIRScientistAgent()
        
    def process_experiment(self, experiment: FTIRExperiment) -> FTIRExperiment:
        """
        Executes the official V2 FTIR pipeline.
        """
        if not experiment.raw_wavenumbers or not experiment.raw_transmittance:
            logger.error("No raw data found in experiment")
            return experiment
            
        logger.info(f"Starting FTIR Pipeline for {experiment.id}")
        
        # 1. Scientific Computation
        # Baseline Correction
        corrected_t = self.engine.baseline_correction(experiment.raw_wavenumbers, experiment.raw_transmittance)
        
        # Noise Reduction
        smoothed_t = self.engine.smooth_spectrum(experiment.raw_wavenumbers, corrected_t)
        
        # Peak Detection
        peaks = self.engine.detect_absorption_bands(experiment.raw_wavenumbers, smoothed_t)
        
        # Functional Group Assignment
        groups = self.engine.assign_functional_groups(peaks)
        
        computed_results = {
            "smoothed_transmittance": smoothed_t,
            "peaks": groups
        }
        
        # 2. Scientific Validation
        raw_data = {"transmittance": experiment.raw_transmittance}
        validation_result = self.validator.validate(raw_data, computed_results)
        
        experiment.signal_to_noise_ratio = validation_result.metrics.get("snr_db")
        
        # 3. Reference Database Matching (RDL)
        # We query the DB based on the top peaks
        top_peaks = [p.get("wavenumber_cm1", p.get("wavenumber", 0)) for p in groups[:5]]
        matches = self.reference_db.search({"peaks": top_peaks})
        
        # 4. AI Interpretation
        ai_result = self.ai_scientist.analyze(
            validated_results=computed_results,
            validation_metrics=validation_result.to_dict(),
            reference_matches=matches
        )
        
        # 5. Store Results on Entity
        experiment.processed_transmittance = smoothed_t
        experiment.detected_peaks = groups
        experiment.functional_groups = [p for p in groups if p.get("assigned_group") != "Unknown"]
        experiment.library_matches = matches
        experiment.status = "Analyzed"
        
        # In a real database we'd save ai_result to a separate AI_Interpretations table
        # and store the ID on the experiment.
        experiment.add_history(action="Pipeline Execution", details={
            "validation": validation_result.to_dict(),
            "ai_interpretation": ai_result
        })
        
        return experiment
