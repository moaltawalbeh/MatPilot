"""Distinct scientific analysis engines for each characterization instrument.

Every instrument is its own scientific workflow:

- FTIR  : baseline correction, band detection, functional-group identification,
          peak deconvolution (overlapping bands), spectral matching.
- Raman : cosmic-ray removal, background removal, Lorentzian peak fitting,
          material identification from characteristic Raman shifts.
- UV-Vis: absorbance/reflectance processing, Kubelka-Munk transformation,
          Tauc plots, direct/indirect band-gap estimation, optical transition
          assignment.

Unlike the legacy generic "smooth + baseline + find_peaks" path, each engine
returns a technique-specific result payload that the instrument workspace
renders differently.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np

# ── Shared numerical helpers ────────────────────────────────────────────


def _as_arrays(x: List[float], y: List[float]) -> Tuple[np.ndarray, np.ndarray]:
    x_arr = np.asarray(x, dtype=float)
    y_arr = np.asarray(y, dtype=float)
    if x_arr.size == 0 or y_arr.size == 0:
        raise ValueError("Cannot analyze an empty spectrum")
    return x_arr, y_arr


def _savgol(y: np.ndarray, window: int = 11, polyorder: int = 3) -> np.ndarray:
    from scipy.signal import savgol_filter

    window = max(3, int(window))
    if window % 2 == 0:
        window += 1
    if window > len(y):
        window = len(y) if len(y) % 2 else len(y) - 1
    window = max(3, window)
    polyorder = min(polyorder, window - 1)
    polyorder = max(1, polyorder)
    try:
        return savgol_filter(y, window, polyorder)
    except Exception:
        kernel = np.ones(window) / window
        return np.convolve(y, kernel, mode="same")


def _moving_average(y: np.ndarray, window: int) -> np.ndarray:
    window = max(3, int(window))
    if window % 2 == 0:
        window += 1
    kernel = np.ones(window) / window
    return np.convolve(y, kernel, mode="same")


def _polynomial_baseline(x: np.ndarray, y: np.ndarray, order: int) -> np.ndarray:
    order = max(0, min(int(order), 6))
    if order == 0:
        return np.full_like(y, np.min(y))
    try:
        coeffs = np.polynomial.polynomial.polyfit(x, y, order)
        return np.polynomial.polynomial.polyval(x, coeffs)
    except Exception:
        return np.full_like(y, np.min(y))


def _snip_baseline(y: np.ndarray, iterations: int = 30, width: int = 7) -> np.ndarray:
    """SNIP background estimation (iterative clipping), log-domain for
    positive spectra."""
    b = np.asarray(y, dtype=float)
    if np.min(b) < 0:
        b = b - np.min(b) + 1e-9
    logy = np.log(np.maximum(b, 1e-12))
    m = logy.size
    work = np.zeros(m + 2 * width)
    work[width : width + m] = logy
    for w in range(1, width + 1):
        for i in range(m):
            val = work[width + i]
            lo = work[width + i - w]
            hi = work[width + i + w]
            if w >= 2:
                lo = min(lo, work[width + i - 1])
                hi = min(hi, work[width + i + 1])
            new = min(val, (lo + hi) / 2.0)
            if new > 0:
                work[width + i] = new
    bg = work[width : width + m]
    return np.exp(bg)


def _find_peaks(
    y: np.ndarray,
    prominence: float,
    min_distance: int = 1,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    from scipy.signal import find_peaks

    width = max(1, min_distance)
    try:
        return find_peaks(y, prominence=prominence, distance=width)
    except Exception:
        return find_peaks(y, prominence=prominence)


def _estimate_noise(y: np.ndarray) -> float:
    if y.size == 0:
        return 0.0
    low = y[y <= np.percentile(y, 25)]
    if low.size < 2:
        return 0.0
    return float(np.std(low))


def _fwhm_interp(x: np.ndarray, y: np.ndarray, idx: int) -> float:
    """Baseline-relative FWHM via linear interpolation of the half-maximum."""
    peak = float(y[idx])
    base = min(float(y[0]), float(y[-1]))
    half = (peak + base) / 2.0
    left, right = float(x[idx]), float(x[idx])
    for j in range(int(idx), -1, -1):
        if y[j] <= half:
            left = float(x[j])
            break
        if j == 0:
            left = float(x[0])
    for j in range(int(idx), y.size):
        if y[j] <= half:
            right = float(x[j])
            break
        if j == y.size - 1:
            right = float(x[-1])
    return max(right - left, 0.0)


def _linear_fit_intercept(x: np.ndarray, y: np.ndarray) -> Optional[float]:
    """Least-squares linear fit; return the x-intercept where y crosses 0."""
    if x.size < 2:
        return None
    try:
        coeffs = np.polynomial.polynomial.polyfit(x, y, 1)
    except Exception:
        return None
    slope, intercept = coeffs[1], coeffs[0]
    if abs(slope) < 1e-12:
        return None
    return -intercept / slope


def _clean_list(values: List[float]) -> List[float]:
    return [round(float(v), 6) for v in values]


# ── FTIR engine ─────────────────────────────────────────────────────────

# Realistic FTIR functional-group correlation table (cm⁻¹).
# (lower, upper, group, mode, strength)
FTIR_GROUPS = [
    (3200.0, 3600.0, "O–H stretch", "hydrogen-bonded hydroxyl", "strong, broad"),
    (3000.0, 3100.0, "=C–H stretch", "aromatic / alkene", "medium"),
    (2850.0, 3000.0, "C–H stretch", "aliphatic CH2/CH3", "strong"),
    (2550.0, 3300.0, "O–H stretch", "carboxylic acid (broad)", "strong, broad"),
    (2200.0, 2260.0, "C≡N stretch", "nitrile", "medium, sharp"),
    (2100.0, 2200.0, "C≡C stretch", "alkyne", "weak"),
    (1735.0, 1760.0, "C=O stretch", "ester", "strong"),
    (1700.0, 1735.0, "C=O stretch", "carboxylic acid / ketone", "strong"),
    (1660.0, 1700.0, "C=O stretch", "ketone / aldehyde / amide I", "strong"),
    (1600.0, 1650.0, "C=C stretch / C=O", "alkene / amide I", "medium"),
    (1550.0, 1650.0, "Amide II", "N–H bend + C–N stretch", "medium"),
    (1450.0, 1475.0, "CH2/CH3 bend", "aliphatic deformation", "medium"),
    (1370.0, 1390.0, "CH3 bend", "symmetric deformation", "medium"),
    (1300.0, 1350.0, "C–N stretch", "aromatic amine", "medium"),
    (1230.0, 1300.0, "C–O stretch", "ester / aryl ether", "strong"),
    (1100.0, 1200.0, "C–O–C stretch", "aliphatic ether", "strong"),
    (1000.0, 1100.0, "C–O stretch", "alcohol", "strong"),
    (950.0, 1000.0, "=C–H bend", "alkene out-of-plane", "medium"),
    (850.0, 900.0, "C–H bend", "aromatic out-of-plane (1,3)", "strong"),
    (800.0, 850.0, "C–H bend", "aromatic out-of-plane (1,4)", "strong"),
    (700.0, 800.0, "C–H bend / C–Cl", "monosubstituted aromatic", "strong"),
    (690.0, 720.0, "CH2 rock", "long-chain aliphatic", "medium"),
]


def _assign_ftir_group(position: float) -> Optional[Dict[str, Any]]:
    for lo, hi, group, mode, strength in FTIR_GROUPS:
        if lo <= position <= hi:
            return {
                "group": group,
                "mode": mode,
                "band_range": [lo, hi],
                "strength": strength,
            }
    return None


def analyze_ftir(
    x: List[float],
    y: List[float],
    window: int = 9,
    baseline_order: int = 1,
    prominence_pct: float = 1.0,
    deconvolve_regions: Optional[List[List[float]]] = None,
) -> Dict[str, Any]:
    """FTIR analysis: smoothing, baseline, band detection, functional-group
    identification and optional peak deconvolution."""
    x_arr, y_arr = _as_arrays(x, y)
    smoothed = _savgol(y_arr, max(5, int(window)), 3)
    baseline = _polynomial_baseline(x_arr, smoothed, int(baseline_order))
    corrected = smoothed - baseline
    if corrected.size:
        corrected = corrected - np.min(corrected)

    span = float(np.max(corrected) - np.min(corrected)) if corrected.size else 1.0
    if span <= 0:
        span = 1.0
    prominence = max((float(prominence_pct) / 100.0) * span, _estimate_noise(corrected) * 4.0, 1e-9)

    idx, props = _find_peaks(corrected, prominence, min_distance=max(2, int(window) // 2))
    prominences = list(props.get("prominences", [])) if isinstance(props, dict) else []

    peaks: List[Dict[str, Any]] = []
    for rank, i in enumerate(idx):
        pos = float(x_arr[i])
        intensity = float(corrected[i])
        peak_obj = {
            "position": round(pos, 3),
            "intensity": round(intensity, 6),
            "fwhm": round(_fwhm_interp(x_arr, corrected, int(i)), 3),
            "prominence": round(float(prominences[rank]), 6) if rank < len(prominences) else round(float(prominence), 6),
            "assignment": None,
            "group": None,
        }
        group = _assign_ftir_group(pos)
        if group:
            peak_obj["group"] = group["group"]
            peak_obj["mode"] = group["mode"]
            peak_obj["band_range"] = group["band_range"]
        peaks.append(peak_obj)
    peaks.sort(key=lambda p: p["intensity"], reverse=True)

    # Functional-group summary: most intense peak per identified group.
    functional_groups: Dict[str, Dict[str, Any]] = {}
    for p in peaks:
        group = p.get("group")
        if not group:
            continue
        entry = functional_groups.setdefault(
            group,
            {
                "group": group,
                "mode": p.get("mode"),
                "band_range": p.get("band_range"),
                "peaks": [],
            },
        )
        entry["peaks"].append(
            {"position": p["position"], "intensity": p["intensity"], "fwhm": p["fwhm"]}
        )
    functional_group_list = list(functional_groups.values())

    deconvolution = _ftir_deconvolution(x_arr, corrected, deconvolve_regions or [])

    noise = _estimate_noise(corrected)
    signal = float(np.max(corrected)) if corrected.size else 0.0

    return {
        "engine": "ftir",
        "peaks": peaks,
        "functional_groups": functional_group_list,
        "smoothed": _clean_list(smoothed),
        "baseline": _clean_list(baseline),
        "corrected": _clean_list(corrected),
        "deconvolution": deconvolution,
        "stats": {
            "peak_count": len(peaks),
            "group_count": len(functional_group_list),
            "max_intensity": round(signal, 6),
            "noise_estimate": round(noise, 6),
            "snr": round(signal / noise, 2) if noise > 0 else None,
            "y_min": round(float(np.min(corrected)), 6) if corrected.size else 0.0,
            "y_max": round(float(np.max(corrected)), 6) if corrected.size else 0.0,
        },
        "parameters": {
            "window": int(window),
            "baseline_order": int(baseline_order),
            "prominence_percent": float(prominence_pct),
            "deconvolve_regions": deconvolve_regions or [],
        },
    }


def _ftir_deconvolution(
    x: np.ndarray, y: np.ndarray, regions: List[List[float]]
) -> Dict[str, Any]:
    """Fit overlapping bands inside user-selected regions with a mixture of
    Gaussian + Lorentzian (pseudo-Voigt) components."""
    if not regions:
        return {"regions": [], "parameters": {}, "applied": False}

    fitted_regions = []
    for region in regions:
        if len(region) != 2 or region[0] >= region[1]:
            continue
        mask = (x >= region[0]) & (x <= region[1])
        if mask.sum() < 6:
            continue
        xs = x[mask]
        ys = y[mask]
        base = float(np.min(ys))
        ys_n = ys - base
        peak_idx, _ = _find_peaks(ys_n, max(float(np.max(ys_n)) * 0.05, 1e-9), min_distance=3)
        if peak_idx.size == 0:
            continue
        try:
            from scipy.optimize import least_squares

            n = len(peak_idx)
            centers = [float(xs[i]) for i in peak_idx]
            heights = [float(ys_n[i]) for i in peak_idx]
            widths = [max(_fwhm_interp(xs, ys_n, int(i)) / 2.0, 1.0) for i in peak_idx]
            params0 = []
            for c, h, w in zip(centers, heights, widths):
                params0 += [c, h, w]
            bounds_low = [c - abs(xs[-1] - xs[0]) * 0.5 for c in centers]
            bounds_low += [0.0] * n
            bounds_low += [0.5] * n
            bounds_high = [c + abs(xs[-1] - xs[0]) * 0.5 for c in centers]
            bounds_high += [np.inf] * n
            bounds_high += [abs(xs[-1] - xs[0])] * n

            def model(params):
                model_y = np.zeros_like(xs)
                for k in range(n):
                    c, h, w = params[3 * k : 3 * k + 3]
                    g = h * np.exp(-((xs - c) ** 2) / (2.0 * w**2))
                    l = h / (1.0 + ((xs - c) / w) ** 2)
                    model_y += 0.5 * g + 0.5 * l
                return model_y

            def residuals(params):
                return model(params) - ys_n

            result = least_squares(
                residuals, params0, bounds=(bounds_low, bounds_high), max_nfev=2000
            )
            fitted = model(result.x)
            rss = float(np.sum((fitted - ys_n) ** 2))
            tss = float(np.sum((ys_n - np.mean(ys_n)) ** 2))
            r2 = 1.0 - rss / tss if tss > 0 else None
            components = []
            for k in range(n):
                c, h, w = result.x[3 * k : 3 * k + 3]
                components.append(
                    {
                        "position": round(float(c), 3),
                        "intensity": round(float(h), 6),
                        "fwhm": round(2.0 * abs(w) * np.sqrt(np.log(2.0)), 3),
                        "area": round(float(h) * abs(w) * np.pi * 0.9, 6),
                        "assignment": _assign_ftir_group(float(c)),
                    }
                )
            fitted_regions.append(
                {
                    "range": [float(region[0]), float(region[1])],
                    "components": components,
                    "r_squared": round(r2, 4) if r2 is not None else None,
                    "n_components": n,
                }
            )
        except Exception:
            continue

    return {
        "regions": fitted_regions,
        "applied": len(fitted_regions) > 0,
        "parameters": {"pseudo_voigt": True, "n_regions": len(regions)},
    }


# ── Raman engine ────────────────────────────────────────────────────────

# Characteristic Raman shifts (cm⁻¹) of common materials for identification.
# (material, formula, [characteristic shifts])
RAMAN_REFERENCE = [
    ("Diamond", "C", [1332.0]),
    ("Silicon", "Si", [520.7]),
    ("Graphite", "C", [1350.0, 1580.0, 2700.0]),
    ("Graphene", "C", [1580.0, 2700.0]),
    ("Carbon nanotube", "C", [1580.0, 1350.0]),
    ("Anatase (TiO2)", "TiO2", [144.0, 396.0, 516.0, 639.0]),
    ("Rutile (TiO2)", "TiO2", [143.0, 447.0, 612.0]),
    ("Zinc oxide", "ZnO", [99.0, 437.0, 575.0]),
    ("Quartz", "SiO2", [128.0, 206.0, 464.0]),
    ("Silicon carbide", "SiC", [766.0, 789.0, 972.0]),
    ("Sapphire", "Al2O3", [378.0, 418.0, 645.0, 751.0]),
    ("Calcite", "CaCO3", [281.0, 711.0, 1086.0]),
    ("Barite", "BaSO4", [452.0, 988.0, 1086.0]),
    ("Hematite", "Fe2O3", [225.0, 245.0, 292.0, 411.0, 497.0, 612.0]),
    ("Magnetite", "Fe3O4", [668.0]),
    ("Polystyrene", "PS", [622.0, 1001.0, 1032.0, 1450.0, 1602.0, 3054.0]),
    ("Polyethylene", "PE", [1063.0, 1131.0, 1296.0, 1440.0]),
    ("PMMA", "PMMA", [813.0, 985.0, 1450.0, 1729.0, 2955.0]),
    ("Molybdenum disulfide", "MoS2", [383.0, 408.0]),
    ("Tungsten disulfide", "WS2", [356.0, 417.0]),
    ("Cadmium sulfide", "CdS", [305.0, 600.0]),
]


def _remove_cosmic_rays(
    y: np.ndarray, threshold: float = 6.0, window: int = 5
) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
    """Detect and remove cosmic-ray spikes.

    A cosmic ray is a *narrow* outlier: 1–2 points far above both immediate
    neighbours. Broad physical Raman bands never satisfy the neighbour-drop
    criterion, so they are left untouched.

    Uses the Keenan–Kotula style despike: compare each point to the median of
    its neighbours and require an additional steep fall-off to either side.
    """
    if y.size < 7:
        return y, []
    width = max(2, int(window) // 2)
    med = np.copy(y)
    for i in range(1, y.size - 1):
        lo = max(0, i - width)
        hi = min(y.size, i + width + 1)
        window_vals = np.concatenate([y[lo:i], y[i + 1 : hi]])
        if window_vals.size:
            med[i] = float(np.median(window_vals))
    residual = y - med
    mad = float(np.median(np.abs(residual - np.median(residual))))
    sigma = 1.4826 * mad if mad > 0 else float(np.std(residual))
    signal_range = float(np.max(y) - np.min(y)) if y.size else 0.0
    # Guard against essentially noise-free spectra (perfectly smooth data make
    # the MAD collapse toward zero); the threshold then falls back to the
    # relative criterion below instead of flagging every peak top.
    sigma = max(sigma, signal_range * 1e-9)
    if sigma <= 0:
        return y, []

    removed = []
    mask = np.zeros_like(y, dtype=bool)
    n = y.size
    for i in range(1, n - 1):
        # A cosmic ray is a point (or 2-point run) far above its immediate
        # neighbours. Smooth peak tops and steep flanks never satisfy the
        # local-maximum condition.
        local_max = y[i] >= y[i - 1] and y[i] >= y[i + 1]
        if not local_max:
            continue
        resid = residual[i]
        if resid <= threshold * sigma:
            continue
        # Relative criterion: a cosmic ray stands out against its *local*
        # background, not just against a globally tiny sigma. Requiring it to
        # exceed ~50% of the local median keeps smooth peak tops safe even on
        # perfectly clean spectra.
        if med[i] > 0 and resid <= 0.5 * med[i]:
            continue
        # Width test in the raw domain: a cosmic ray reaches half its excess
        # height within 1–2 data points; physical Raman bands stay elevated for
        # several points regardless of how narrow they are.
        half = y[i] - 0.5 * resid
        search = max(6, 3 * width + 3)
        left = i
        while left > max(0, i - search) and y[left - 1] > half:
            left -= 1
        right = i
        while right < min(n - 1, i + search) and y[right + 1] > half:
            right += 1
        if right - left + 1 > 3:
            continue  # too wide to be a cosmic ray
        # Guard against the steep rise of a narrow real band: the residual must
        # dominate residuals a little further out (immediate neighbours are
        # skipped so adjacent spikes of a 2-point pair do not mask each other).
        far_lo = max(0, left - 2 * width - 1)
        far_hi = min(n, right + 2 * width + 2)
        guard = np.concatenate(
            [residual[far_lo:left], residual[right + 1 : far_hi]]
        )
        if guard.size and resid <= 2.0 * float(np.max(np.abs(guard))):
            continue
        mask[i] = True
        # Two-point spikes: the adjacent point is itself a high local maximum.
        if right - left + 1 > 1:
            mask[right] = True

    indices = np.flatnonzero(mask)
    clean = np.where(mask, med, y)
    for i in indices:
        removed.append(
            {
                "position": int(i),
                "x_value": None,
                "intensity": round(float(y[i]), 6),
                "replacement": round(float(med[i]), 6),
            }
        )
    return clean, removed


def _fit_lorentzians(
    x: np.ndarray,
    y: np.ndarray,
    peak_idx: np.ndarray,
    prominences: List[float],
    tolerance: float = 0.0,
) -> List[Dict[str, Any]]:
    """Fit Raman bands with pure Lorentzian line shapes."""
    try:
        from scipy.optimize import least_squares
    except Exception:
        return []
    n = len(peak_idx)
    if n == 0:
        return []
    centers = [float(x[i]) for i in peak_idx]
    heights = [float(y[i]) for i in peak_idx]
    widths = [max(_fwhm_interp(x, y, int(i)) / 2.0, 0.5) for i in peak_idx]
    params0 = []
    for c, h, w in zip(centers, heights, widths):
        params0 += [c, h, w]
    lo, hi = float(np.min(x)), float(np.max(x))
    spread = hi - lo
    bounds_low = []
    bounds_high = []
    for c in centers:
        bounds_low += [c - spread * 0.5, 0.0, 0.2]
        bounds_high += [c + spread * 0.5, np.inf, spread]

    def lorentz(params):
        model_y = np.zeros_like(y)
        for k in range(n):
            c, h, w = params[3 * k : 3 * k + 3]
            model_y += h / (1.0 + ((x - c) / w) ** 2)
        return model_y

    def residuals(params):
        return lorentz(params) - y

    try:
        result = least_squares(residuals, params0, bounds=(bounds_low, bounds_high), max_nfev=3000)
    except Exception:
        return []
    fitted = lorentz(result.x)
    rss = float(np.sum((fitted - y) ** 2))
    tss = float(np.sum((y - np.mean(y)) ** 2))
    r2 = 1.0 - rss / tss if tss > 0 else None

    peaks = []
    for k in range(n):
        c, h, w = result.x[3 * k : 3 * k + 3]
        peaks.append(
            {
                "position": round(float(c), 3),
                "intensity": round(float(h), 6),
                "fwhm": round(2.0 * abs(w), 3),
                "area": round(float(h) * abs(w) * np.pi, 6),
                "prominence": round(float(prominences[k]), 6) if k < len(prominences) else None,
                "line_shape": "Lorentzian",
            }
        )
    peaks.sort(key=lambda p: p["intensity"], reverse=True)
    return peaks


def _match_raman(peaks: List[Dict[str, Any]], tolerance: float = 12.0) -> Dict[str, Any]:
    """Match detected Raman bands against the reference table."""
    positions = sorted(p["position"] for p in peaks)
    matches = []
    for material, formula, shifts in RAMAN_REFERENCE:
        matched = []
        for shift in shifts:
            for pos in positions:
                if abs(pos - shift) <= tolerance:
                    matched.append({"reference": shift, "detected": pos})
                    break
        if not matched:
            continue
        score = len(matched) / len(shifts)
        intensity_factor = 1.0
        if len(matched) >= 1:
            top = matched[0]["detected"]
            for p in peaks:
                if abs(p["position"] - top) < 1.0:
                    intensity_factor = min(1.0, max(0.0, p["intensity"] / 1.0))
                    break
        confidence = min(1.0, score + 0.1 * intensity_factor)
        matches.append(
            {
                "material": material,
                "formula": formula,
                "matched_bands": matched,
                "reference_bands": shifts,
                "coverage": round(score, 3),
                "score": round(score * 100, 1),
                "confidence": "High" if score >= 0.6 else "Medium" if score >= 0.4 else "Low",
            }
        )
    matches.sort(key=lambda m: m["score"], reverse=True)
    return {
        "matches": matches[:8],
        "tolerance_cm": tolerance,
        "query_band_count": len(peaks),
        "provider": "local-raman-reference",
    }


def analyze_raman(
    x: List[float],
    y: List[float],
    window: int = 5,
    baseline_order: int = 2,
    prominence_pct: float = 2.0,
    cosmic_ray_threshold: float = 6.0,
    material_tolerance: float = 12.0,
) -> Dict[str, Any]:
    """Raman analysis: cosmic-ray removal, background removal, Lorentzian
    peak fitting and material identification."""
    x_arr, y_arr = _as_arrays(x, y)

    cleaned, cosmic_rays = _remove_cosmic_rays(y_arr, threshold=cosmic_ray_threshold)
    for cr in cosmic_rays:
        idx = int(cr.get("position", 0))
        if 0 <= idx < x_arr.size:
            cr["x_value"] = round(float(x_arr[idx]), 3)
    smoothed = _savgol(cleaned, max(5, int(window)), 3)
    baseline = _polynomial_baseline(x_arr, smoothed, int(baseline_order))
    corrected = smoothed - baseline
    if corrected.size:
        corrected = corrected - np.min(corrected)

    span = float(np.max(corrected) - np.min(corrected)) if corrected.size else 1.0
    if span <= 0:
        span = 1.0
    prominence = max((float(prominence_pct) / 100.0) * span, _estimate_noise(corrected) * 4.0, 1e-9)

    idx, props = _find_peaks(corrected, prominence, min_distance=max(2, int(window) // 2))
    prominences = list(props.get("prominences", [])) if isinstance(props, dict) else []

    # Raman bands are Lorentzian — fit line shapes, then report fits.
    fitted = _fit_lorentzians(x_arr, corrected, idx, prominences)

    matching = _match_raman(fitted or [], tolerance=material_tolerance)

    noise = _estimate_noise(corrected)
    signal = float(np.max(corrected)) if corrected.size else 0.0

    return {
        "engine": "raman",
        "peaks": fitted,
        "cosmic_rays": {
            "count": len(cosmic_rays),
            "removed": cosmic_rays,
            "threshold_sigma": cosmic_ray_threshold,
        },
        "smoothed": _clean_list(smoothed),
        "baseline": _clean_list(baseline),
        "corrected": _clean_list(corrected),
        "matching": matching,
        "stats": {
            "peak_count": len(fitted),
            "cosmic_rays_removed": len(cosmic_rays),
            "max_intensity": round(signal, 6),
            "noise_estimate": round(noise, 6),
            "snr": round(signal / noise, 2) if noise > 0 else None,
            "y_min": round(float(np.min(corrected)), 6) if corrected.size else 0.0,
            "y_max": round(float(np.max(corrected)), 6) if corrected.size else 0.0,
        },
        "parameters": {
            "window": int(window),
            "baseline_order": int(baseline_order),
            "prominence_percent": float(prominence_pct),
            "cosmic_ray_threshold": float(cosmic_ray_threshold),
            "material_tolerance": float(material_tolerance),
        },
    }


# ── UV-Vis engine ───────────────────────────────────────────────────────

def _wavelength_to_energy(nm: float) -> float:
    """Convert wavelength (nm) to photon energy (eV)."""
    return 1239.8 / nm if nm else 0.0


def _kubelka_munk(r: np.ndarray) -> np.ndarray:
    """F(R) = (1-R)² / (2R), valid for diffusive reflectance R in (0,1]."""
    r_safe = np.clip(r, 1e-9, 0.999999)
    return (1.0 - r_safe) ** 2 / (2.0 * r_safe)


def _tauc_transform(
    absorption: np.ndarray,
    energy: np.ndarray,
    exponent: float,
) -> Tuple[np.ndarray, np.ndarray]:
    """Compute (α·hν)^(1/n) vs hν where `exponent` is the reciprocal of the
    transition exponent n (direct allowed: n=1/2 ⇒ exponent 2.0; indirect
    allowed: n=2 ⇒ exponent 0.5). For reflectance data α is replaced by the
    Kubelka-Munk function F(R)."""
    positive = absorption > 0
    x = energy[positive]
    y = (absorption[positive] * energy[positive]) ** exponent
    return x, y


def _tauc_band_gap(
    x: np.ndarray,
    y: np.ndarray,
    fit_points: int = 12,
) -> Optional[Dict[str, Any]]:
    """Estimate the band gap by fitting the tangent of steepest slope across
    the absorption onset and extrapolating to the x-axis.

    The onset is bounded between the noise floor and the first local maximum
    of the Tauc curve, which keeps the fit on the fundamental absorption edge
    rather than on band tails or higher-energy transitions.
    """
    if x.size < fit_points + 4:
        return None
    # Sort by energy and smooth to suppress noise before differentiating.
    order = np.argsort(x)
    x, y = x[order], y[order]
    y = _savgol(y, min(11, len(y) if len(y) % 2 else len(y) - 1), 3)

    floor = float(np.percentile(y, 5))
    peak_idx = int(np.argmax(y))
    peak_y = float(y[peak_idx])
    if peak_y <= floor:
        return None
    # Onset: first index rising 15% above the floor (guards against noise).
    onset = next(
        (i for i, v in enumerate(y) if v > floor + 0.15 * (peak_y - floor)),
        0,
    )
    onset = min(onset, peak_idx)

    span = peak_idx - onset
    if span < fit_points:
        # Flat/noisy onset: widen toward the peak's steep side.
        fit_points = max(2, span)
    if peak_idx <= onset:
        peak_idx = min(len(x) - 1, onset + fit_points)

    # Derivative over [onset, peak_idx]; the steepest point anchors the tangent.
    seg = y[onset : peak_idx + 1]
    if len(seg) < 3:
        return None
    deriv = np.gradient(seg, x[onset : peak_idx + 1])
    anchor_rel = int(np.argmax(deriv))
    anchor = onset + anchor_rel
    half = max(1, fit_points // 2)
    lo = max(0, anchor - half)
    hi = min(len(x) - 1, anchor + half)
    if hi - lo < 2:
        hi = min(len(x) - 1, lo + 2)
    seg_x, seg_y = x[lo : hi + 1], y[lo : hi + 1]
    if np.any(seg_y <= 0):
        return None
    coeffs = np.polynomial.polynomial.polyfit(seg_x, seg_y, 1)
    intercept, slope = coeffs[0], coeffs[1]
    if abs(slope) < 1e-12:
        return None
    gap = -intercept / slope
    return {
        "band_gap_eV": round(max(0.0, gap), 3),
        "edge_start_eV": round(float(seg_x[0]), 3),
        "edge_end_eV": round(float(seg_x[-1]), 3),
        "slope": round(float(slope), 4),
        "fit_points": len(seg_x),
        "onset_eV": round(float(x[onset]), 3),
    }


def _assign_transition(position_nm: float) -> Dict[str, Any]:
    if position_nm < 260:
        return {
            "transition": "π → π*",
            "region": "UV (deep)",
            "note": "Strong aromatic / conjugated system absorption",
        }
    if position_nm < 400:
        return {
            "transition": "n → π*",
            "region": "UV (near)",
            "note": "Carbonyl / heteroatom lone-pair transition (typically weak)",
        }
    if position_nm < 780:
        return {
            "transition": "Visible / d–d or CT",
            "region": "Visible",
            "note": "Chromophore or metal-ligand charge transfer absorption",
        }
    return {
        "transition": "NIR / band edge",
        "region": "Near-infrared",
        "note": "Lower-energy optical transitions or band-edge absorption",
    }


def analyze_uvvis(
    x: List[float],
    y: List[float],
    mode: str = "absorbance",
    window: int = 5,
    baseline_order: int = 1,
    prominence_pct: float = 2.0,
    thickness_micron: Optional[float] = None,
) -> Dict[str, Any]:
    """UV-Vis analysis: absorbance/reflectance processing, Kubelka-Munk
    transformation, Tauc plots, direct/indirect band gaps and optical
    transition assignment."""
    x_arr, y_arr = _as_arrays(x, y)
    mode = (mode or "absorbance").strip().lower()
    is_reflectance = mode in ("reflectance", "reflection", "r", "reflect")

    smoothed = _savgol(y_arr, max(3, int(window)), 3)
    baseline = _polynomial_baseline(x_arr, smoothed, int(baseline_order))
    corrected = smoothed - baseline
    if corrected.size:
        corrected = corrected - np.min(corrected)

    # Absorbance proxy for analysis.
    if is_reflectance:
        fr = _kubelka_munk(np.clip(corrected, 0.0, 0.999))
        absorbance = fr
        km_applied = True
    else:
        fr = None
        absorbance = corrected
        km_applied = False

    # Tauc analysis. αhν uses A·hν as a proxy when thickness is unknown.
    energy = np.array([_wavelength_to_energy(nm) for nm in x_arr])
    if thickness_micron:
        alpha = absorbance / max(float(thickness_micron), 1e-6)
    else:
        alpha = absorbance

    direct_x, direct_y = _tauc_transform(alpha, energy, 2.0)
    indirect_x, indirect_y = _tauc_transform(alpha, energy, 0.5)
    direct_gap = _tauc_band_gap(direct_x, direct_y)
    indirect_gap = _tauc_band_gap(indirect_x, indirect_y)

    # Peak analysis on the raw (absorbance) axis.
    span = float(np.max(absorbance) - np.min(absorbance)) if absorbance.size else 1.0
    if span <= 0:
        span = 1.0
    prominence = max((float(prominence_pct) / 100.0) * span, _estimate_noise(absorbance) * 4.0, 1e-9)
    idx, props = _find_peaks(absorbance, prominence, min_distance=max(2, int(window) // 2))
    prominences = list(props.get("prominences", [])) if isinstance(props, dict) else []

    peaks = []
    for rank, i in enumerate(idx):
        pos_nm = float(x_arr[i])
        peaks.append(
            {
                "position_nm": round(pos_nm, 2),
                "energy_eV": round(_wavelength_to_energy(pos_nm), 3),
                "absorbance": round(float(absorbance[i]), 6),
                "fwhm": round(_fwhm_interp(x_arr, absorbance, int(i)), 2),
                "prominence": round(float(prominences[rank]), 6) if rank < len(prominences) else round(float(prominence), 6),
                **_assign_transition(pos_nm),
            }
        )
    peaks.sort(key=lambda p: p["absorbance"], reverse=True)

    transitions: Dict[str, Dict[str, Any]] = {}
    for p in peaks:
        transitions.setdefault(
            p["transition"],
            {"transition": p["transition"], "region": p["region"], "note": p["note"], "peaks": []},
        )["peaks"].append(
            {"position_nm": p["position_nm"], "energy_eV": p["energy_eV"], "absorbance": p["absorbance"]}
        )
    transition_list = list(transitions.values())

    noise = _estimate_noise(absorbance)
    signal = float(np.max(absorbance)) if absorbance.size else 0.0

    return {
        "engine": "uvvis",
        "mode": mode,
        "is_reflectance": is_reflectance,
        "kubelka_munk": {
            "applied": km_applied,
            "f_r": _clean_list(fr) if fr is not None else None,
        },
        "absorbance": _clean_list(absorbance),
        "smoothed": _clean_list(smoothed),
        "baseline": _clean_list(baseline),
        "peaks": peaks,
        "transitions": transition_list,
        "tauc": {
            "energy_eV": [round(float(e), 4) for e in energy],
            "direct": {
                "y": [round(float(v), 6) for v in direct_y],
                "band_gap": direct_gap,
            },
            "indirect": {
                "y": [round(float(v), 6) for v in indirect_y],
                "band_gap": indirect_gap,
            },
            "thickness_micron": thickness_micron,
            "alpha_proxy": "thickness" if thickness_micron else "absorbance",
        },
        "stats": {
            "peak_count": len(peaks),
            "transition_count": len(transition_list),
            "max_absorbance": round(signal, 6),
            "noise_estimate": round(noise, 6),
            "direct_band_gap_eV": (direct_gap or {}).get("band_gap_eV"),
            "indirect_band_gap_eV": (indirect_gap or {}).get("band_gap_eV"),
            "y_min": round(float(np.min(absorbance)), 6) if absorbance.size else 0.0,
            "y_max": round(float(np.max(absorbance)), 6) if absorbance.size else 0.0,
        },
        "parameters": {
            "mode": mode,
            "window": int(window),
            "baseline_order": int(baseline_order),
            "prominence_percent": float(prominence_pct),
            "thickness_micron": thickness_micron,
        },
    }


# ── Dispatch ────────────────────────────────────────────────────────────

ANALYSIS_ENGINES = ("ftir", "raman", "uvvis")


def analyze_instrument(
    technique: str,
    x: List[float],
    y: List[float],
    parameters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Dispatch to the instrument-specific analysis engine."""
    params = parameters or {}
    technique = (technique or "").strip().lower()
    if technique == "ftir":
        return analyze_ftir(
            x,
            y,
            window=int(params.get("window", 9)),
            baseline_order=int(params.get("baseline_order", 1)),
            prominence_pct=float(params.get("prominence_percent", params.get("prominence", 1.0))),
            deconvolve_regions=params.get("deconvolve_regions") or [],
        )
    if technique == "raman":
        return analyze_raman(
            x,
            y,
            window=int(params.get("window", 5)),
            baseline_order=int(params.get("baseline_order", 2)),
            prominence_pct=float(params.get("prominence_percent", params.get("prominence", 2.0))),
            cosmic_ray_threshold=float(params.get("cosmic_ray_threshold", 6.0)),
            material_tolerance=float(params.get("material_tolerance", 12.0)),
        )
    if technique == "uvvis":
        return analyze_uvvis(
            x,
            y,
            mode=str(params.get("mode", "absorbance")),
            window=int(params.get("window", 5)),
            baseline_order=int(params.get("baseline_order", 1)),
            prominence_pct=float(params.get("prominence_percent", params.get("prominence", 2.0))),
            thickness_micron=float(params["thickness_micron"]) if params.get("thickness_micron") else None,
        )
    raise ValueError(f"Unsupported instrument: {technique}")
