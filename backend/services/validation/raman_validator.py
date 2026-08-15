from typing import Dict, Any, List
from .base_validator import IScientificValidator, ValidationResult

class RamanValidator(IScientificValidator):
    """
    Validates Raman computation outputs before they reach the AI.
    """
    
    def validate(self, raw_data: Dict[str, Any], computed_results: Dict[str, Any]) -> ValidationResult:
        flags = []
        is_valid = True
        
        # Check fluorescence levels
        fluor_level = computed_results.get("fluorescence_level", 0.0)
        if fluor_level > 5000:
            flags.append(f"Extremely high fluorescence detected ({fluor_level}). Raman signal may be swamped.")
            
        # Check peak widths (FWHM)
        peaks = computed_results.get("peaks", [])
        if not peaks:
            flags.append("No Raman active modes detected. Sample may be highly symmetric, metallic, or burned.")
            
        confidence = 1.0 if not flags else 0.6
        if fluor_level > 20000:
            is_valid = False
            confidence = 0.1
            
        return ValidationResult(
            is_valid=is_valid,
            confidence_score=confidence,
            flags=flags,
            metrics={"fluorescence_estimate": fluor_level}
        )
