from typing import Dict, Any, List
from .base_validator import IScientificValidator, ValidationResult

class XRDValidator(IScientificValidator):
    """
    Validates XRD computation outputs before they reach the AI.
    """
    
    def validate(self, raw_data: Dict[str, Any], computed_results: Dict[str, Any]) -> ValidationResult:
        flags = []
        is_valid = True
        
        # Check Rietveld Refinement metrics
        rietveld = computed_results.get("rietveld_results")
        if rietveld:
            chi_sq = rietveld.get("chi_squared", 0)
            if chi_sq > 10.0:
                flags.append("High Chi-Squared (>10) detected. Rietveld refinement likely diverged.")
                is_valid = False
            elif chi_sq < 0.5:
                flags.append("Suspiciously low Chi-Squared (<0.5). Model may be over-parameterized.")
                
            r_wp = rietveld.get("R_wp", 0)
            if r_wp > 15.0:
                flags.append("High R_wp detected. Poor fit to the profile.")
                
            # Check phase fractions sum to roughly 100%
            fractions = rietveld.get("phase_fractions", {})
            total_fraction = sum(fractions.values())
            if not (95.0 <= total_fraction <= 105.0):
                flags.append(f"Phase fractions sum to {total_fraction}%, expected ~100%.")
                is_valid = False
                
        # Confidence score based on Chi_sq
        confidence = 1.0
        if flags:
            confidence = 0.5
        if not is_valid:
            confidence = 0.1
            
        return ValidationResult(
            is_valid=is_valid,
            confidence_score=confidence,
            flags=flags,
            metrics={"chi_squared": chi_sq if rietveld else None}
        )
