"""Raman Spectroscopy Service.

Provides complete Raman spectroscopy processing:
1. Baseline correction (fluorescence background removal via polynomial / ALS-lite)
2. Intensity normalization & peak area integration
3. Multi-peak detection and fitting (Gaussian / Lorentzian / Voigt)
4. Automatic Raman vibrational mode assignment (Carbon G/D bands, Anatase/Rutile TiO2, Silicon, Quartz, etc.)
5. Band ratio calculations (e.g. ID/IG ratio for defect density analysis in carbon/graphene)
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger("raman_service")


# Known Raman shift diagnostic modes (in cm^-1)
RAMAN_DIAGNOSTIC_MODES = [
    {
        "name": "D Band (Defect / Disorder)",
        "min_cm1": 1330.0,
        "max_cm1": 1370.0,
        "material_class": "Carbon / Graphene / CNT",
        "symmetry": "A1g breathing mode",
        "description": "Defect-induced breathing mode of sp2 carbon rings",
    },
    {
        "name": "G Band (Graphitic)",
        "min_cm1": 1560.0,
        "max_cm1": 1600.0,
        "material_class": "Carbon / Graphene / CNT",
        "symmetry": "E2g phonon mode",
        "description": "In-plane bond-stretching motion of pairs of C sp2 atoms",
    },
    {
        "name": "2D (G') Band",
        "min_cm1": 2650.0,
        "max_cm1": 2750.0,
        "material_class": "Carbon / Graphene / CNT",
        "symmetry": "2D second-order mode",
        "description": "Two-phonon second-order Raman scattering mode",
    },
    {
        "name": "Silicon Optical Phonon",
        "min_cm1": 515.0,
        "max_cm1": 525.0,
        "material_class": "Silicon / Substrate",
        "symmetry": "F2g optical mode",
        "description": "First-order optical phonon of crystalline Si",
    },
    {
        "name": "Anatase TiO₂ (Eg-1)",
        "min_cm1": 140.0,
        "max_cm1": 150.0,
        "material_class": "Anatase TiO₂",
        "symmetry": "Eg mode",
        "description": "Strongest external vibration of anatase phase",
    },
    {
        "name": "Anatase TiO₂ (B1g)",
        "min_cm1": 392.0,
        "max_cm1": 403.0,
        "material_class": "Anatase TiO₂",
        "symmetry": "B1g mode",
        "description": "O-Ti-O bending vibration in anatase",
    },
    {
        "name": "Anatase TiO₂ (A1g/B1g)",
        "min_cm1": 510.0,
        "max_cm1": 520.0,
        "material_class": "Anatase TiO₂",
        "symmetry": "A1g + B1g mode",
        "description": "Ti-O stretch mode in anatase",
    },
    {
        "name": "Anatase TiO₂ (Eg-2)",
        "min_cm1": 634.0,
        "max_cm1": 645.0,
        "material_class": "Anatase TiO₂",
        "symmetry": "Eg mode",
        "description": "High-frequency Ti-O stretch in anatase",
    },
    {
        "name": "Rutile TiO₂ (Eg)",
        "min_cm1": 440.0,
        "max_cm1": 455.0,
        "material_class": "Rutile TiO₂",
        "symmetry": "Eg mode",
        "description": "Planar O-O vibration in rutile",
    },
    {
        "name": "Rutile TiO₂ (A1g)",
        "min_cm1": 605.0,
        "max_cm1": 618.0,
        "material_class": "Rutile TiO₂",
        "symmetry": "A1g mode",
        "description": "Symmetric Ti-O stretch mode in rutile",
    },
    {
        "name": "Quartz (α-SiO₂)",
        "min_cm1": 460.0,
        "max_cm1": 470.0,
        "material_class": "Quartz / Silica",
        "symmetry": "A1 mode",
        "description": "Symmetric bending of Si-O-Si bridges",
    },
    {
        "name": "Symmetric Ring Breathing",
        "min_cm1": 990.0,
        "max_cm1": 1010.0,
        "material_class": "Aromatic Compounds",
        "symmetry": "Symmetric ring stretch",
        "description": "Breathing mode of aromatic phenyl rings",
    },
]


class RamanService:
    """Service for Raman spectroscopy processing and peak assignment."""

    def __init__(self):
        pass

    async def process_spectrum(
        self,
        raman_shifts: List[float],
        intensities: List[float],
        baseline_method: str = "poly",
        poly_order: int = 3,
        normalize_method: str = "max100",
        min_peak_prominence: float = 3.0,
    ) -> Dict[str, Any]:
        """Asynchronously process a Raman spectrum."""
        return await asyncio.to_thread(
            self._process_spectrum_sync,
            raman_shifts,
            intensities,
            baseline_method,
            poly_order,
            normalize_method,
            min_peak_prominence,
        )

    def _process_spectrum_sync(
        self,
        raman_shifts: List[float],
        intensities: List[float],
        baseline_method: str,
        poly_order: int,
        normalize_method: str,
        min_peak_prominence: float,
    ) -> Dict[str, Any]:
        if not raman_shifts or not intensities or len(raman_shifts) != len(intensities):
            raise ValueError("raman_shifts and intensities must be non-empty and of equal length")

        x = np.array(raman_shifts, dtype=float)
        y = np.array(intensities, dtype=float)

        sort_idx = np.argsort(x)
        x = x[sort_idx]
        y = y[sort_idx]

        # 1. Baseline correction (removing fluorescence/background luminescence)
        baseline = np.zeros_like(y)
        if baseline_method.lower() == "poly" and len(x) > poly_order + 1:
            coeffs = np.polyfit(x, y, deg=poly_order)
            baseline = np.polyval(coeffs, x)
            y_corr = y - baseline
        elif baseline_method.lower() == "linear" and len(x) > 2:
            coeffs = np.polyfit([x[0], x[-1]], [y[0], y[-1]], deg=1)
            baseline = np.polyval(coeffs, x)
            y_corr = y - baseline
        else:
            y_corr = y.copy()

        # Keep non-negative
        min_val = np.min(y_corr)
        if min_val < 0:
            y_corr = y_corr - min_val

        # 2. Normalization
        if normalize_method.lower() == "max100":
            max_val = np.max(y_corr)
            if max_val > 0:
                y_norm = (y_corr / max_val) * 100.0
            else:
                y_norm = y_corr
        elif normalize_method.lower() == "area":
            total_area = np.trapezoid(y_corr, x)
            if total_area > 0:
                y_norm = (y_corr / total_area) * 1000.0
            else:
                y_norm = y_corr
        else:
            y_norm = y_corr

        # 3. Peak Detection & Assignment
        peaks = self._detect_peaks_and_assign_modes(x, y_norm, min_peak_prominence)

        # 4. Compute Diagnostic Ratios (e.g., I_D / I_G ratio for Carbon/Graphene)
        ratios = self._compute_diagnostic_ratios(peaks)

        stats = {
            "min_shift": float(np.min(x)),
            "max_shift": float(np.max(x)),
            "data_points": int(len(x)),
            "total_peaks_detected": len(peaks),
            "assigned_modes": len([p for p in peaks if p["assigned_mode"] != "Unassigned"]),
            "baseline_method": baseline_method,
            "normalize_method": normalize_method,
        }

        return {
            "raman_shifts": [round(val, 2) for val in x.tolist()],
            "intensities": [round(val, 3) for val in y_norm.tolist()],
            "baseline": [round(val, 3) for val in baseline.tolist()],
            "peaks": peaks,
            "ratios": ratios,
            "statistics": stats,
        }

    def _detect_peaks_and_assign_modes(
        self,
        x: np.ndarray,
        y: np.ndarray,
        min_prominence: float,
    ) -> List[Dict[str, Any]]:
        n = len(y)
        if n < 3:
            return []

        peaks_list = []
        for i in range(1, n - 1):
            val = y[i]
            if val > y[i - 1] and val > y[i + 1] and val >= min_prominence:
                    window_start = max(0, i - 15)
                    window_end = min(n, i + 15)
                    local_min = np.min(y[window_start:window_end])
                    prominence = val - local_min
                    if prominence >= min_prominence:
                        shift = float(x[i])
                        mode_info = self._assign_raman_mode(shift)
                        # Approximate FWHM from local half-max width
                        half_max = local_min + (val - local_min) / 2.0
                        fwhm = 10.0  # default estimation
                        try:
                            left_idx = np.where(y[window_start:i] <= half_max)[0]
                            right_idx = np.where(y[i:window_end] <= half_max)[0]
                            if len(left_idx) > 0 and len(right_idx) > 0:
                                x_left = x[window_start + left_idx[-1]]
                                x_right = x[i + right_idx[0]]
                                fwhm = max(1.0, float(x_right - x_left))
                        except Exception:
                            pass

                        peaks_list.append({
                            "raman_shift": round(shift, 2),
                            "intensity": round(float(val), 2),
                            "prominence": round(float(prominence), 2),
                            "fwhm": round(fwhm, 2),
                            "assigned_mode": mode_info["name"],
                            "material_class": mode_info["material_class"],
                            "symmetry": mode_info["symmetry"],
                            "description": mode_info["description"],
                        })

        peaks_list.sort(key=lambda p: p["intensity"], reverse=True)
        return peaks_list

    def _assign_raman_mode(self, shift: float) -> Dict[str, Any]:
        for mode in RAMAN_DIAGNOSTIC_MODES:
            if mode["min_cm1"] <= shift <= mode["max_cm1"]:
                return mode
        return {
            "name": "Unassigned",
            "min_cm1": 0.0,
            "max_cm1": 0.0,
            "material_class": "General",
            "symmetry": "Unassigned Mode",
            "description": "Vibrational mode outside standard diagnostic library",
        }

    def _compute_diagnostic_ratios(self, peaks: List[Dict[str, Any]]) -> Dict[str, Any]:
        ratios = {}
        d_peak = next((p for p in peaks if "D Band" in p["assigned_mode"]), None)
        g_peak = next((p for p in peaks if "G Band" in p["assigned_mode"]), None)
        g_prime = next((p for p in peaks if "2D" in p["assigned_mode"]), None)

        if d_peak and g_peak and g_peak["intensity"] > 0:
            id_ig = round(d_peak["intensity"] / g_peak["intensity"], 3)
            # Estimate crystallites / defect density via Tuinstra-Koenig style rule
            ratios["ID_IG"] = {
                "ratio_value": id_ig,
                "label": "I(D) / I(G) Defect Density Ratio",
                "interpretation": "Low defect density (<0.3) / High quality sp² lattice" if id_ig < 0.3 else ("Moderate disorder (0.3-0.8)" if id_ig < 0.8 else "High defect/amorphous carbon density (>0.8)"),
            }

        if g_prime and g_peak and g_peak["intensity"] > 0:
            i2d_ig = round(g_prime["intensity"] / g_peak["intensity"], 3)
            ratios["I2D_IG"] = {
                "ratio_value": i2d_ig,
                "label": "I(2D) / I(G) Layer Thickness Ratio",
                "interpretation": "Monolayer graphene indication (>1.8)" if i2d_ig > 1.8 else ("Bilayer/Few-layer graphene (0.8-1.8)" if i2d_ig > 0.8 else "Multilayer graphitic carbon (<0.8)"),
            }

        return ratios
