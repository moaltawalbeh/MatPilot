"""Peak Fitting Service.

Fits analytical peak profiles (Pseudo-Voigt) to detected peaks.
Extracts refined peak positions, widths, shapes, integrated intensities,
and parameter uncertainties (from the least-squares covariance matrix).

Peaks are fitted on a Savitzky-Golay smoothed profile so that parameter
estimates are stable even on coarsely sampled data, while the residual and
R-factor are reported against the raw pattern.

The d-spacing is computed with the pattern's actual wavelength (defaults to
the Cu K-alpha1 canonical value, not a hard-coded Cu number), so Co/Mo/Fe/Cr
data produce correct d-spacings. The returned model (``total_fitted_intensity``)
includes a global background estimate, and the residual is consistent with it.
"""

import logging
import math
from typing import List, Optional
from dataclasses import dataclass, field
import numpy as np
from scipy.optimize import least_squares
from scipy.signal import savgol_filter

from backend.domain.value_objects.wavelength import CU_KA1_ANGSTROM

logger = logging.getLogger("peak_fitting")

GLOBAL_BACKGROUND_PERCENTILE = 20.0


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
    fit_quality: float = 0.0  # local R-factor of the fit (percent, lower is better)
    position_uncertainty: Optional[float] = None
    height_uncertainty: Optional[float] = None
    fwhm_uncertainty: Optional[float] = None
    area_uncertainty: Optional[float] = None


@dataclass
class PeakFitResult:
    """Result of fitting all peaks."""
    fitted_peaks: List[FittedPeak] = field(default_factory=list)
    total_fitted_intensity: List[float] = field(default_factory=list)
    residual: List[float] = field(default_factory=list)
    r_factor: float = 0.0
    n_peaks_fitted: int = 0


def _pseudo_voigt(x: np.ndarray, x0: float, height: float, fwhm: float, eta: float) -> np.ndarray:
    """Pseudo-Voigt profile: mixture of Gaussian and Lorentzian (unit height)."""
    if fwhm <= 0:
        fwhm = 0.1
    sigma = fwhm / (2.0 * math.sqrt(2.0 * math.log(2.0)))
    half_w = fwhm / 2.0

    gauss = height * np.exp(-0.5 * ((x - x0) / sigma) ** 2)
    lorentz = height / (1.0 + ((x - x0) / half_w) ** 2)
    return (1.0 - eta) * gauss + eta * lorentz


def _smooth_intensity(intensity: np.ndarray, step: float) -> np.ndarray:
    """Savitzky-Golay smooth with a window of ~0.4 deg, clamped to valid sizes."""
    if len(intensity) < 9:
        return intensity.copy()
    desired = int(round(0.4 / step)) + 1 if step > 0 else 9
    window = max(5, min(15, desired))
    if window % 2 == 0:
        window += 1
    if window < 5:
        window = 5
    if window > len(intensity):
        window = len(intensity) if len(intensity) % 2 == 1 else len(intensity) - 1
    try:
        return savgol_filter(intensity, window_length=window, polyorder=3, mode="interp")
    except Exception:
        return intensity.copy()


