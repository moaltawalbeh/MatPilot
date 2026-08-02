"""Real Peak Detection Algorithm.

Detects diffraction peaks in an XRD pattern.

Algorithm (scientifically standard):
1. Peaks are located with ``scipy.signal.find_peaks``, which locates true
   local maxima (NOT the inflection points used by second-derivative methods
   that systematically bias positions toward lower 2-theta).
2. Each candidate is retained only if its prominence exceeds BOTH:
   - ``min_prominence_ratio`` x the maximum intensity (relative peak strength),
   - ``min_prominence_snr`` x the estimated noise level (robust MAD-based),
   so weak statistical fluctuations of the background are not reported as peaks.
3. Peaks closer than ``min_distance_deg`` are suppressed (strongest wins).
4. Positions are refined to sub-point accuracy by parabolic interpolation of
   the smoothed pattern.
5. FWHM, integrated area (baseline to baseline) and d-spacing are computed.

Noise is estimated from the median absolute deviation of the first differences,
which is robust against slow background trends.
"""

import math
from typing import List, Optional
import numpy as np
from backend.domain.value_objects.peak import Peak
from backend.infrastructure.logging.structured_logger import get_logger

logger = get_logger("peak_detection")


def smooth_savitzky_golay(data: List[float], window_size: int = 11, poly_order: int = 3) -> List[float]:
    """Savitzky-Golay smoothing filter using scipy.

    Fits a polynomial of degree poly_order in a sliding window of window_size points.
    Preserves peak shapes better than simple moving average.
    """
    try:
        from scipy.signal import savgol_filter
        arr = [float(x) for x in data]
        if len(arr) < window_size:
            window_size = len(arr) if len(arr) % 2 == 1 else len(arr) - 1
        if window_size < poly_order + 1:
            window_size = poly_order + 2 if (poly_order + 2) % 2 == 1 else poly_order + 1
        if window_size > len(arr):
            return data[:]
        smoothed = savgol_filter(arr, window_size, poly_order)
        return smoothed.tolist()
    except ImportError:
        # Fallback: simple moving average
        half_w = window_size // 2
        smoothed = []
        for i in range(len(data)):
            start = max(0, i - half_w)
            end = min(len(data), i + half_w + 1)
            window = data[start:end]
            smoothed.append(sum(window) / len(window))
        return smoothed


def _adaptive_window(step_size: float, poly_order: int = 3) -> int:
    """Pick a Savitzky-Golay window that never exceeds ~0.4 degrees of data,
    clamped to [poly_order+1, 15] and always odd.

    A window proportional to the 2-theta step prevents over-smoothing of narrow
    peaks when the pattern is sparsely sampled.
    """
    if step_size <= 0:
        window = 11
    else:
        window = max(poly_order + 1, int(round(0.4 / step_size)))
        if window % 2 == 0:
            window += 1
    return max(poly_order + 1, min(15, window))


def _estimate_noise_std(intensity: np.ndarray) -> float:
    """Robust estimate of the additive noise standard deviation.

    Uses the median absolute deviation (MAD) of the first differences:
    sigma = MAD(diff) / (0.6745 * sqrt(2)).
    This is insensitive to slow background trends and broad peak envelopes.
    """
    if len(intensity) < 3:
        return 0.0
    diffs = np.diff(intensity)
    if len(diffs) == 0:
        return 0.0
    median = float(np.median(diffs))
    mad = float(np.median(np.abs(diffs - median)))
    return mad / 0.6745 / math.sqrt(2.0)


def parabolic_refine(two_theta: np.ndarray, intensity: np.ndarray, idx: int) -> tuple:
    """Refine a peak position by fitting a parabola through the three points
    around a local maximum. Returns (refined_2theta, refined_height)."""
    if idx <= 0 or idx >= len(intensity) - 1:
        return float(two_theta[idx]), float(intensity[idx])

    y_prev = float(intensity[idx - 1])
    y_0 = float(intensity[idx])
    y_next = float(intensity[idx + 1])

    denom = y_prev - 2.0 * y_0 + y_next
    if abs(denom) < 1e-12:
        return float(two_theta[idx]), y_0

    # Offset in fractional index units
    offset = 0.5 * (y_prev - y_next) / denom
    if abs(offset) > 1.0:
        offset = 0.0

    x0 = float(two_theta[idx])
    x_prev = float(two_theta[idx - 1])
    x_next = float(two_theta[idx + 1])
    dx = 0.0
    if x_next - x_prev != 0:
        dx = x_next - x_prev
    if dx == 0:
        dx = 1e-9

    refined_x = x0 + offset * dx
    refined_y = y_0 - 0.25 * (y_prev - y_next) * offset
    return refined_x, refined_y


