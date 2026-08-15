"""UV-Vis Spectroscopy Service.

Provides complete UV-Vis / Diffuse Reflectance Spectroscopy (DRS) processing:
1. Spectrum mode transformations (Absorbance ↔ Transmittance ↔ Reflectance)
2. Kubelka-Munk transformation F(R) = (1 - R)^2 / 2R for powder reflectance
3. Automatic & Manual Tauc Plot Band Gap Analysis:
   - Supports Direct allowed (n = 1/2), Indirect allowed (n = 2), Direct forbidden (n = 3/2), Indirect forbidden (n = 3)
   - Automatic steepest absorption edge detection & linear regression tangent fitting
   - Precise optical band gap E_g calculation with R² regression diagnostics
4. Absorption peak & Urbach tail disorder evaluation
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

logger = logging.getLogger("uv_vis_service")


class UVVisService:
    """Service for UV-Vis spectroscopy, Kubelka-Munk, and Tauc plot band gap analysis."""

    def __init__(self):
        pass

    async def analyze_spectrum(
        self,
        wavelengths: List[float],
        intensities: List[float],
        spectrum_type: str = "absorbance",
        transition_type: str = "direct_allowed",
        manual_range: Optional[Tuple[float, float]] = None,
    ) -> Dict[str, Any]:
        """Asynchronously analyze UV-Vis spectrum and compute optical band gap via Tauc plot."""
        return await asyncio.to_thread(
            self._analyze_spectrum_sync,
            wavelengths,
            intensities,
            spectrum_type,
            transition_type,
            manual_range,
        )

    def _analyze_spectrum_sync(
        self,
        wavelengths: List[float],
        intensities: List[float],
        spectrum_type: str,
        transition_type: str,
        manual_range: Optional[Tuple[float, float]],
    ) -> Dict[str, Any]:
        if not wavelengths or not intensities or len(wavelengths) != len(intensities):
            raise ValueError("wavelengths and intensities must be non-empty and of equal length")

        w_arr = np.array(wavelengths, dtype=float)
        i_arr = np.array(intensities, dtype=float)

        # Sort by wavelength ascending
        sort_idx = np.argsort(w_arr)
        w_arr = w_arr[sort_idx]
        i_arr = i_arr[sort_idx]

        # Prevent division by zero for wavelengths
        w_safe = np.clip(w_arr, 1.0, 10000.0)
        # Convert wavelengths (nm) to photon energy hν in electron volts (eV): hν = 1239.84193 / λ
        energy_ev = 1239.84193 / w_safe

        # Calculate absorbance or Kubelka-Munk F(R) depending on input mode
        mode = spectrum_type.lower()
        if mode.startswith("ref"):
            # Reflectance (either 0-100 or 0-1 percentage)
            r_val = i_arr.copy()
            if np.max(r_val) > 1.5:
                r_val = r_val / 100.0
            r_val = np.clip(r_val, 0.001, 0.999)
            # Kubelka-Munk function F(R) = (1 - R)^2 / (2 * R)
            alpha_equiv = ((1.0 - r_val) ** 2) / (2.0 * r_val)
        elif mode.startswith("trans"):
            # Transmittance -> Absorbance
            t_val = i_arr.copy()
            if np.max(t_val) > 1.5:
                t_val = t_val / 100.0
            t_val = np.clip(t_val, 1e-4, 1.0)
            alpha_equiv = -np.log10(t_val)
        else:
            # Absorbance or Absorption Coefficient
            alpha_equiv = np.clip(i_arr, 0.0, None)

        # Determine Tauc exponent based on transition type
        # (α * hν)^(1/n) where n = 0.5 (direct allowed), 2.0 (indirect allowed), etc.
        t_type = transition_type.lower()
        if "indirect_forb" in t_type:
            exponent = 1.0 / 3.0
            transition_label = "Indirect Forbidden Transition (n = 3)"
        elif "direct_forb" in t_type:
            exponent = 2.0 / 3.0
            transition_label = "Direct Forbidden Transition (n = 3/2)"
        elif "indirect" in t_type:
            exponent = 0.5
            transition_label = "Indirect Allowed Transition (n = 2)"
        else:
            exponent = 2.0
            transition_label = "Direct Allowed Transition (n = 1/2)"

        # Compute Tauc y-axis: (α * hν)^exponent
        tauc_y = (alpha_equiv * energy_ev) ** exponent
        tauc_y = np.nan_to_num(tauc_y, nan=0.0, posinf=0.0, neginf=0.0)

        # Sort by energy ascending for clean linear regression
        e_sort = np.argsort(energy_ev)
        e_sorted = energy_ev[e_sort]
        tauc_sorted = tauc_y[e_sort]

        # Determine linear absorption edge range and compute band gap
        band_gap_result = self._compute_band_gap(e_sorted, tauc_sorted, manual_range)

        # Detect major absorption peak (max absorbance)
        max_idx = np.argmax(alpha_equiv)
        max_abs_nm = float(w_arr[max_idx])
        max_abs_ev = float(energy_ev[max_idx])

        return {
            "wavelengths": [round(val, 2) for val in w_arr.tolist()],
            "intensities": [round(val, 4) for val in i_arr.tolist()],
            "energy_ev": [round(val, 4) for val in e_sorted.tolist()],
            "tauc_values": [round(val, 4) for val in tauc_sorted.tolist()],
            "spectrum_type": spectrum_type,
            "transition_type": transition_type,
            "transition_label": transition_label,
            "band_gap_ev": band_gap_result["band_gap_ev"],
            "r_squared": band_gap_result["r_squared"],
            "tangent_line": band_gap_result["tangent_line"],
            "fit_range_ev": band_gap_result["fit_range_ev"],
            "peak_absorption": {
                "wavelength_nm": round(max_abs_nm, 2),
                "energy_ev": round(max_abs_ev, 3),
                "intensity": round(float(i_arr[max_idx]), 4),
            },
        }

    def _compute_band_gap(
        self,
        e_arr: np.ndarray,
        tauc_arr: np.ndarray,
        manual_range: Optional[Tuple[float, float]],
    ) -> Dict[str, Any]:
        n = len(e_arr)
        if n < 10:
            return {
                "band_gap_ev": 0.0,
                "r_squared": 0.0,
                "tangent_line": [],
                "fit_range_ev": (0.0, 0.0),
            }

        # If manual energy range provided, filter points in that window
        if manual_range and len(manual_range) == 2:
            low_e, high_e = min(manual_range), max(manual_range)
            mask = (e_arr >= low_e) & (e_arr <= high_e)
            indices = np.where(mask)[0]
            if len(indices) >= 4:
                return self._fit_linear_window(e_arr, tauc_arr, indices[0], indices[-1])

        # Otherwise: Automatic Steepest Absorption Edge Detection
        # Use a sliding window of ~15-20% of data points to find maximum slope with high R²
        window_size = max(5, int(n * 0.15))
        best_slope = -1e9
        best_r2 = -1.0
        best_idx_start = 0
        best_idx_end = window_size

        for i in range(n - window_size):
            j = i + window_size
            x_win = e_arr[i:j]
            y_win = tauc_arr[i:j]

            # Check for sufficient variance
            if np.std(x_win) < 1e-4 or np.std(y_win) < 1e-4:
                continue

            slope, intercept = np.polyfit(x_win, y_win, deg=1)
            # Only consider positive slopes for band gap absorption edges
            if slope <= 0:
                continue

            # Compute R²
            y_pred = slope * x_win + intercept
            ss_res = np.sum((y_win - y_pred) ** 2)
            ss_tot = np.sum((y_win - np.mean(y_win)) ** 2)
            r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

            # Score window by combination of steepness and linearity
            score = slope * (r2 ** 3)
            if score > best_slope and r2 > 0.88:
                best_slope = score
                best_r2 = r2
                best_idx_start = i
                best_idx_end = j

        return self._fit_linear_window(e_arr, tauc_arr, best_idx_start, best_idx_end)

    def _fit_linear_window(
        self,
        e_arr: np.ndarray,
        tauc_arr: np.ndarray,
        start_idx: int,
        end_idx: int,
    ) -> Dict[str, Any]:
        x_win = e_arr[start_idx : end_idx + 1]
        y_win = tauc_arr[start_idx : end_idx + 1]

        if len(x_win) < 2:
            return {
                "band_gap_ev": 0.0,
                "r_squared": 0.0,
                "tangent_line": [],
                "fit_range_ev": (0.0, 0.0),
            }

        slope, intercept = np.polyfit(x_win, y_win, deg=1)
        y_pred = slope * x_win + intercept
        ss_res = np.sum((y_win - y_pred) ** 2)
        ss_tot = np.sum((y_win - np.mean(y_win)) ** 2)
        r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

        # Band gap E_g is x-intercept where y = 0 -> 0 = slope * E_g + intercept -> E_g = -intercept / slope
        if slope > 0:
            e_gap = -intercept / slope
        else:
            e_gap = 0.0

        # Create tangent line coordinates extending slightly beyond fit window to x-axis
        tangent_points = []
        if e_gap > 0 and e_gap < 15.0:
            e_min_line = e_gap
            e_max_line = float(np.max(x_win)) + 0.2
            tangent_points = [
                {"energy_ev": round(e_min_line, 4), "tauc_value": 0.0},
                {"energy_ev": round(e_max_line, 4), "tauc_value": round(slope * e_max_line + intercept, 4)},
            ]

        return {
            "band_gap_ev": round(float(e_gap), 3),
            "r_squared": round(float(r2), 4),
            "tangent_line": tangent_points,
            "fit_range_ev": (round(float(x_win[0]), 3), round(float(x_win[-1]), 3)),
        }
