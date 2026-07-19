"""Peak Fitting Service.

Fits analytical peak profiles (Gaussian, Lorentzian, Pseudo-Voigt) to detected peaks.
Extracts refined peak positions, widths, shapes, and integrated intensities.
"""

import logging
import math
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import numpy as np
from scipy.optimize import least_squares

logger = logging.getLogger("peak_fitting")


@dataclass
class FittedPeak:
    """Result of fitting a single peak."""
    two_theta: float
    intensity: float
    fwhm: float
    area: float
    d_spacing: Optional[float] = None
    eta: float = 0.5  # Gaussian-Lorentzian mixing (0=Gaussian, 1=Lorentzian)
    background: float = 0.0
    fit_quality: float = 0.0  # R-factor of the fit


@dataclass
class PeakFitResult:
    """Result of fitting all peaks."""
    fitted_peaks: List[FittedPeak] = field(default_factory=list)
    total_fitted_intensity: List[float] = field(default_factory=list)
    residual: List[float] = field(default_factory=list)
    r_factor: float = 0.0
    n_peaks_fitted: int = 0


def _pseudo_voigt(x: np.ndarray, x0: float, height: float, fwhm: float, eta: float) -> np.ndarray:
    """Pseudo-Voigt profile: mixture of Gaussian and Lorentzian."""
    if fwhm <= 0:
        fwhm = 0.1
    sigma = fwhm / (2.0 * math.sqrt(2.0 * math.log(2.0)))
    half_w = fwhm / 2.0

    gauss = height * np.exp(-0.5 * ((x - x0) / sigma) ** 2)
    lorentz = height / (1.0 + ((x - x0) / half_w) ** 2)
    return (1.0 - eta) * gauss + eta * lorentz


def _fit_single_peak(
    two_theta: np.ndarray,
    intensity: np.ndarray,
    peak_idx: int,
    window_half: int = 15,
) -> Optional[FittedPeak]:
    """Fit a single peak with a Pseudo-Voigt profile in a local window."""
    n = len(intensity)
    left = max(0, peak_idx - window_half)
    right = min(n, peak_idx + window_half + 1)

    x = two_theta[left:right]
    y = intensity[left:right]

    if len(x) < 5:
        return None

    # Estimate initial parameters
    height_est = float(y[peak_idx - left]) if 0 <= peak_idx - left < len(y) else float(np.max(y))
    x0_est = float(two_theta[peak_idx])

    # Estimate FWHM from data
    half_max = height_est / 2.0
    left_hw = peak_idx - left
    while left_hw > 0 and y[left_hw] > half_max:
        left_hw -= 1
    right_hw = peak_idx - left
    while right_hw < len(y) - 1 and y[right_hw] > half_max:
        right_hw += 1
    fwhm_est = float(x[min(right_hw, len(x) - 1)] - x[max(left_hw, 0)])
    if fwhm_est <= 0:
        fwhm_est = 0.3

    bg_est = float(np.min(y))

    # Parameters: [x0, height, fwhm, eta, bg]
    x0_params = [x0_est, height_est, fwhm_est, 0.5, bg_est]

    def residuals(params):
        x0, h, fw, eta, bg = params
        model = _pseudo_voigt(x, x0, max(0, h), max(0.01, fw), max(0.0, min(1.0, eta))) + max(0, bg)
        return model - y

    try:
        result = least_squares(
            residuals, x0_params,
            bounds=(
                [x[0], 0, 0.01, 0, -np.inf],
                [x[-1], height_est * 10, fwhm_est * 5, 1.0, np.inf],
            ),
            max_nfev=200,
        )
        x0_fit, h_fit, fw_fit, eta_fit, bg_fit = result.x

        # Calculate integrated area
        # For pseudo-Voigt: area ≈ height * fwhm * sqrt(pi/(4*ln2)) * (1-eta) + height * fwhm * pi/2 * eta
        area_gauss = h_fit * fw_fit * math.sqrt(math.pi / (4.0 * math.log(2.0)))
        area_lorentz = h_fit * fw_fit * math.pi / 2.0
        area = (1.0 - eta_fit) * area_gauss + eta_fit * area_lorentz

        # R-factor
        fitted = _pseudo_voigt(x, x0_fit, h_fit, fw_fit, eta_fit) + bg_fit
        ss_res = float(np.sum((y - fitted) ** 2))
        ss_tot = float(np.sum((y - np.mean(y)) ** 2))
        r_factor = math.sqrt(ss_res / max(ss_tot, 1e-10)) * 100.0

        # d-spacing
        theta_rad = math.radians(x0_fit / 2.0)
        sin_theta = math.sin(theta_rad)
        d_spacing = None
        if sin_theta > 0:
            d_spacing = 1.5406 / (2.0 * sin_theta)

        return FittedPeak(
            two_theta=round(x0_fit, 4),
            intensity=round(h_fit, 2),
            fwhm=round(fw_fit, 4),
            area=round(area, 2),
            d_spacing=round(d_spacing, 4) if d_spacing else None,
            eta=round(eta_fit, 4),
            background=round(bg_fit, 2),
            fit_quality=round(r_factor, 2),
        )
    except Exception as e:
        logger.warning("Peak fit failed at 2theta=%.2f: %s", x0_est, e)
        return None