def compute_fwhm(
    intensity: np.ndarray,
    two_theta: np.ndarray,
    peak_idx: int,
    left_bound: Optional[int] = None,
    right_bound: Optional[int] = None,
) -> Optional[float]:
    """Compute Full Width at Half Maximum for a peak.

    The half-maximum level is measured relative to the local baseline (the
    higher of the two boundary intensities), not relative to zero, so peaks
    sitting on a background get a meaningful width. Uses linear interpolation
    for sub-point accuracy. Returns None when the half-maximum level is never
    crossed within the peak basin (boundary or heavily overlapped peaks).
    """
    n = len(intensity)
    if peak_idx < 0 or peak_idx >= n:
        return None

    peak_height = float(intensity[peak_idx])
    if peak_height <= 0:
        return None

    left_limit = 0 if left_bound is None else max(0, int(left_bound))
    right_limit = n - 1 if right_bound is None else min(n - 1, int(right_bound))
    if right_limit <= left_limit:
        return None

    baseline = max(float(intensity[left_limit]), float(intensity[right_limit]))
    if baseline >= peak_height:
        return None
    half_max = baseline + (peak_height - baseline) / 2.0

    left_idx = peak_idx
    while left_idx > left_limit and intensity[left_idx] > half_max:
        left_idx -= 1
    if intensity[left_idx] > half_max:
        return None

    left_pos = float(two_theta[left_idx])
    if left_idx + 1 < n and intensity[left_idx + 1] > intensity[left_idx]:
        denom = intensity[left_idx + 1] - intensity[left_idx]
        if denom > 1e-12:
            frac = (half_max - intensity[left_idx]) / denom
            left_pos += frac * (two_theta[left_idx + 1] - two_theta[left_idx])

    right_idx = peak_idx
    while right_idx < right_limit and intensity[right_idx] > half_max:
        right_idx += 1
    if intensity[right_idx] > half_max:
        return None

    right_pos = float(two_theta[right_idx])
    if right_idx - 1 >= 0 and intensity[right_idx - 1] > intensity[right_idx]:
        denom = intensity[right_idx - 1] - intensity[right_idx]
        if denom > 1e-12:
            frac = (half_max - intensity[right_idx]) / denom
            right_pos -= frac * (two_theta[right_idx] - two_theta[right_idx - 1])

    fwhm = right_pos - left_pos
    if fwhm <= 0:
        return None
    return fwhm


def compute_peak_area(intensity: np.ndarray, two_theta: np.ndarray,
                      left_idx: int, peak_idx: int, right_idx: int) -> float:
    """Compute peak area using trapezoidal integration over a flat baseline.

    The baseline is the minimum of the intensities at the peak boundaries.
    """
    if left_idx >= peak_idx or peak_idx >= right_idx:
        return 0.0

    left_val = float(intensity[left_idx])
    right_val = float(intensity[right_idx])
    baseline = min(left_val, right_val)

    area = 0.0
    for i in range(left_idx, right_idx):
        dt = two_theta[i + 1] - two_theta[i]
        area += (intensity[i] + intensity[i + 1] - 2.0 * baseline) * dt / 2.0

    return max(0.0, area)


