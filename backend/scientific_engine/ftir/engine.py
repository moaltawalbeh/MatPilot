from typing import List, Dict, Any, Tuple
from ..core.math_utils import apply_savitzky_golay, detect_local_maxima, fit_polynomial_baseline
import numpy as np

class FTIRComputationEngine:
    """
    Scientific Computation Engine strictly for FTIR (Fourier-Transform Infrared Spectroscopy).
    Handles numerical algorithms (absorption band detection, baseline correction, 
    transmittance/absorbance conversion, wavenumber integration) without AI interaction.
    """
    
    def transmittance_to_absorbance(self, transmittance_pct: List[float]) -> List[float]:
        """
        Converts % Transmittance to Absorbance: A = 2 - log10(%T).
        Caps %T to [0.01, 100.0] to prevent mathematical instability.
        """
        t_arr = np.clip(np.array(transmittance_pct), 0.01, 100.0)
        absorbance = 2.0 - np.log10(t_arr)
        return absorbance.tolist()

    def absorbance_to_transmittance(self, absorbance: List[float]) -> List[float]:
        """
        Converts Absorbance to % Transmittance: %T = 10^(2 - A).
        """
        a_arr = np.clip(np.array(absorbance), 0.0, 5.0)
        t_pct = 10.0 ** (2.0 - a_arr)
        return t_pct.tolist()

    def smooth_spectrum(self, wavenumbers: List[float], intensity: List[float], window: int = 11, poly: int = 2) -> List[float]:
        """Applies Savitzky-Golay filtering to reduce high-frequency noise."""
        return apply_savitzky_golay(intensity, window_length=window, polyorder=poly)
        
    def baseline_correction(self, wavenumbers: List[float], transmittance: List[float], order: int = 1) -> List[float]:
        """
        Applies baseline correction for atmospheric suppression / baseline tilt.
        For transmittance (%T), T_corr = (T_obs / T_baseline) * 100.
        """
        baseline = fit_polynomial_baseline(wavenumbers, transmittance, order=order)
        t_arr = np.array(transmittance)
        b_arr = np.clip(np.array(baseline), 1e-4, None)
        
        corrected = (t_arr / b_arr) * np.max(t_arr)
        corrected = np.clip(corrected, 0.0, 100.0)
        return corrected.tolist()
        
    def detect_absorption_bands(
        self,
        wavenumbers: List[float],
        transmittance: List[float],
        prominence: float = 2.0
    ) -> List[Dict[str, Any]]:
        """
        Detects absorption bands (minima in % Transmittance / maxima in Absorbance).
        Extracts wavenumber centroid, transmittance %, absorbance, and region tag.
        """
        inverted_t = [100.0 - t for t in transmittance]
        x_peaks, y_peaks = detect_local_maxima(wavenumbers, inverted_t, prominence=prominence)
        
        peaks = []
        for x, y_inv in zip(x_peaks, y_peaks):
            y_true = 100.0 - y_inv  # Transmittance %
            absorbance_val = 2.0 - np.log10(max(y_true, 0.01))
            is_fingerprint = (x < 1500.0)

            peaks.append({
                "wavenumber_cm1": float(round(x, 2)),
                "transmittance_percent": float(round(y_true, 2)),
                "absorbance": float(round(absorbance_val, 4)),
                "is_fingerprint_region": is_fingerprint,
                "region_name": "Fingerprint Region (<1500 cm⁻¹)" if is_fingerprint else "Functional Group Region (1500-4000 cm⁻¹)"
            })
            
        # Sort by wavenumber descending (standard FTIR convention 4000 -> 400 cm⁻¹)
        peaks.sort(key=lambda p: p["wavenumber_cm1"], reverse=True)
        return peaks

    def assign_functional_groups(self, peaks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Maps wavenumbers to organic/inorganic functional group ranges algorithmically.
        """
        groups = []
        for peak in peaks:
            wn = peak["wavenumber_cm1"]
            group_name = "Unassigned / Complex Matrix"
            vibrational_mode = "Complex Vibration"
            confidence_level = "PRELIMINARY_ASSIGNMENT"
            
            if 3200 <= wn <= 3650:
                group_name = "O-H or N-H (Alcohol, Phenol, Amine, Hydroxyl)"
                vibrational_mode = "Stretching"
                confidence_level = "HIGH"
            elif 3000 < wn <= 3100:
                group_name = "C-H (Alkene / Aromatic)"
                vibrational_mode = "Stretching"
                confidence_level = "MODERATE"
            elif 2840 <= wn <= 3000:
                group_name = "C-H (Alkane, Aliphatic C-H)"
                vibrational_mode = "Symmetric / Asymmetric Stretching"
                confidence_level = "HIGH"
            elif 2200 <= wn <= 2260:
                group_name = "C≡N (Nitrile) or C≡C (Alkyne)"
                vibrational_mode = "Stretching"
                confidence_level = "HIGH"
            elif 1680 <= wn <= 1750:
                group_name = "C=O (Carbonyl, Ester, Ketone, Acid)"
                vibrational_mode = "Stretching"
                confidence_level = "HIGH"
            elif 1580 <= wn <= 1650:
                group_name = "C=C (Aliphatic/Aromatic) or N-H Bend"
                vibrational_mode = "Stretching / Bending"
                confidence_level = "MODERATE"
            elif 1340 <= wn <= 1550:
                group_name = "N-O (Nitro Group) / CH2, CH3 Bending"
                vibrational_mode = "Asymmetric Stretching / Scissoring"
                confidence_level = "MODERATE"
            elif 1000 <= wn <= 1300:
                group_name = "C-O (Ether, Ester, Alcohol) / C-N"
                vibrational_mode = "Stretching"
                confidence_level = "MODERATE"
            elif 600 <= wn < 1000:
                group_name = "Fingerprint Region C-H Out-of-Plane / Metal-Oxygen (M-O)"
                vibrational_mode = "Out-of-Plane Bending / Lattice Vibrations"
                confidence_level = "REQUIRES_REFERENCE_MATCHING"
            elif wn < 600:
                group_name = "Metal-Oxygen / Inorganic Lattice Mode"
                vibrational_mode = "Phonon / Lattice Stretching"
                confidence_level = "REQUIRES_REFERENCE_MATCHING"
                
            updated_peak = dict(peak)
            updated_peak["assigned_group"] = group_name
            updated_peak["vibrational_mode"] = vibrational_mode
            updated_peak["assignment_confidence"] = confidence_level
            groups.append(updated_peak)
            
        return groups