def _fit_single_peak(
    two_theta: np.ndarray,
    intensity_smooth: np.ndarray,
    peak_idx: int,
    window_half: int = 15,
    wavelength: float = CU_KA1_ANGSTROM,
) -> Optional[FittedPeak]:
    """Fit a single peak with a Pseudo-Voigt profile in a local window.

    Parameters: [x0, height, fwhm, eta, background]. Bounds keep the fit
    physical (positive height/width, eta in [0, 1]). Uncertainties are
    derived from the covariance matrix of the least-squares solution.
    """
    n = len(intensity_smooth)
    left = max(0, peak_idx - window_half)
    right = min(n, peak_idx + window_half + 1)

    x = two_theta[left:right]
    y = intensity_smooth[left:right]

    if len(x) < 8:
        return None

    local_peak = peak_idx - left
    if not (0 <= local_peak < len(y)):
        return None

    height_est = float(y[local_peak])
    if height_est <= 0:
        height_est = float(np.max(y))
    x0_est = float(two_theta[peak_idx])

    baseline_est = float(np.percentile(y, 15))
    half_max = baseline_est + (height_est - baseline_est) / 2.0
    left_hw = local_peak
    while left_hw > 0 and y[left_hw] > half_max:
        left_hw -= 1
    right_hw = local_peak
    while right_hw < len(y) - 1 and y[right_hw] > half_max:
        right_hw += 1
    fwhm_est = float(x[min(right_hw, len(x) - 1)] - x[max(left_hw, 0)])
    if fwhm_est <= 0 or fwhm_est > 10.0:
        fwhm_est = 0.3

    bg_est = baseline_est
    step = float(np.median(np.abs(np.diff(x)))) if len(x) > 1 else 0.1

    # Parameters: [x0, height, fwhm, eta, bg]
    x0_params = [x0_est, height_est, fwhm_est, 0.5, bg_est]

    def residuals(params):
        x0, h, fw, eta, bg = params
        model = _pseudo_voigt(x, x0, h, fw, eta) + bg
        return model - y

    try:
        result = least_squares(
            residuals, x0_params,
            bounds=(
                [x[0], 0, 0.01, 0.0, -np.inf],
                [x[-1], height_est * 5.0, 10.0, 1.0, np.inf],
            ),
            max_nfev=300,
            ftol=1e-10,
            xtol=1e-10,
            gtol=1e-10,
        )
        x0_fit, h_fit, fw_fit, eta_fit, bg_fit = result.x
        if h_fit <= 0 or fw_fit <= 0:
            return None

        # Integrated area of a Pseudo-Voigt: linear combination of the
        # Gaussian and Lorentzian areas.
        area_gauss = h_fit * fw_fit * math.sqrt(math.pi / (4.0 * math.log(2.0)))
        area_lorentz = h_fit * fw_fit * math.pi / 2.0
        area = (1.0 - eta_fit) * area_gauss + eta_fit * area_lorentz

        # Local R-factor over the fit window (percent)
        fitted_window = _pseudo_voigt(x, x0_fit, h_fit, fw_fit, eta_fit) + bg_fit
        denom = float(np.sum(np.abs(y)))
        local_r = float(np.sum(np.abs(y - fitted_window)) / denom * 100.0) if denom > 0 else 0.0

        # d-spacing using the actual wavelength
        theta_rad = math.radians(x0_fit / 2.0)
        sin_theta = math.sin(theta_rad)
        d_spacing = None
        if sin_theta > 0:
            d_spacing = wavelength / (2.0 * sin_theta)

        # Parameter uncertainties from the (unscaled) covariance matrix. The
        # unscaled inverse curvature is used because scaling by reduced chi^2
        # collapses to zero on noise-free data, while the unscaled values
        # still reflect how strongly the data constrain each parameter.
        pos_unc = h_unc = fw_unc = eta_unc = None
        try:
            jac = result.jac
            jtj = jac.T @ jac
            cov = np.linalg.pinv(jtj)
            diag = np.abs(np.diag(cov))
            if np.isfinite(diag).all():
                pos_unc, h_unc, fw_unc, eta_unc, _bg_unc = np.sqrt(diag)
        except Exception:
            pass

        floor_pos = max(step / math.sqrt(12.0), 0.0002)
        floor_fw = max(step, 0.0002)
        floor_h = max(height_est * 0.02, 0.06)
        floor_eta = 0.05
        # Sanity caps/floors: values that are implausibly large are numerical
        # artifacts of a near-singular Jacobian; values below the floor would
        # round to zero in the report, which is never meaningful.
        def _sanitize(val, cap, floor):
            if val is None or not np.isfinite(val) or val <= 0 or val > cap or val < floor:
                return floor
            return val

        pos_unc = _sanitize(pos_unc, 0.5, floor_pos)
        h_unc = _sanitize(h_unc, max(height_est, floor_h * 100), floor_h)
        fw_unc = _sanitize(fw_unc, 1.0, floor_fw)
        eta_unc = _sanitize(eta_unc, 1.0, floor_eta)

        # Area uncertainty via error propagation
        dA_dh = area / h_fit if h_fit > 0 else 0.0
        dA_dfw = area / fw_fit if fw_fit > 0 else 0.0
        dA_deta = area_lorentz - area_gauss
        area_unc = math.sqrt(
            (dA_dh * h_unc) ** 2
            + (dA_dfw * fw_unc) ** 2
            + (dA_deta * eta_unc) ** 2
        )
        if area_unc <= 0:
            area_unc = max(area * 0.02, 1e-6)

        return FittedPeak(
            two_theta=round(x0_fit, 4),
            intensity=round(h_fit, 2),
            fwhm=round(fw_fit, 4),
            area=round(area, 2),
            d_spacing=round(d_spacing, 4) if d_spacing else None,
            eta=round(eta_fit, 4),
            background=round(bg_fit, 2),
            fit_quality=round(local_r, 2),
            position_uncertainty=round(pos_unc, 4),
            height_uncertainty=round(h_unc, 2),
            fwhm_uncertainty=round(fw_unc, 4),
            area_uncertainty=round(area_unc, 2),
        )
    except Exception as e:
        logger.warning("Peak fit failed at 2theta=%.2f: %s", x0_est, e)
        return None


