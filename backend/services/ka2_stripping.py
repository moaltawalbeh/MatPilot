"""K-alpha 2 Stripping Service.

Removes the Kα2 contribution from a diffraction pattern collected with
a characteristic X-ray source (Cu, Co, etc.) using the Rachinger deconvolution method.

Reference: Rachinger, W. A. (1948). J. Sci. Instr., 25, 254.
"""

import logging
import numpy as np
from typing import List, Optional
from dataclasses import dataclass

logger = logging.getLogger("ka2_stripping")


# K-alpha wavelength ratios (lambda_Ka2 / lambda_Ka1)
# These determine the 2-theta separation between Ka1 and Ka2 peaks
WAVELENGTH_RATIOS = {
    "Cu": 1.54439 / 1.54056,   # 1.00242
    "Co": 1.79278 / 1.78897,   # 1.00213
    "Mo": 0.71354 / 0.70930,   # 1.00598
    "Fe": 1.94000 / 1.93604,   # 1.00204
    "Cr": 2.29351 / 2.28970,   # 1.00167
}

# K-alpha intensity ratios (I_Ka2 / I_Ka1)
INTENSITY_RATIOS = {
    "Cu": 0.497,
    "Co": 0.497,
    "Mo": 0.497,
    "Fe": 0.497,
    "Cr": 0.497,
}


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
    """Compute the 2-theta separation between Ka1 and Ka2 at a given angle.

    Uses Bragg's law: n*lambda = 2*d*sin(theta)
    The separation increases with angle.

    Args:
        two_theta: Current 2-theta position (degrees).
        wavelength: Ka1 wavelength in Angstroms.
        wavelength_ratio: lambda_Ka2 / lambda_Ka1.

    Returns:
        Delta 2-theta in degrees.
    """
    theta_rad = np.radians(two_theta / 2.0)

    if np.sin(theta_rad) <= 0:
        return 0.0

    sin_theta_ka2 = wavelength_ratio * np.sin(theta_rad)
    sin_theta_ka2 = min(np.clip(sin_theta_ka2, -1.0, 1.0), 1.0)

    theta_ka2_rad = np.arcsin(sin_theta_ka2)
    delta_2theta = 2.0 * np.degrees(theta_ka2_rad - theta_rad)

    return abs(delta_2theta)


def strip_ka2(
    two_theta: List[float],
    intensity: List[float],
    element: str = "Cu",
    wavelength: float = 1.5406,
    ka2_ka1_ratio: float = 0.497,
) -> Ka2Result:
    """Remove Kα2 contribution using the Rachinger deconvolution method.

    The algorithm works backwards from high 2θ to low 2θ:
    1. At the highest angles, Ka1 ≈ total (Ka2 is shifted off-scale).
    2. Subtract a fraction of the Ka1 component at the Ka2 position.
    3. Proceed to lower angles.

    Args:
        two_theta: 2-theta positions (degrees).
        intensity: Measured intensities (includes both Ka1 and Ka2).
        element: Target element for wavelength lookup (Cu, Co, Mo, Fe, Cr).
        wavelength: X-ray wavelength in Angstroms (Ka1).
        ka2_ka1_ratio: Intensity ratio I_Ka2/I_Ka1 (default 0.497).

    Returns:
        Ka2Result with stripped intensity and Ka2 component.
    """
    tt = np.array(two_theta, dtype=float)
    ii = np.array(intensity, dtype=float)
    n = len(tt)

    if n < 3:
        return Ka2Result(
            two_theta=two_theta,
            intensity_stripped=intensity.copy(),
            ka2_component=[0.0] * n,
            delta_2theta=0.0,
            ratio_used=ka2_ka1_ratio,
        )

    # Get wavelength ratio
    wr = WAVELENGTH_RATIOS.get(element, 1.00242)

    # Compute delta_2theta at the midpoint for reference
    mid_idx = n // 2
    delta_ref = compute_delta_2theta(tt[mid_idx], wavelength, wr)

    # Build the Ka2 component by subtracting scaled, shifted Ka1
    ka2_component = np.zeros_like(ii)

    # Rachinger method: work from high to low 2θ
    for i in range(n - 1, -1, -1):
        delta = compute_delta_2theta(tt[i], wavelength, wr)

        if delta <= 0:
            continue

        # Find the index where Ka2 would contribute
        # Ka2 at position i corresponds to Ka1 at position i + shift
        shift = delta / np.mean(np.diff(tt)) if n > 1 else 0
        j = int(i + shift)

        if 0 <= j < n:
            ka2_component[j] = ka2_ka1_ratio * ii[i]

    intensity_stripped = ii - ka2_component
    # Ensure no negative intensities
    intensity_stripped = np.maximum(intensity_stripped, 0.0)

    return Ka2Result(
        two_theta=two_theta,
        intensity_stripped=intensity_stripped.tolist(),
        ka2_component=ka2_component.tolist(),
        delta_2theta=delta_ref,
        ratio_used=ka2_ka1_ratio,
    )