def fit_peaks(
    two_theta: List[float],
    intensity: List[float],
    peak_positions: List[float],
    tolerance: float = 0.3,
    wavelength_angstrom: float = 1.5406,
) -> PeakFitResult:
    """Fit analytical profiles to detected peak positions.

    Args:
        two_theta: 2-theta positions of the full pattern.
        intensity: Intensity values of the full pattern.
        peak_positions: Detected peak 2-theta positions to fit.
        tolerance: Window half-width around each peak for fitting (degrees).
        wavelength_angstrom: Wavelength for d-spacing calculation.

    Returns:
        PeakFitResult with fitted peaks and residual.
    """
    tt = np.array(two_theta, dtype=np.float64)
    ii = np.array(intensity, dtype=np.float64)

    window_half = max(10, int(tolerance / (tt[1] - tt[0])) if len(tt) > 1 else 15)

    fitted_peaks = []
    total_fitted = np.zeros_like(tt)

    for pos in peak_positions:
        idx = int(np.argmin(np.abs(tt - pos)))
        fitted = _fit_single_peak(tt, ii, idx, window_half=window_half)
        if fitted:
            fitted_peaks.append(fitted)
            total_fitted += _pseudo_voigt(tt, fitted.two_theta, fitted.intensity, fitted.fwhm, fitted.eta)

    residual = (ii - total_fitted).tolist()

    peak_mask = np.zeros_like(tt, dtype=bool)
    for pos in peak_positions:
        idx = int(np.argmin(np.abs(tt - pos)))
        window = max(5, int(0.5 / (tt[1] - tt[0])) if len(tt) > 1 else 5)
        lo = max(0, idx - window)
        hi = min(len(tt), idx + window + 1)
        peak_mask[lo:hi] = True

    bg_residuals = ii[~peak_mask] - total_fitted[~peak_mask]
    bg_estimate = float(np.median(bg_residuals)) if len(bg_residuals) > 0 else 0.0
    total_fitted_with_bg = total_fitted + bg_estimate

    ss_res = float(np.sum((ii - total_fitted_with_bg) ** 2))
    ss_tot = float(np.sum((ii - np.mean(ii)) ** 2))
    r_factor = math.sqrt(ss_res / max(ss_tot, 1e-10)) * 100.0

    logger.info("Peak fitting: %d peaks fitted, R-factor=%.2f%%", len(fitted_peaks), r_factor)

    return PeakFitResult(
        fitted_peaks=fitted_peaks,
        total_fitted_intensity=total_fitted.tolist(),
        residual=residual,
        r_factor=round(r_factor, 2),
        n_peaks_fitted=len(fitted_peaks),
    )