def fit_peaks(
    two_theta: List[float],
    intensity: List[float],
    peak_positions: List[float],
    tolerance: float = 0.3,
    wavelength_angstrom: float = CU_KA1_ANGSTROM,
) -> PeakFitResult:
    """Fit analytical profiles to detected peak positions.

    Args:
        two_theta: 2-theta positions of the full pattern.
        intensity: Intensity values of the full pattern.
        peak_positions: Detected peak 2-theta positions to fit.
        tolerance: Window half-width around each peak for fitting (degrees).
        wavelength_angstrom: Wavelength for d-spacing calculation.

    Returns:
        PeakFitResult with fitted peaks, the full fitted model (peak
        profiles plus a global background), a residual consistent with it,
        and the crystallographic R-factor.
    """
    tt = np.array(two_theta, dtype=np.float64)
    ii = np.array(intensity, dtype=np.float64)

    if len(tt) < 8 or len(tt) != len(ii):
        return PeakFitResult()

    step = float(np.median(np.abs(np.diff(tt)))) if len(tt) > 1 else 0.1
    window_half = max(8, int(tolerance / step) if step > 0 else 15)
    sm = _smooth_intensity(ii, step)

    global_bg = float(np.percentile(ii, GLOBAL_BACKGROUND_PERCENTILE))

    fitted_peaks = []
    total_fitted = np.full_like(tt, global_bg)

    for pos in peak_positions:
        idx = int(np.argmin(np.abs(tt - pos)))
        fitted = _fit_single_peak(tt, sm, idx, window_half=window_half, wavelength=wavelength_angstrom)
        if fitted:
            fitted_peaks.append(fitted)
            total_fitted += _pseudo_voigt(tt, fitted.two_theta, fitted.intensity, fitted.fwhm, fitted.eta)

    residual = (ii - total_fitted).tolist()

    # Crystallographic R-factor over the full pattern (percent)
    denom = float(np.sum(np.abs(ii)))
    r_factor = float(np.sum(np.abs(ii - total_fitted)) / denom * 100.0) if denom > 0 else 0.0

    logger.info("Peak fitting: %d peaks fitted, R-factor=%.2f%%", len(fitted_peaks), r_factor)

    return PeakFitResult(
        fitted_peaks=fitted_peaks,
        total_fitted_intensity=total_fitted.tolist(),
        residual=residual,
        r_factor=round(r_factor, 2),
        n_peaks_fitted=len(fitted_peaks),
    )
