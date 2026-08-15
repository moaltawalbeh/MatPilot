"""FTIR Spectroscopy Service.

Provides complete Fourier-Transform Infrared (FTIR) spectroscopy processing:
1. Baseline correction (polynomial / linear / Shirley-lite)
2. Intensity normalization (min-max / area / max-100)
3. Peak detection with prominence & thresholding
4. Automatic functional group & vibrational mode assignment
5. Comprehensive FTIR characterization summary report generation
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

logger = logging.getLogger("ftir_service")


# Known IR functional group frequency bands (in cm^-1)
IR_FUNCTIONAL_GROUPS = [
    {
        "name": "O-H Stretch (Alcohol/Phenol)",
        "min_cm1": 3200.0,
        "max_cm1": 3650.0,
        "intensity_type": "Strong, Broad",
        "mode": "Stretching",
        "category": "Hydroxyl / Alcohol",
    },
    {
        "name": "N-H Stretch (Amine/Amide)",
        "min_cm1": 3300.0,
        "max_cm1": 3500.0,
        "intensity_type": "Medium, Sharp",
        "mode": "Stretching",
        "category": "Amine / Amide",
    },
    {
        "name": "=C-H Stretch (Alkene/Aromatic)",
        "min_cm1": 3000.0,
        "max_cm1": 3150.0,
        "intensity_type": "Medium",
        "mode": "Stretching",
        "category": "Unsaturated Hydrocarbon",
    },
    {
        "name": "C-H Stretch (Alkane)",
        "min_cm1": 2850.0,
        "max_cm1": 3000.0,
        "intensity_type": "Strong",
        "mode": "Stretching",
        "category": "Aliphatic Hydrocarbon",
    },
    {
        "name": "C≡N Stretch (Nitrile)",
        "min_cm1": 2200.0,
        "max_cm1": 2260.0,
        "intensity_type": "Medium to Strong",
        "mode": "Stretching",
        "category": "Nitrile",
    },
    {
        "name": "C≡C Stretch (Alkyne)",
        "min_cm1": 2100.0,
        "max_cm1": 2260.0,
        "intensity_type": "Weak to Medium",
        "mode": "Stretching",
        "category": "Alkyne",
    },
    {
        "name": "C=O Stretch (Carbonyl)",
        "min_cm1": 1680.0,
        "max_cm1": 1750.0,
        "intensity_type": "Very Strong",
        "mode": "Stretching",
        "category": "Carbonyl (Ketone/Ester/Acid)",
    },
    {
        "name": "C=C Stretch (Alkene/Aromatic)",
        "min_cm1": 1600.0,
        "max_cm1": 1680.0,
        "intensity_type": "Medium to Weak",
        "mode": "Stretching",
        "category": "Unsaturated C=C",
    },
    {
        "name": "N-H Bend (Amide II / Amine)",
        "min_cm1": 1550.0,
        "max_cm1": 1650.0,
        "intensity_type": "Medium",
        "mode": "Bending",
        "category": "Amide / Amine",
    },
    {
        "name": "C-H Bending (Aliphatic)",
        "min_cm1": 1350.0,
        "max_cm1": 1470.0,
        "intensity_type": "Medium",
        "mode": "Bending",
        "category": "Aliphatic Bending",
    },
    {
        "name": "C-O Stretch (Alcohol/Ester/Ether)",
        "min_cm1": 1000.0,
        "max_cm1": 1300.0,
        "intensity_type": "Strong",
        "mode": "Stretching",
        "category": "C-O Single Bond",
    },
    {
        "name": "=C-H Out-of-Plane Bend (Aromatic)",
        "min_cm1": 650.0,
        "max_cm1": 900.0,
        "intensity_type": "Strong",
        "mode": "Bending",
        "category": "Aromatic Bending",
    },
]


class FTIRService:
    """Service for processing FTIR spectra and functional group characterization."""

    def __init__(self):
        pass

    async def process_spectrum(
        self,
        wavenumbers: List[float],
        intensities: List[float],
        baseline_method: str = "poly",
        poly_order: int = 2,
        normalize_method: str = "max100",
        min_peak_prominence: float = 2.0,
        spectrum_type: str = "absorbance",
    ) -> Dict[str, Any]:
        """Asynchronously process an FTIR spectrum.

        Args:
            wavenumbers: Wavenumbers in cm^-1
            intensities: Intensity / Absorbance values
            baseline_method: "poly", "linear", or "none"
            poly_order: Polynomial order for baseline fitting
            normalize_method: "max100", "minmax", or "none"
            min_peak_prominence: Minimum peak prominence for detection
            spectrum_type: "absorbance" or "transmittance"
        """
        return await asyncio.to_thread(
            self._process_spectrum_sync,
            wavenumbers,
            intensities,
            baseline_method,
            poly_order,
            normalize_method,
            min_peak_prominence,
            spectrum_type,
        )

    def _process_spectrum_sync(
        self,
        wavenumbers: List[float],
        intensities: List[float],
        baseline_method: str,
        poly_order: int,
        normalize_method: str,
        min_peak_prominence: float,
        spectrum_type: str,
    ) -> Dict[str, Any]:
        if not wavenumbers or not intensities or len(wavenumbers) != len(intensities):
            raise ValueError("wavenumbers and intensities must be non-empty and of equal length")

        x = np.array(wavenumbers, dtype=float)
        y = np.array(intensities, dtype=float)

        # Sort by wavenumber ascending for consistent math
        sort_idx = np.argsort(x)
        x = x[sort_idx]
        y = y[sort_idx]

        # If transmittance, convert to pseudo-absorbance for peak detection
        is_transmittance = spectrum_type.lower().startswith("trans")
        if is_transmittance:
            # Prevent log10(<=0)
            y_safe = np.clip(y, 1e-4, 100.0)
            y_work = 2.0 - np.log10(y_safe)
        else:
            y_work = y.copy()

        # 1. Baseline Correction
        baseline = np.zeros_like(y_work)
        if baseline_method.lower() == "poly" and len(x) > poly_order + 1:
            coeffs = np.polyfit(x, y_work, deg=poly_order)
            baseline = np.polyval(coeffs, x)
            y_corr = y_work - baseline
        elif baseline_method.lower() == "linear" and len(x) > 2:
            coeffs = np.polyfit([x[0], x[-1]], [y_work[0], y_work[-1]], deg=1)
            baseline = np.polyval(coeffs, x)
            y_corr = y_work - baseline
        else:
            y_corr = y_work.copy()

        # Ensure no negative values in corrected spectrum
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
        elif normalize_method.lower() == "minmax":
            max_val, min_v = np.max(y_corr), np.min(y_corr)
            if max_val > min_v:
                y_norm = (y_corr - min_v) / (max_val - min_v)
            else:
                y_norm = y_corr
        else:
            y_norm = y_corr

        # 3. Peak Detection & Functional Group Assignment
        peaks = self._detect_peaks_and_assign_groups(x, y_norm, min_peak_prominence)

        # Calculate spectrum summary statistics
        stats = {
            "min_wavenumber": float(np.min(x)),
            "max_wavenumber": float(np.max(x)),
            "data_points": int(len(x)),
            "total_peaks_detected": len(peaks),
            "functional_groups_identified": len(set(p["functional_group"] for p in peaks if p["functional_group"] != "Unassigned")),
            "baseline_method": baseline_method,
            "normalize_method": normalize_method,
            "spectrum_type": spectrum_type,
        }

        return {
            "wavenumbers": [round(val, 2) for val in x.tolist()],
            "intensities": [round(val, 3) for val in y_norm.tolist()],
            "baseline": [round(val, 3) for val in baseline.tolist()],
            "peaks": peaks,
            "statistics": stats,
        }

    def _detect_peaks_and_assign_groups(
        self,
        x: np.ndarray,
        y: np.ndarray,
        min_prominence: float,
    ) -> List[Dict[str, Any]]:
        n = len(y)
        if n < 3:
            return []

        peaks_list = []
        # Local maxima search with prominence filter
        for i in range(1, n - 1):
            val = y[i]
            if val > y[i - 1] and val > y[i + 1] and val >= min_prominence:
                    # Check prominence against local minimum around peak
                    window_start = max(0, i - 15)
                    window_end = min(n, i + 15)
                    local_min = np.min(y[window_start:window_end])
                    prominence = val - local_min
                    if prominence >= min_prominence:
                        wavenumber = float(x[i])
                        group_info = self._assign_functional_group(wavenumber)
                        peaks_list.append({
                            "wavenumber": round(wavenumber, 2),
                            "intensity": round(float(val), 2),
                            "prominence": round(float(prominence), 2),
                            "functional_group": group_info["name"],
                            "vibrational_mode": group_info["mode"],
                            "category": group_info["category"],
                            "expected_range": f"{group_info['min_cm1']}-{group_info['max_cm1']} cm⁻¹" if group_info["name"] != "Unassigned" else "N/A",
                        })

        # Sort peaks by intensity descending
        peaks_list.sort(key=lambda p: p["intensity"], reverse=True)
        return peaks_list

    def _assign_functional_group(self, wavenumber: float) -> Dict[str, Any]:
        """Match wavenumber against known IR functional groups."""
        for group in IR_FUNCTIONAL_GROUPS:
            if group["min_cm1"] <= wavenumber <= group["max_cm1"]:
                return group
        return {
            "name": "Unassigned",
            "min_cm1": 0.0,
            "max_cm1": 0.0,
            "intensity_type": "N/A",
            "mode": "Unassigned Mode",
            "category": "Unassigned Region",
        }

    async def generate_ftir_report(
        self,
        sample_name: str,
        wavenumbers: List[float],
        intensities: List[float],
        processing_result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate formatted analytical report data for FTIR."""
        stats = processing_result.get("statistics", {})
        peaks = processing_result.get("peaks", [])

        # Categorize detected peaks by major functional regions
        fingerprint_region = [p for p in peaks if p["wavenumber"] < 1500]
        functional_region = [p for p in peaks if p["wavenumber"] >= 1500]

        summary_text = (
            f"FTIR characterization of {sample_name} performed over {stats.get('min_wavenumber', 400)}–"
            f"{stats.get('max_wavenumber', 4000)} cm⁻¹. A total of {stats.get('total_peaks_detected', 0)} absorption "
            f"features were detected, identifying {stats.get('functional_groups_identified', 0)} distinct functional groups."
        )

        return {
            "report_title": f"FTIR Spectroscopy Characterization — {sample_name}",
            "sample_name": sample_name,
            "summary_text": summary_text,
            "statistics": stats,
            "functional_region_peaks": functional_region,
            "fingerprint_region_peaks": fingerprint_region,
            "all_peaks": peaks,
        }
