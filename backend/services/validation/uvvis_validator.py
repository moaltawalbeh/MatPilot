from typing import Dict, Any, List
from .base_validator import IScientificValidator, ValidationResult

class UVVisValidator(IScientificValidator):
    """
    Validates UV-Vis computation outputs before they reach the AI.
    """
    
    def validate(self, raw_data: Dict[str, Any], computed_results: Dict[str, Any]) -> ValidationResult:
        flags = []
        is_valid = True
        
        # Check Tauc Plot extrapolation physics bounds
        bg = computed_results.get("band_gap_ev")
        if computed_results.get("fit_status") == "INSUFFICIENT_MEASUREMENT_METADATA":
            flags.append("Band gap not calculated: provide diffuse reflectance, an absorption coefficient, or absorbance with optical path length.")
        if bg is not None:
            if bg <= 0:
                flags.append("Band gap extrapolation resulted in negative or zero energy. Review the linear fit region.")
                is_valid = False
            elif bg > 15.0:
                flags.append(f"Calculated band gap ({bg:.2f} eV) is non-physical for standard materials.")
                is_valid = False
                
        # Check absorbance bounds (Beer-Lambert linearity limits)
        abs_data = raw_data.get("absorbance", [])
        if any(a > 3.0 for a in abs_data):
            flags.append("Absorbance exceeds 3.0. The detector is likely saturated and Beer-Lambert law fails.")
            
        confidence = 1.0 if not flags else 0.5
        if not is_valid:
            confidence = 0.1
            
        return ValidationResult(
            is_valid=is_valid,
            confidence_score=confidence,
            flags=flags,
            metrics={"band_gap_estimate": bg}
        )
