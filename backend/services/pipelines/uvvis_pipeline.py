from typing import Dict, Any, List
from ...scientific_engine.uvvis.engine import UVVisComputationEngine
from ...infrastructure.reference_db.connectors.uvvis_photochem import PhotochemConnector
from ..validation.uvvis_validator import UVVisValidator
from ..ai.scientists.uvvis_scientist import UVVisScientistAgent
from ...domain.entities.instruments.uvvis_experiment import UVVisExperiment
import logging

logger = logging.getLogger(__name__)

class UVVisProcessingPipeline:
    """
    Orchestrates the entire UV-Vis optical spectroscopy workflow.
    Supports Absorbance, Transmittance, and Diffuse Reflectance (Kubelka-Munk) modes.
    """
    
    def __init__(self):
        self.engine = UVVisComputationEngine()
        self.reference_db = PhotochemConnector()
        self.validator = UVVisValidator()
        self.ai_scientist = UVVisScientistAgent()
        
    def process_experiment(self, experiment: UVVisExperiment) -> UVVisExperiment:
        if not experiment.raw_wavelength_nm or not experiment.raw_absorbance:
            logger.error("No raw spectral data found in UV-Vis experiment")
            return experiment
            
        logger.info(f"Executing UV-Vis Processing Pipeline for {experiment.id}")
        
        mode = getattr(experiment, "measurement_mode", "Transmission") or "Transmission"
        raw_vals = experiment.raw_absorbance
        
        # 1. Measurement Mode Processing.  A Tauc ordinate needs an absorption
        # coefficient (or the diffuse-reflectance Kubelka-Munk proxy); raw absorbance
        # alone is not sufficient without a known optical path length.
        if mode.lower() in ["reflectance", "diffuse_reflectance", "%r"]:
            f_r = self.engine.kubelka_munk_transform(raw_vals)
            intensity_for_tauc = f_r
            tauc_input = "Kubelka-Munk F(R) from diffuse reflectance"
        elif getattr(experiment, "signal_is_absorption_coefficient", False):
            intensity_for_tauc = raw_vals
            tauc_input = "provided absorption coefficient"
        elif getattr(experiment, "optical_path_length_cm", None):
            intensity_for_tauc = [max(value, 0.0) * 2.303 / experiment.optical_path_length_cm for value in raw_vals]
            tauc_input = "absorbance converted using declared optical path length"
        else:
            intensity_for_tauc = []
            tauc_input = None
            
        # Determine transition type for Tauc plot
        transition_type = "direct_allowed"
        if getattr(experiment, "band_gap_type", "") == "Indirect":
            transition_type = "indirect_allowed"
            
        # 2. Tauc Plot & Band Gap Extrapolation
        if intensity_for_tauc:
            energy_ev, tauc_y = self.engine.generate_tauc_plot(
                experiment.raw_wavelength_nm, intensity_for_tauc, transition_type=transition_type
            )
            bandgap_results = self.engine.estimate_band_gap(energy_ev, tauc_y)
        else:
            energy_ev, tauc_y = [], []
            bandgap_results = {"band_gap_ev": None, "r_squared": 0.0, "absorption_edge_nm": None,
                               "fit_status": "INSUFFICIENT_MEASUREMENT_METADATA"}
        band_gap_ev = bandgap_results.get("band_gap_ev")
        r_squared = bandgap_results.get("r_squared", 0.0)
        
        computed_results = {
            "measurement_mode": mode,
            "band_gap_ev": band_gap_ev,
            "absorption_edge_nm": bandgap_results.get("absorption_edge_nm"),
            "linear_fit_r_squared": r_squared,
            "tauc_energy": energy_ev,
            "tauc_quantity": tauc_y,
            "fit_status": bandgap_results.get("fit_status")
            ,"tauc_input": tauc_input
        }
        
        # 3. Scientific Validation
        raw_data = {"absorbance": raw_vals, "wavelength_nm": experiment.raw_wavelength_nm}
        validation_result = self.validator.validate(raw_data, computed_results)
        
        # 4. Reference Database Layer (RDL) Matching
        matches = self.reference_db.search({"band_gap_ev": band_gap_ev})
        
        # 5. AI Scientist Interpretation
        ai_result = self.ai_scientist.analyze(
            validated_results=computed_results,
            validation_metrics=validation_result.to_dict(),
            reference_matches=matches
        )
        
        # 6. Entity State Persistence
        experiment.tauc_energy_ev = energy_ev
        experiment.tauc_quantity = tauc_y
        experiment.band_gap_ev = band_gap_ev
        experiment.linear_fit_r_squared = r_squared
        experiment.library_matches = matches
        experiment.status = "Analyzed"
        
        experiment.add_history(action="Pipeline Execution", details={
            "validation": validation_result.to_dict(),
            "ai_interpretation": ai_result
        })
        
        return experiment