def detect_peaks(
    two_theta: List[float],
    intensity: List[float],
    min_prominence_ratio: float = 0.02,
    min_distance_deg: float = 0.3,
    wavelength_angstrom: Optional[float] = None,
    smooth_window: int = 11,
    min_prominence_snr: float = 4.0,
) -> List[Peak]:
    """
    Detect peaks in an XRD pattern.

    Algorithm:
    1. Smooth the pattern with a shape-preserving Savitzky-Golay filter
       (~0.4 deg window) to suppress high-frequency noise bumps.
    2. Locate true local maxima on the smoothed profile (scipy.signal.find_peaks).
    3. Filter by prominence: max(ratio x max_intensity, snr x noise_std),
       where noise_std is estimated from the RAW data so smoothing does not
       make the significance criterion self-referential.
    4. Enforce a minimum separation between peaks.
    5. Refine positions by parabolic interpolation on the raw data.
    6. Compute FWHM, area and d-spacing on the smoothed profile.

    Args:
        two_theta: List of 2-theta angles (degrees).
        intensity: List of intensity values.
        min_prominence_ratio: Minimum peak prominence as fraction of max intensity.
        min_distance_deg: Minimum distance between peaks in degrees.
        wavelength_angstrom: X-ray wavelength for d-spacing calculation.
        smooth_window: Savitzky-Golay window used for FWHM/area estimation.
        min_prominence_snr: Minimum peak prominence as a multiple of the
            estimated noise standard deviation.

    Returns:
        List of detected Peak objects, sorted by 2-theta.
    """
    if len(two_theta) < 10 or len(two_theta) != len(intensity):
        logger.warning("Invalid input data for peak detection", points=len(two_theta))
        return []

    tt = np.asarray(two_theta, dtype=np.float64)
    ii = np.asarray(intensity, dtype=np.float64)

    max_intensity = float(np.max(ii)) if len(ii) else 0.0
    if max_intensity <= 0:
        return []

    if smooth_window % 2 == 0:
        smooth_window += 1

    step = float(np.median(np.abs(np.diff(tt)))) if len(tt) > 1 else 1.0
    noise = _estimate_noise_std(ii)

    # Prominence threshold: strong enough relative to the strongest peak AND
    # statistically significant above the noise (noise from RAW data).
    prominence_threshold = max(
        min_prominence_ratio * max_intensity,
        min_prominence_snr * noise,
    )

    distance = max(1, int(min_distance_deg / step)) if step > 0 else 1

    logger.info(
        "Starting peak detection", points=len(two_theta),
        min_prominence=round(prominence_threshold, 4), min_distance=min_distance_deg,
        noise_std=round(noise, 4),
    )

    # Shape-preserving smooth for peak finding AND FWHM / area estimation.
    # Peaks are detected on the smoothed profile so single-channel noise
    # bumps do not register as peaks, while the significance threshold uses
    # the raw-data noise estimate (see docstring).
    if smooth_window < 3:
        smooth_window = 3
    window = _adaptive_window(step)
    if window < smooth_window and smooth_window <= 15:
        window = smooth_window if window >= 3 else 3
    sm = np.asarray(smooth_savitzky_golay(ii.tolist(), window_size=window, poly_order=3), dtype=np.float64)

    try:
        from scipy.signal import find_peaks
        peak_indices, props = find_peaks(
            sm,
            prominence=prominence_threshold,
            distance=distance,
        )
    except ImportError:
        logger.warning("scipy not available; falling back to simple detection")
        peak_indices = [int(np.argmax(sm))]
        props = {"left_bases": [0], "right_bases": [len(sm) - 1], "prominences": [max_intensity]}

    left_bases = props.get("left_bases", [0] * len(peak_indices))
    right_bases = props.get("right_bases", [len(sm) - 1] * len(peak_indices))

    peaks = []
    for n_i, idx in enumerate(peak_indices):
        refined_x, refined_y = parabolic_refine(tt, ii, int(idx))

        left_idx = max(0, int(left_bases[n_i]))
        right_idx = min(len(sm) - 1, int(right_bases[n_i]))
        if right_idx <= left_idx:
            left_idx = max(0, int(idx) - 2)
            right_idx = min(len(sm) - 1, int(idx) + 2)

        fwhm = compute_fwhm(sm, tt, int(idx), left_idx, right_idx)

        area = compute_peak_area(sm, tt, left_idx, int(idx), right_idx)

        d_spacing = None
        if wavelength_angstrom and refined_x > 0:
            theta_rad = math.radians(refined_x / 2.0)
            sin_theta = math.sin(theta_rad)
            if sin_theta > 0:
                d_spacing = wavelength_angstrom / (2.0 * sin_theta)

        peak = Peak(
            two_theta=round(refined_x, 4),
            intensity=round(refined_y, 2),
            fwhm=round(fwhm, 4) if fwhm else None,
            area=round(area, 2),
            d_spacing=round(d_spacing, 4) if d_spacing else None,
        )
        peaks.append(peak)

    peaks.sort()

    logger.info("Peak detection complete", peaks_found=len(peaks))
    return peaks
