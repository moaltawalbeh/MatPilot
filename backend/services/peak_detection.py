
"""Real Peak Detection Algorithm.

Implements second-derivative peak detection for XRD patterns.
Uses scipy Savitzky-Golay filter for proper smoothing.
"""

import math
from typing import List, Tuple, Optional
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


def compute_derivative(data: List[float], spacing: float = 1.0) -> List[float]:
    """Compute first derivative using central differences."""
    if len(data) < 2:
        return [0.0] * len(data)

    deriv = [0.0] * len(data)
    deriv[0] = (data[1] - data[0]) / spacing
    deriv[-1] = (data[-1] - data[-2]) / spacing

    for i in range(1, len(data) - 1):
        deriv[i] = (data[i + 1] - data[i - 1]) / (2.0 * spacing)

    return deriv


def compute_second_derivative(data: List[float], spacing: float = 1.0) -> List[float]:
    """Compute second derivative."""
    first = compute_derivative(data, spacing)
    return compute_derivative(first, spacing)


def find_zero_crossings(deriv: List[float]) -> List[int]:
    """Find indices where derivative crosses zero (from positive to negative)."""
    crossings = []
    for i in range(1, len(deriv)):
        if deriv[i - 1] > 0 and deriv[i] <= 0:
            crossings.append(i)
    return crossings


def compute_fwhm(intensity: List[float], peak_idx: int, two_theta: List[float]) -> Optional[float]:
    """Compute Full Width at Half Maximum for a peak.

    Uses linear interpolation for sub-point accuracy.
    Returns estimated FWHM even for boundary peaks.
    """
    if peak_idx < 0 or peak_idx >= len(intensity):
        return None

    peak_height = intensity[peak_idx]
    if peak_height <= 0:
        return None

    half_max = peak_height / 2.0

    left_idx = peak_idx
    while left_idx > 0 and intensity[left_idx] > half_max:
        left_idx -= 1

    right_idx = peak_idx
    while right_idx < len(intensity) - 1 and intensity[right_idx] > half_max:
        right_idx += 1

    # Interpolate for sub-point accuracy
    if left_idx > 0 and intensity[left_idx] <= half_max:
        # Linear interpolation between left_idx and left_idx+1
        frac = (half_max - intensity[left_idx]) / max(intensity[left_idx + 1] - intensity[left_idx], 1e-10)
        left_pos = two_theta[left_idx] + frac * (two_theta[left_idx + 1] - two_theta[left_idx])
    else:
        left_pos = two_theta[left_idx]

    if right_idx < len(intensity) - 1 and intensity[right_idx] <= half_max:
        frac = (half_max - intensity[right_idx]) / max(intensity[right_idx - 1] - intensity[right_idx], 1e-10)
        right_pos = two_theta[right_idx] + frac * (two_theta[right_idx - 1] - two_theta[right_idx])
    else:
        right_pos = two_theta[min(right_idx, len(two_theta) - 1)]

    fwhm = right_pos - left_pos
    if fwhm <= 0 or fwhm > 2.0:
        return None
    return fwhm


def compute_peak_area(intensity: List[float], two_theta: List[float],
                      left_idx: int, peak_idx: int, right_idx: int) -> float:
    """Compute peak area using trapezoidal integration."""
    if left_idx >= peak_idx or peak_idx >= right_idx:
        return 0.0

    area = 0.0
    for i in range(left_idx, right_idx):
        dt = two_theta[i + 1] - two_theta[i]
        area += (intensity[i] + intensity[i + 1]) * dt / 2.0

    return area


def detect_peaks(
    two_theta: List[float],
    intensity: List[float],
    min_prominence_ratio: float = 0.02,
    min_distance_deg: float = 0.3,
    wavelength_angstrom: Optional[float] = None,
    smooth_window: int = 11,
) -> List[Peak]:
    """
    Detect peaks in XRD pattern using second-derivative method.

    Algorithm:
    1. Smooth the data with Savitzky-Golay filter
    2. Compute second derivative
    3. Find zero crossings (maxima in original data)
    4. Filter by prominence (minimum peak height relative to max)
    5. Filter by minimum distance between peaks
    6. Compute FWHM, area, and d-spacing for each peak

    Args:
        two_theta: List of 2-theta angles (degrees)
        intensity: List of intensity values
        min_prominence_ratio: Minimum peak height as fraction of max intensity
        min_distance_deg: Minimum distance between peaks in degrees
        wavelength_angstrom: X-ray wavelength for d-spacing calculation
        smooth_window: Window size for Savitzky-Golay smoothing (must be odd)

    Returns:
        List of detected Peak objects, sorted by 2-theta
    """
    if len(two_theta) < 10 or len(two_theta) != len(intensity):
        logger.warning("Invalid input data for peak detection", points=len(two_theta))
        return []

    logger.info("Starting peak detection", points=len(two_theta),
                min_prominence=min_prominence_ratio, min_distance=min_distance_deg)

    step_size = two_theta[1] - two_theta[0] if len(two_theta) > 1 else 1.0

    # Ensure odd window size for scipy
    if smooth_window % 2 == 0:
        smooth_window += 1
    smoothed = smooth_savitzky_golay(intensity, window_size=smooth_window, poly_order=3)

    max_intensity = max(smoothed) if smoothed else 1.0
    min_intensity = min_prominence_ratio * max_intensity

    second_deriv = compute_second_derivative(smoothed, step_size)

    zero_crossings = find_zero_crossings(second_deriv)

    candidate_peaks = []
    for idx in zero_crossings:
        if smoothed[idx] >= min_intensity:
            candidate_peaks.append((idx, smoothed[idx]))

    candidate_peaks.sort(key=lambda x: x[1], reverse=True)

    filtered_peaks = []
    min_distance_idx = max(1, int(min_distance_deg / step_size))

    for idx, height in candidate_peaks:
        too_close = False
        for existing_idx, _ in filtered_peaks:
            if abs(idx - existing_idx) < min_distance_idx:
                too_close = True
                break
        if not too_close:
            filtered_peaks.append((idx, height))

    peaks = []
    for idx, height in filtered_peaks:
        fwhm = compute_fwhm(smoothed, idx, two_theta)

        left_idx = idx
        while left_idx > 0 and smoothed[left_idx] > min_intensity:
            left_idx -= 1
        right_idx = idx
        while right_idx < len(smoothed) - 1 and smoothed[right_idx] > min_intensity:
            right_idx += 1

        area = compute_peak_area(smoothed, two_theta, left_idx, idx, right_idx)

        d_spacing = None
        if wavelength_angstrom and two_theta[idx] > 0:
            theta_rad = math.radians(two_theta[idx] / 2.0)
            sin_theta = math.sin(theta_rad)
            if sin_theta > 0:
                d_spacing = wavelength_angstrom / (2.0 * sin_theta)

        peak = Peak(
            two_theta=round(two_theta[idx], 4),
            intensity=round(height, 2),
            fwhm=round(fwhm, 4) if fwhm else None,
            area=round(area, 2),
            d_spacing=round(d_spacing, 4) if d_spacing else None,
        )
        peaks.append(peak)

    peaks.sort()

    logger.info("Peak detection complete", peaks_found=len(peaks))
    return peaks
