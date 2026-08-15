from typing import Dict, Any, List
from .base_validator import IScientificValidator, ValidationResult
import numpy as np

class FTIRValidator(IScientificValidator):
    """
    Validates FTIR computation outputs before they reach the AI.
    """
    
    def validate(self, raw_data: Dict[str, Any], computed_results: Dict[str, Any]) -> ValidationResult:
        flags = []
        is_valid = True
        
        transmittance = raw_data.get("transmittance", [])
        if not transmittance:
            return ValidationResult(False, 0.0, ["Missing Transmittance Data"], {})
            
        t_arr = np.array(transmittance)
        
        # Check 1: Transmittance bounds
        if np.any(t_arr < -5.0) or np.any(t_arr > 110.0):
            flags.append("Transmittance data out of physical bounds (0-100%). Check normalization.")
            is_valid = False
            
        # Check 2: Signal to Noise Ratio estimation
        # Very rough estimation: variance of difference between raw and smoothed
        smoothed = computed_results.get("smoothed_transmittance", [])
        snr = 0.0
        if smoothed:
            s_arr = np.array(smoothed)
            noise_variance = np.var(t_arr - s_arr)
            signal_variance = np.var(s_arr)
            if noise_variance > 0:
                snr = 10 * np.log10(signal_variance / noise_variance)
            
            if snr < 10.0:
                flags.append("Very low Signal-to-Noise Ratio detected. Spectral features may be unreliable.")
        
        # Check 3: Processed peaks sanity check
        peaks = computed_results.get("peaks", [])
        if len(peaks) > 100:
            flags.append("Excessive number of peaks detected (>100). Likely noise fitting.")
            is_valid = False
            
        # Confidence score based on SNR and flags
        confidence = 1.0 if not flags else 0.6
        if not is_valid:
            confidence = 0.1
            
        return ValidationResult(
            is_valid=is_valid,
            confidence_score=confidence,
            flags=flags,
            metrics={"snr_db": snr}
        )
