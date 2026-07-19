"""Background Correction Service.

Estimates and subtracts the diffraction pattern background using
iterative polynomial fitting (similar to the "snip" algorithm in commercial software).

The background is estimated by fitting a low-order polynomial to the lower envelope
of the pattern, iteratively rejecting points above the current estimate.
"""

import logging
import numpy as np
from typing import List, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger("background_correction")


@dataclass
class BackgroundResult:
    """Result of background correction."""
    two_theta: List[float]
    intensity_corrected: List[float]
    background: List[float]
    polynomial_coeffs: List[float]
    iterations: int


def estimate_background(
    two_theta: np.ndarray,
    intensity: np.ndarray,
    polynomial_order: int = 6,
    max_iterations: int = 50,
    convergence_threshold: float = 0.01,
    sigma_threshold: float = 3.0,
) -> Tuple[np.ndarray, np.ndarray, List[float], int]:
    """Estimate background using iterative polynomial fitting.

    Algorithm:
    1. Fit a polynomial to all data points.
    2. Identify points below or near the polynomial as background.
    3. Re-fit polynomial to background points only.
    4. Repeat until convergence.

    Args:
        two_theta: 2-theta positions (array of floats).
        intensity: Measured intensities (array of floats).
        polynomial_order: Degree of the polynomial (default 6).
        max_iterations: Maximum number of iterations.
        convergence_threshold: Stop when max normalized change < this value.
        sigma_threshold: Number of std devs for outlier rejection.

    Returns:
        (intensity_corrected, background, polynomial_coeffs, actual_iterations)
    """
    n = len(intensity)
    if n < polynomial_order + 1:
        return intensity.copy(), np.zeros_like(intensity), [0.0], 0

    # Normalize for numerical stability
    i_max = np.max(intensity)
    if i_max <= 0:
        return intensity.copy(), np.zeros_like(intensity), [0.0], 0

    i_norm = intensity / i_max

    # Initial fit to all data
    coeffs = np.polyfit(two_theta, i_norm, polynomial_order)
    bg = np.polyval(coeffs, two_theta)

    actual_iterations = 0
    for iteration in range(max_iterations):
        actual_iterations = iteration + 1
        # Points below or near the background are "background points"
        residual = i_norm - bg
        sigma = np.std(residual)
        if sigma <= 0:
            break
        mask = residual <= sigma_threshold * sigma

        if np.sum(mask) < polynomial_order + 1:
            break

        # Re-fit to background points only
        new_coeffs = np.polyfit(two_theta[mask], i_norm[mask], polynomial_order)
        new_bg = np.polyval(new_coeffs, two_theta)

        # Check convergence (compare in normalized space)
        max_change = np.max(np.abs(bg - new_bg))
        bg = new_bg
        coeffs = new_coeffs

        if max_change < convergence_threshold:
            logger.debug("Background converged after %d iterations", actual_iterations)
            break

    background = bg * i_max
    intensity_corrected = intensity - background
    # Ensure no negative intensities
    intensity_corrected = np.maximum(intensity_corrected, 0.0)

    return intensity_corrected, background, coeffs.tolist(), actual_iterations


def correct_background(
    two_theta: List[float],
    intensity: List[float],
    polynomial_order: int = 6,
    max_iterations: int = 50,
) -> BackgroundResult:
    """Estimate and subtract background from a diffraction pattern.

    Args:
        two_theta: 2-theta positions.
        intensity: Measured intensities.
        polynomial_order: Degree of fitting polynomial.
        max_iterations: Max fitting iterations.

    Returns:
        BackgroundResult with corrected intensity, background, and metadata.
    """
    tt = np.array(two_theta, dtype=float)
    ii = np.array(intensity, dtype=float)

    corrected, background, coeffs, actual_iterations = estimate_background(
        tt, ii,
        polynomial_order=polynomial_order,
        max_iterations=max_iterations,
    )

    return BackgroundResult(
        two_theta=two_theta,
        intensity_corrected=corrected.tolist(),
        background=background.tolist(),
        polynomial_coeffs=coeffs,
        iterations=actual_iterations,
    )
