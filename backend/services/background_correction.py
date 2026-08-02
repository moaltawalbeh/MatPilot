"""Background Correction Service.

Estimates and subtracts the diffraction pattern background.

Two validated model-free methods are provided (see
docs/research_ka2_background.md §4):

  * **Iterative polynomial fitting** (default): fits a low-order polynomial to
    the lower envelope of the pattern, iteratively rejecting points that lie
    more than `sigma_threshold` standard deviations above the current
    estimate. This is the classic "iterative polynomial background" used by
    many XRD packages.

  * **SNIP** (Statistics-sensitive Non-linear Iterative Peak-clipping, Ryan
    et al. 1988): log-log-sqrt transform, iterative clipping of the
    transformed spectrum with a growing window radius, inverse transform.
    Recommended by the research report as the default for automatic use.
    Select with ``method="snip"``.
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


def _lls_transform(intensity: np.ndarray) -> np.ndarray:
    """LLS (log-log-sqrt) transform that compresses dynamic range.

    v(i) = log( log( sqrt( y(i) + 1 ) + 1 ) + 1 )
    """
    return np.log(np.log(np.sqrt(intensity + 1.0) + 1.0) + 1.0)


def _lls_inverse(v: np.ndarray) -> np.ndarray:
    """Inverse of the LLS transform."""
    inner = np.exp(np.exp(v) - 1.0) - 1.0
    return inner * inner - 1.0


def estimate_background_snip(
    intensity: np.ndarray,
    clip_window: int = 20,
) -> Tuple[np.ndarray, int]:
    """Estimate the background using SNIP (Ryan et al., 1988).

    Algorithm:
      1. Transform the data with the LLS transform.
      2. Iteratively clip each channel to the mean of its two neighbours at
         window radius p = 1 … m (increasing window), where the window width
         2m+1 approximates the width of the widest feature to preserve.
      3. Invert the transform to recover the background estimate.

    Args:
        intensity: Measured intensities (array of floats).
        clip_window: Maximum clipping window radius m. Choose so that
            2m+1 ≈ the width (in points) of the broadest feature to preserve.

    Returns:
        (background_estimate, clip_passes) where clip_passes = clip_window.
    """
    n = len(intensity)
    if n < 3 or clip_window < 1:
        return np.zeros_like(np.asarray(intensity, dtype=float)), 0

    m = int(clip_window)
    if m > (n - 1) // 2:
        m = max(1, (n - 1) // 2)

    v = _lls_transform(np.asarray(intensity, dtype=float))
    v_prev = v.copy()

    for p in range(1, m + 1):
        v_new = v_prev.copy()
        for i in range(p, n - p):
            avg = 0.5 * (v_prev[i - p] + v_prev[i + p])
            if v_new[i] > avg:
                v_new[i] = avg
        v_prev = v_new

    background = np.maximum(_lls_inverse(v_prev), 0.0)
    return background, m


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
    intensity = np.asarray(intensity, dtype=float)
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
        # Lower-envelope refinement: points below the current polynomial are
        # background, points well above it are peaks. The scale sigma must be
        # computed from the sub-fit residuals only, otherwise tall peaks
        # inflate sigma and get absorbed into the background.
        residual = i_norm - bg
        below = residual[residual <= 0.0]
        if len(below) > 1:
            sigma = np.std(below)
        else:
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
    intensity_corrected = np.maximum(intensity - background, 0.0)

    return intensity_corrected, background, coeffs.tolist(), actual_iterations


def correct_background(
    two_theta: List[float],
    intensity: List[float],
    polynomial_order: int = 6,
    max_iterations: int = 50,
    method: str = "poly",
    clip_window: int = 20,
) -> BackgroundResult:
    """Estimate and subtract background from a diffraction pattern.

    Args:
        two_theta: 2-theta positions.
        intensity: Measured intensities.
        polynomial_order: Degree of fitting polynomial (iterative polynomial
            method only).
        max_iterations: Max fitting iterations (iterative polynomial method
            only).
        method: Background estimator, one of "poly" (iterative polynomial,
            default) or "snip" (Ryan et al. 1988).
        clip_window: SNIP clipping window radius m (2m+1 ≈ widest feature
            width in points). Ignored for the polynomial method.

    Returns:
        BackgroundResult with corrected intensity, background, and metadata.
    """
    tt = np.array(two_theta, dtype=float)
    ii = np.array(intensity, dtype=float)

    if method == "snip":
        background, clip_passes = estimate_background_snip(ii, clip_window=clip_window)
        background = np.clip(background, 0.0, None)
        corrected = np.maximum(ii - background, 0.0)
        return BackgroundResult(
            two_theta=two_theta,
            intensity_corrected=corrected.tolist(),
            background=background.tolist(),
            polynomial_coeffs=[],
            iterations=clip_passes,
        )

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
