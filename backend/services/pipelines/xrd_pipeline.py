from typing import Dict, Any, List
from ...scientific_engine.xrd.engine import XRDComputationEngine
from ...infrastructure.reference_db.connectors.xrd_cod import CODConnector
from ..validation.xrd_validator import XRDValidator
from ..ai.scientists.xrd_scientist import XRDScientistAgent
from ...domain.entities.instruments.xrd_experiment import XRDExperiment
import logging

logger = logging.getLogger(__name__)

class XRDProcessingPipeline:
    """
    Orchestrates the entire XRD scientific workflow.
    """
    
    def __init__(self):
        self.engine = XRDComputationEngine()
        self.reference_db = CODConnector()
        self.validator = XRDValidator()
        self.ai_scientist = XRDScientistAgent()
        
    def process_experiment(self, experiment: XRDExperiment) -> XRDExperiment:
        """
        Executes the official V2 XRD pipeline.
        """
        if not experiment.raw_two_theta or not experiment.raw_intensity:
            logger.error("No raw data found in experiment")
            return experiment
            
        logger.info(f"Starting XRD Pipeline for {experiment.id}")
        
        # 1. Scientific Computation
        # Background Stripping
        stripped_intensity = self.engine.background_stripping(experiment.raw_two_theta, experiment.raw_intensity)
        
        # Peak Detection
        peaks = self.engine.detect_bragg_peaks(experiment.raw_two_theta, stripped_intensity)
        
        # In a real app we'd fetch CIFs and run a real Rietveld here.
        # We simulate the engine output.
        rietveld_output = self.engine.execute_rietveld_refinement(experiment.raw_two_theta, stripped_intensity, [])
        
        computed_results = {
            "processed_intensity": stripped_intensity,
            "peaks": peaks,
            "rietveld_results": rietveld_output
        }
        
        # 2. Scientific Validation
        raw_data = {"intensity": experiment.raw_intensity}
        validation_result = self.validator.validate(raw_data, computed_results)
        
        experiment.goodness_of_fit = validation_result.metrics.get("chi_squared")
        
        # 3. Reference Database Matching (RDL)
        matches = self.reference_db.search({"d_spacing_estimates": [self.engine.calculate_d_spacing(p["two_theta"]) for p in peaks[:3]]})
        
        # 4. AI Interpretation
        ai_result = self.ai_scientist.analyze(
            validated_results=computed_results,
            validation_metrics=validation_result.to_dict(),
            reference_matches=matches
        )
        
        # 5. Store Results on Entity
        experiment.processed_intensity = stripped_intensity
        experiment.detected_peaks = peaks
        experiment.rietveld_results = rietveld_output
        experiment.candidate_phases = matches
        experiment.status = "Analyzed"
        
        experiment.add_history(action="Pipeline Execution", details={
            "validation": validation_result.to_dict(),
            "ai_interpretation": ai_result
        })
        
        return experiment
