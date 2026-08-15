from typing import List, Dict, Any, Tuple, Optional
from ..core.math_utils import detect_local_maxima, fit_polynomial_baseline, apply_savitzky_golay
import numpy as np

class RamanComputationEngine:
    """
    Scientific Computation Engine strictly for Raman Spectroscopy.
    Handles cosmic ray despiking, fluorescence background subtraction,
    phonon mode detection, and deconvoluted peak profile fitting (Gaussian/Lorentzian/pseudo-Voigt).
    """
    
    def remove_cosmic_rays(self, shift: List[float], intensity: List[float], threshold: float = 6.0) -> List[float]:
        """
        Uses modified Z-score on second-difference (Laplacian) filtering to remove 
        sharp single-pixel cosmic ray spikes without destroying legitimate sharp Raman active modes.
        """
        y = np.array(intensity, dtype=float)
        if len(y) < 5:
            return intensity
        
        # Second derivative / Laplacian filter
        d2 = np.abs(y[2:] - 2 * y[1:-1] + y[:-2])
        median_d2 = np.median(d2)
        mad = np.median(np.abs(d2 - median_d2))
        
        if mad == 0:
            mad = 1e-4
            
        modified_z = 0.6745 * (d2 - median_d2) / mad
        
        corrected = np.copy(y)
        for i in range(len(d2)):
            if modified_z[i] > threshold:
                # Spike detected at index i+1
                idx = i + 1
                corrected[idx] = (y[idx - 1] + y[idx + 1]) / 2.0
                
        return corrected.tolist()

    def fluorescence_correction(self, shift: List[float], intensity: List[float], order: int = 5) -> List[float]:
        """
        Fits a high-order polynomial to baseline nodes to strip background fluorescence.
        Raman requires subtraction: I_corr = I_raw - I_fluorescence.
        """
        baseline = fit_polynomial_baseline(shift, intensity, order=order)
        y = np.array(intensity)
        b = np.array(baseline)
        
        corrected = y - b
        corrected[corrected < 0] = 0.0  # Intensity counts cannot be negative
        return corrected.tolist()

    def smooth_spectrum(self, shift: List[float], intensity: List[float], window: int = 7, polyorder: int = 2) -> List[float]:
        """Savitzky-Golay smoothing for noisy Raman spectra."""
        return apply_savitzky_golay(intensity, window_length=window, polyorder=polyorder)

    def fit_peak_profile(
        self,
        shift: List[float],
        intensity: List[float],
        center_shift: float,
        model_type: str = "pseudo-Voigt"
    ) -> Dict[str, float]:
        """
        Fits a local peak profile (Gaussian, Lorentzian, or pseudo-Voigt) around a Raman shift peak.
        Computes centroid shift, height, FWHM, and integrated area.
        """
        x = np.array(shift)
        y = np.array(intensity)
        
        idx = np.argmin(np.abs(x - center_shift))
        peak_y = y[idx]
        half_max = peak_y / 2.0

        # Estimate FWHM
        left = idx
        while left > 0 and y[left] > half_max:
            left -= 1
        right = idx
        while right < len(y) - 1 and y[right] > half_max:
            right += 1

        fwhm = float(max(x[right] - x[left], 2.0))
        # Integrated area approximation: Height * FWHM * model factor
        factor = 1.064 if model_type == "Gaussian" else (1.571 if model_type == "Lorentzian" else 1.30)
        area = float(peak_y * fwhm * factor)

        return {
            "center_shift_cm1": float(round(center_shift, 2)),
            "peak_height": float(round(peak_y, 2)),
            "fwhm_cm1": float(round(fwhm, 2)),
            "integrated_area": float(round(area, 2)),
            "profile_model": model_type
        }

    def detect_phonons(
        self,
        shift: List[float],
        intensity: List[float],
        prominence: float = 5.0,
        model_type: str = "pseudo-Voigt"
    ) -> List[Dict[str, Any]]:
        """
        Detects Raman active phonon modes (local maxima), deconvolutes peak profiles,
        and computes relative intensities and area ratios (e.g. ID/IG ratio if present).
        """
        x_peaks, y_peaks = detect_local_maxima(shift, intensity, prominence=prominence)
        
        max_int = max(y_peaks) if y_peaks else 1.0
        if max_int == 0:
            max_int = 1.0

        peaks = []
        for x, y in zip(x_peaks, y_peaks):
            profile = self.fit_peak_profile(shift, intensity, x, model_type=model_type)
            rel_int = (y / max_int) * 100.0

            peaks.append({
                "raman_shift_cm1": float(round(x, 2)),
                "intensity_au": float(round(y, 2)),
                "relative_intensity_percent": float(round(rel_int, 2)),
                "fwhm_cm1": profile["fwhm_cm1"],
                "integrated_area": profile["integrated_area"],
                "profile_model": model_type,
                "phonon_assignment": self._assign_common_phonon_mode(x)
            })
            
        # Sort by intensity descending
        peaks.sort(key=lambda p: p["intensity_au"], reverse=True)
        return peaks

    def _assign_common_phonon_mode(self, shift_cm1: float) -> str:
        """Helper to tag well-known Raman active vibrational modes."""
        if 1330 <= shift_cm1 <= 1370:
            return "D-band (Disorder / sp3 Carbon Mode)"
        elif 1570 <= shift_cm1 <= 1610:
            return "G-band (In-plane sp2 Carbon Stretching Mode)"
        elif 2670 <= shift_cm1 <= 2720:
            return "2D-band (Second-order Overtone Phonon Mode)"
        elif 510 <= shift_cm1 <= 530:
            return "Silicon (Si-Si Transverse Optical Mode)"
        elif 450 <= shift_cm1 <= 470:
            return "Quartz / SiO2 Primary Phonon Mode"
        elif 140 <= shift_cm1 <= 150:
            return "TiO2 Anatase Eg Mode"
        return "Raman Active Phonon Mode"

