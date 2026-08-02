"""K-alpha 2 Stripping Service.

Removes the Kα2 contribution from a diffraction pattern collected with
a characteristic X-ray source (Cu, Co, etc.) using the Rachinger (1948)
recursive deconvolution method.

Method (see docs/research_ka2_background.md for the full validation):

  I_obs(2θ) = I_α1(2θ) + r · I_α1[2θ − Δ(2θ)]

  I_α1(2θ) = I_obs(2θ) − r · I_α1[2θ − Δ(2θ)]

Implementation rules (all validated in the research report):
  * Sweep LOW → HIGH 2θ (the recursion consumes the already-solved value at
    the lower angle 2θ − Δ, so it is causal in the increasing-angle direction).
  * The subtracted value at 2θ − Δ is taken from the ALREADY-STRIPPED output
    array (recursive), never from the raw observed data.
  * Δ(2θ) = 2·tan(θ)·(Δλ/λ̄) is evaluated per channel (Delhez–Mittemeijer 1975
    refinement) with λ̄ = (λ1 + λ2)/2.
  * Because Δ(2θ) is generally not an integer multiple of the channel step,
    I_α1(2θ − Δ) is obtained by LINEAR INTERPOLATION of the stripped output
    (integer index shifting introduces systematic ripple).
  * No clamping is applied inside the recursion (clamping biases the
    deconvolution); negative values are clipped to zero only as a final
    surface-level safety operation.

Preconditions (enforced by the pipeline ordering): the input must already be
background-subtracted and smoothed — Rachinger fails on non-negligible
background and amplifies noise.

Reference: Rachinger, W. A. (1948). J. Sci. Instr., 25, 254.
"""

import logging
import numpy as np
from typing import List, Optional, Dict
from dataclasses import dataclass

from backend.domain.value_objects.wavelength import (
    CU_KA1_ANGSTROM,
    CU_KA2_ANGSTROM,
    MO_KA1_ANGSTROM,
    MO_KA2_ANGSTROM,
    CO_KA1_ANGSTROM,
    CO_KA2_ANGSTROM,
    FE_KA1_ANGSTROM,
    FE_KA2_ANGSTROM,
    CR_KA1_ANGSTROM,
    CR_KA2_ANGSTROM,
)

logger = logging.getLogger("ka2_stripping")


# K-alpha wavelength ratios (lambda_Ka2 / lambda_Ka1) from the canonical
# NIST/Deslattes et al. (2003) values (see wavelength.py).
WAVELENGTH_RATIOS: Dict[str, float] = {
    "Cu": CU_KA2_ANGSTROM / CU_KA1_ANGSTROM,
    "Mo": MO_KA2_ANGSTROM / MO_KA1_ANGSTROM,
    "Co": CO_KA2_ANGSTROM / CO_KA1_ANGSTROM,
    "Fe": FE_KA2_ANGSTROM / FE_KA1_ANGSTROM,
    "Cr": CR_KA2_ANGSTROM / CR_KA1_ANGSTROM,
}

# K-alpha intensity ratios (I_Ka2 / I_Ka1).
# Rachinger convention: r = 0.50 (fixed, angle-independent) — the value assumed
# by the Rachinger recursion, FullProf (I2/I1 = 0.5) and de Rooi et al. (2014)
# PCLM (tau = 0.5). For Mo the Scofield (1974) value r = 0.524 is slightly
# better (~5% effect); the difference is <1% for Cu/Fe/Co/Cr and well within
# the method's own noise budget.
INTENSITY_RATIOS: Dict[str, float] = {
    "Cu": 0.50,
    "Co": 0.50,
    "Mo": 0.50,
    "Fe": 0.50,
    "Cr": 0.50,
}

DEFAULT_WAVELENGTH_ANGSTROM = CU_KA1_ANGSTROM


@dataclass
class Ka2Result:
    """Result of Kα2 stripping."""
    two_theta: List[float]
    intensity_stripped: List[float]
    ka2_component: List[float]
    delta_2theta: float
    ratio_used: float


def compute_delta_2theta(
    two_theta: float,
    wavelength: float,
    wavelength_ratio: float,
) -> float:
    """Compute the 2-theta separation between Kα1 and Kα2 at a given angle.

    Uses the Delhez–Mittemeijer (1975) angle-dependent refinement of the
    differentiated Bragg's law:

        Δ(2θ) = 2·tan(θ)·(Δλ / λ̄)

    with θ = 2θ/2, λ̄ = (λ1 + λ2)/2 and Δλ = λ2 − λ1. The separation is
    re-evaluated per channel rather than held constant across the profile.

    Args:
        two_theta: Current 2-theta position (degrees).
        wavelength: Kα1 wavelength in Angstroms.
        wavelength_ratio: lambda_Ka2 / lambda_Ka1.

    Returns:
        Delta 2-theta in degrees.
    """
    lam1 = float(wavelength)
    lam2 = lam1 * float(wavelength_ratio)
    d_lambda = lam2 - lam1
    lam_bar = (lam1 + lam2) / 2.0

    theta_rad = np.radians(two_theta / 2.0)
    if np.sin(theta_rad) <= 0:
        return 0.0

    delta_rad = 2.0 * np.tan(theta_rad) * (d_lambda / lam_bar)
    return float(abs(np.degrees(delta_rad)))


