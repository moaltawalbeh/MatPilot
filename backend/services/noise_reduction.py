"""Noise Reduction Service.

Applies Savitzky-Golay smoothing to reduce noise in diffraction patterns
while preserving peak shapes and positions.
"""

import logging
import numpy as np
from typing import List
from dataclasses import dataclass

logger = logging.getLogger("noise_reduction")


@dataclass
class NoiseReductionResult:
    """Result of noise reduction."""
    two_theta: List[float]
    intensity_smoothed: List[float]
    window_size: int
    polynomial_order: int


def _savgol_smooth(
    intensity: np.ndarray,
    window_size: int = 11,
    polynomial_order: int = 3,
) -> np.ndarray:
    """Apply Savitzky-Golay filter for smoothing.

    Falls back to simple moving average if scipy is unavailable.

    Args:
        intensity: Input intensity array.
        window_size: Filter window size (must be odd).
        polynomial_order: Polynomial order for local fitting.

    Returns:
        Smoothed intensity array.
    """
    # Ensure window_size is odd
    if window_size % 2 == 0:
        window_size += 1

    # Ensure window_size > polynomial_order
    if window_size <= polynomial_order:
        window_size = polynomial_order + 2
        if window_size % 2 == 0:
            window_size += 1

    try:
        from scipy.signal import savgol_filter
        smoothed = savgol_filter(
            intensity, window_size, polynomial_order, deriv=0, mode="nearest"
        )
        return smoothed
    except ImportError:
        logger.warning("scipy not available, using moving average fallback")
        # Fallback: simple moving average
        kernel = np.ones(window_size) / window_size
        smoothed = np.convolve(intensity, kernel, mode="same")
        return smoothed


def reduce_noise(
    two_theta: List[float],
    intensity: List[float],
    window_size: int = 11,
    polynomial_order: int = 3,
) -> NoiseReductionResult:
    """Apply noise reduction to a diffraction pattern.

    Uses Savitzky-Golay filtering which preserves peak shapes better
    than simple moving average.

    Args:
        two_theta: 2-theta positions.
        intensity: Measured intensities.
        window_size: Filter window size (must be odd, default 11).
        polynomial_order: Polynomial order for local fitting (default 3).

    Returns:
        NoiseReductionResult with smoothed intensity.
    """
    ii = np.array(intensity, dtype=float)

    smoothed = _savgol_smooth(ii, window_size, polynomial_order)
    # Ensure no negative intensities
    smoothed = np.maximum(smoothed, 0.0)

    return NoiseReductionResult(
        two_theta=two_theta,
        intensity_smoothed=smoothed.tolist(),
        window_size=window_size,
        polynomial_order=polynomial_order,
    )
