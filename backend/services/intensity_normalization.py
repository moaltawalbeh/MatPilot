"""Intensity Normalization Service.

Normalizes diffraction pattern intensities to a standard scale.
Supports max-normalization, area normalization, and reference-peak normalization.
"""

import logging
import numpy as np
from typing import List, Optional
from dataclasses import dataclass

logger = logging.getLogger("intensity_normalization")


@dataclass
class NormalizationResult:
    """Result of intensity normalization."""
    two_theta: List[float]
    intensity_normalized: List[float]
    scale_factor: float
    method: str


def normalize_max(
    two_theta: List[float],
    intensity: List[float],
) -> NormalizationResult:
    """Normalize intensities so the maximum peak equals 100.

    This is the standard normalization for XRD patterns.

    Args:
        two_theta: 2-theta positions.
        intensity: Measured intensities.

    Returns:
        NormalizationResult with normalized intensities.
    """
    ii = np.array(intensity, dtype=float)
    i_max = np.max(ii)

    if i_max <= 0:
        return NormalizationResult(
            two_theta=two_theta,
            intensity_normalized=intensity.copy(),
            scale_factor=1.0,
            method="max",
        )

    normalized = (ii / i_max) * 100.0

    return NormalizationResult(
        two_theta=two_theta,
        intensity_normalized=normalized.tolist(),
        scale_factor=i_max / 100.0,
        method="max",
    )


def normalize_area(
    two_theta: List[float],
    intensity: List[float],
) -> NormalizationResult:
    """Normalize intensities so the total integrated area equals 1.

    Useful for comparing patterns with different collection times.

    Args:
        two_theta: 2-theta positions.
        intensity: Measured intensities.

    Returns:
        NormalizationResult with normalized intensities.
    """
    tt = np.array(two_theta, dtype=float)
    ii = np.array(intensity, dtype=float)

    # Trapezoidal integration
    area = np.trapezoid(ii, tt)

    if area <= 0:
        return NormalizationResult(
            two_theta=two_theta,
            intensity_normalized=intensity.copy(),
            scale_factor=1.0,
            method="area",
        )

    normalized = ii / area

    return NormalizationResult(
        two_theta=two_theta,
        intensity_normalized=normalized.tolist(),
        scale_factor=1.0 / area,
        method="area",
    )


def normalize_to_peak(
    two_theta: List[float],
    intensity: List[float],
    reference_2theta: float,
    tolerance: float = 0.5,
) -> NormalizationResult:
    """Normalize intensities so a specific peak equals 100.

    Useful when comparing to reference patterns that use a specific
    peak for normalization (e.g., the primary peak of a standard).

    Args:
        two_theta: 2-theta positions.
        intensity: Measured intensities.
        reference_2theta: 2-theta position of the reference peak.
        tolerance: Window around reference_2theta to search for the peak.

    Returns:
        NormalizationResult with normalized intensities.
    """
    tt = np.array(two_theta, dtype=float)
    ii = np.array(intensity, dtype=float)

    # Find the peak nearest to reference_2theta
    mask = np.abs(tt - reference_2theta) <= tolerance
    if not np.any(mask):
        logger.warning(
            "No peak found near 2θ=%.2f within tolerance %.2f, using max normalization",
            reference_2theta, tolerance,
        )
        return normalize_max(two_theta, intensity)

    ref_intensity = np.max(ii[mask])

    if ref_intensity <= 0:
        return normalize_max(two_theta, intensity)

    normalized = (ii / ref_intensity) * 100.0

    return NormalizationResult(
        two_theta=two_theta,
        intensity_normalized=normalized.tolist(),
        scale_factor=ref_intensity / 100.0,
        method="reference_peak",
    )
