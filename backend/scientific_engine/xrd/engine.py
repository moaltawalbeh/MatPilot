from typing import List, Dict, Any, Tuple, Optional
from ..core.math_utils import apply_savitzky_golay, detect_local_maxima, fit_polynomial_baseline
import numpy as np

class XRDComputationEngine:
    """
    Scientific Computation Engine strictly for XRD (X-Ray Diffraction).
    Handles deterministic numerical algorithms (Bragg indexing, d-spacing, Scherrer size, 
    background stripping, profile fitting) without AI interaction.
    """
    
    def background_stripping(self, two_theta: List[float], intensity: List[float], order: int = 3) -> List[float]:
        """
        Strips amorphous background halo (polynomial or convex hull subtraction).
        XRD requires subtraction (unlike FTIR division).
        """
        x_arr = np.array(two_theta)
        y_arr = np.array(intensity)
        
        baseline = fit_polynomial_baseline(x_arr, y_arr, order=order)
        corrected = y_arr - np.array(baseline)
        corrected[corrected < 0] = 0.0  # Intensity counts cannot be negative
        return corrected.tolist()

    def smooth_pattern(self, intensity: List[float], window_length: int = 7, polyorder: int = 2) -> List[float]:
        """Applies Savitzky-Golay smoothing for noisy diffractograms."""
        return apply_savitzky_golay(intensity, window_length=window_length, polyorder=polyorder)

    def calculate_d_spacing(self, two_theta: float, wavelength: float = 1.5406) -> float:
        """
        Bragg's Law: nλ = 2d sin(θ) -> d = λ / (2 sin(θ)).
        Assumes n=1 for primary reflections. Wavelength in Angstroms.
        """
        if two_theta <= 0:
            return 0.0
        theta_rad = np.radians(two_theta / 2.0)
        sin_theta = np.sin(theta_rad)
        if sin_theta == 0:
            return 0.0
        return float(wavelength / (2.0 * sin_theta))

    def estimate_fwhm(self, two_theta: List[float], intensity: List[float], peak_idx: int) -> float:
        """
        Estimates Full Width at Half Maximum (FWHM) in degrees 2θ around a peak index.
        """
        x = np.array(two_theta)
        y = np.array(intensity)
        peak_y = y[peak_idx]
        half_max = peak_y / 2.0

        # Search left
        left_idx = peak_idx
        while left_idx > 0 and y[left_idx] > half_max:
            left_idx -= 1
        
        # Search right
        right_idx = peak_idx
        while right_idx < len(y) - 1 and y[right_idx] > half_max:
            right_idx += 1

        fwhm_deg = x[right_idx] - x[left_idx]
        return float(max(fwhm_deg, 0.05))

    def calculate_scherrer_size(self, two_theta_deg: float, fwhm_deg: float, shape_factor: float = 0.9, wavelength: float = 1.5406) -> float:
        """
        Scherrer Equation: D = (K * λ) / (β * cos(θ))
        D: crystallite size (nm)
        K: shape factor (typically 0.9)
        λ: wavelength in nm
        β: FWHM in radians
        θ: Bragg angle in radians
        """
        if two_theta_deg <= 0 or fwhm_deg <= 0:
            return 0.0
        theta_rad = np.radians(two_theta_deg / 2.0)
        beta_rad = np.radians(fwhm_deg)
        wavelength_nm = wavelength / 10.0  # Convert Å to nm
        
        cos_theta = np.cos(theta_rad)
        if cos_theta == 0 or beta_rad == 0:
            return 0.0
        
        crystallite_size_nm = (shape_factor * wavelength_nm) / (beta_rad * cos_theta)
        return float(max(crystallite_size_nm, 0.1))

    def detect_bragg_peaks(
        self,
        two_theta: List[float],
        intensity: List[float],
        prominence: float = 10.0,
        wavelength: float = 1.5406
    ) -> List[Dict[str, Any]]:
        """
        Level 1 Analytical Processing: Detects Bragg reflections (2θ maxima),
        computes d-spacing, relative intensity, FWHM, and Scherrer crystallite size.
        """
        x_peaks, y_peaks = detect_local_maxima(two_theta, intensity, prominence=prominence)
        
        max_int = max(y_peaks) if y_peaks else 1.0
        if max_int == 0:
            max_int = 1.0

        x_arr = np.array(two_theta)
        peaks = []
        for x, y in zip(x_peaks, y_peaks):
            # Find index in two_theta array for FWHM
            idx_matches = np.where(np.isclose(x_arr, x, atol=1e-3))[0]
            idx = int(idx_matches[0]) if len(idx_matches) > 0 else 0

            d = self.calculate_d_spacing(x, wavelength=wavelength)
            fwhm = self.estimate_fwhm(two_theta, intensity, idx)
            size_nm = self.calculate_scherrer_size(x, fwhm, wavelength=wavelength)
            rel_int = (y / max_int) * 100.0

            peaks.append({
                "two_theta": float(x),
                "intensity_counts": float(y),
                "relative_intensity_percent": float(round(rel_int, 2)),
                "d_spacing_angstrom": float(round(d, 4)),
                "fwhm_deg": float(round(fwhm, 4)),
                "crystallite_size_nm": float(round(size_nm, 2)),
                "analysis_level": "Level 1 (Peak Detection)"
            })
            
        # Sort by intensity descending
        peaks.sort(key=lambda p: p["intensity_counts"], reverse=True)
        return peaks

    def execute_rietveld_refinement(
        self,
        two_theta: List[float],
        raw_intensity: List[float],
        cif_structures: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Return an explicit non-result until a real profile-refinement backend is configured.

        Rietveld refinement requires phase models, instrument-profile parameters and a
        constrained least-squares fit.  Synthesising a calculated pattern or fit metrics
        from the observed curve would be scientifically misleading, so peak processing
        intentionally remains Level 1 when that backend is unavailable.
        """
        return {
            "analytical_level": "Level 1 (Peak Detection)",
            "refinement_performed": False,
            "status": "NOT_PERFORMED",
            "reason": (
                "No validated full-profile refinement backend and phase model were supplied. "
                "Peak detection/reference matching is not Rietveld refinement."
            ),
        }