def _validate_input(
    two_theta: List[float],
    intensity: List[float],
) -> bool:
    """Validate that inputs are non-empty, equal-length and ascending in 2θ."""
    if not two_theta or not intensity:
        return False
    if len(two_theta) != len(intensity):
        return False
    tt = np.asarray(two_theta, dtype=float)
    if len(tt) < 3:
        return False
    # Rachinger requires a monotonic increasing 2θ grid.
    if np.any(np.diff(tt) <= 0):
        logger.warning("Kα2 stripping requires strictly ascending 2θ values")
        return False
    return True


def strip_ka2(
    two_theta: List[float],
    intensity: List[float],
    element: str = "Cu",
    wavelength: Optional[float] = None,
    ka2_ka1_ratio: Optional[float] = None,
) -> Ka2Result:
    """Remove the Kα2 contribution using the recursive Rachinger method.

    The algorithm sweeps LOW → HIGH 2θ. For each channel it computes the
    angle-dependent separation Δ(2θ), looks up the ALREADY-STRIPPED value at
    2θ − Δ(2θ) with linear interpolation, and subtracts r × that value from
    the observed intensity (the Rachinger recursion).

    Args:
        two_theta: 2-theta positions (degrees), strictly ascending.
        intensity: Measured intensities. Should already be background-subtracted
            and smoothed (see pipeline ordering).
        element: Target element for the wavelength lookup (Cu, Co, Mo, Fe, Cr).
        wavelength: Kα1 wavelength in Angstroms. Defaults to the canonical
            NIST value for the element.
        ka2_ka1_ratio: Intensity ratio I_Ka2/I_Ka1. Defaults to the Rachinger
            convention r = 0.50.

    Returns:
        Ka2Result with the stripped (Kα1-only) intensity, the estimated Kα2
        component, the reference Δ(2θ) and the ratio used.
    """
    ratio_int = float(ka2_ka1_ratio) if ka2_ka1_ratio is not None \
        else INTENSITY_RATIOS.get(element, 0.50)
    lam1 = float(wavelength) if wavelength is not None else DEFAULT_WAVELENGTH_ANGSTROM

    if not _validate_input(two_theta, intensity):
        n = len(two_theta)
        return Ka2Result(
            two_theta=two_theta,
            intensity_stripped=list(intensity),
            ka2_component=[0.0] * n,
            delta_2theta=0.0,
            ratio_used=ratio_int,
        )

    tt = np.asarray(two_theta, dtype=float)
    ii = np.asarray(intensity, dtype=float)
    n = len(tt)

    wr = WAVELENGTH_RATIOS.get(element, WAVELENGTH_RATIOS["Cu"])

    # Reference separation (reported for metadata; evaluated at the midpoint).
    mid_idx = n // 2
    delta_ref = compute_delta_2theta(float(tt[mid_idx]), lam1, wr)

    # Recursive Rachinger sweep: LOW 2θ → HIGH 2θ.
    # out[i] is the already-stripped (Kα1-only) estimate; it is updated in
    # place so that the interpolated value at 2θ_i − Δ uses corrected channels.
    out = ii.copy()
    ka2_component = np.zeros_like(ii)

    for i in range(n):
        delta = compute_delta_2theta(float(tt[i]), lam1, wr)
        if delta <= 0:
            continue

        target = tt[i] - delta
        stripped_lower = _interp_causal_stripped(target, tt, out, i)

        contribution = ratio_int * stripped_lower
        ka2_component[i] = contribution
        out[i] = ii[i] - contribution

    # Surface-level safety: clip negatives only AFTER the recursion completes
    # (clamping inside the recursion would bias the deconvolution).
    intensity_stripped = np.maximum(out, 0.0)

    return Ka2Result(
        two_theta=two_theta,
        intensity_stripped=intensity_stripped.tolist(),
        ka2_component=ka2_component.tolist(),
        delta_2theta=delta_ref,
        ratio_used=ratio_int,
    )


def _interp_causal_stripped(target: float, tt: np.ndarray, out: np.ndarray, i: int) -> float:
    """Linearly interpolate the already-stripped output at ``target``.

    Only channels strictly below the current index ``i`` are used, so the
    recursion stays causal (Rachinger consumes the already-corrected value at
    the lower angle 2θ − Δ). Targets below the first measured channel return
    zero — there is no Kα1 below the scan range, hence no Kα2 contribution at
    that point (no correction is required at the profile start).
    """
    j = int(np.searchsorted(tt, target, side="right")) - 1
    if j < 0:
        return 0.0
    if j >= i - 1:
        # Target falls between the two most recent channels; the upper channel
        # is the not-yet-corrected current point, so hold the last corrected
        # value (sub-channel effect, negligible at this order).
        return float(out[i - 1])
    x1, x2 = tt[j], tt[j + 1]
    if x2 - x1 <= 0:
        return float(out[j])
    frac = (target - x1) / (x2 - x1)
    return float(out[j] + frac * (out[j + 1] - out[j]))
