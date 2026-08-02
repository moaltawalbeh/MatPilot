"""Tests for the peak fitting service."""

import inspect
import math

import numpy as np
import pytest

from backend.services.peak_fitting import fit_peaks, FittedPeak, PeakFitResult
from backend.domain.value_objects.wavelength import CU_KA1_ANGSTROM


def _gaussian(x, center, sigma, height=1.0):
    return height * np.exp(-0.5 * ((x - center) / sigma) ** 2)


def _three_peak_pattern():
    """Three well-separated Gaussian peaks on a small flat background."""
    centers = [28.44, 47.30, 56.12]
    heights = [100.0, 55.0, 30.0]
    sigma = 0.12
    tt = np.arange(15.0, 80.0, 0.01)
    intensity = np.full_like(tt, 1.5)
    for c, h in zip(centers, heights):
        intensity += _gaussian(tt, c, sigma, h)
    return tt.tolist(), intensity.tolist()


class TestFitPeaks:
    def test_recovers_peak_positions(self):
        tt, ii = _three_peak_pattern()
        centers = [28.44, 47.30, 56.12]
        result = fit_peaks(tt, ii, centers, tolerance=0.5)
        assert result.n_peaks_fitted == 3
        recovered = sorted(p.two_theta for p in result.fitted_peaks)
        for got, want in zip(recovered, centers):
            assert abs(got - want) < 0.1, f"fitted {got}, expected {want}"

    def test_per_peak_uncertainties_returned(self):
        tt, ii = _three_peak_pattern()
        result = fit_peaks(tt, ii, [28.44], tolerance=0.5)
        peak = result.fitted_peaks[0]
        assert peak.position_uncertainty is not None and peak.position_uncertainty > 0
        assert peak.height_uncertainty is not None and peak.height_uncertainty > 0
        assert peak.fwhm_uncertainty is not None and peak.fwhm_uncertainty > 0
        assert peak.area_uncertainty is not None and peak.area_uncertainty > 0

    def test_fit_quality_reasonable(self):
        tt, ii = _three_peak_pattern()
        result = fit_peaks(tt, ii, [28.44, 47.30, 56.12], tolerance=0.5)
        assert result.r_factor < 10.0

    def test_d_spacing_uses_canonical_wavelength(self):
        tt, ii = _three_peak_pattern()
        result = fit_peaks(tt, ii, [28.44], tolerance=0.5)
        peak = result.fitted_peaks[0]
        theta_rad = math.radians(peak.two_theta / 2.0)
        expected_d = CU_KA1_ANGSTROM / (2.0 * math.sin(theta_rad))
        assert peak.d_spacing == pytest.approx(expected_d, rel=1e-3)
        # Si (111) d-spacing at Cu Kα1 ≈ 3.1356 Å.
        assert peak.d_spacing == pytest.approx(3.135, abs=0.01)

    def test_default_wavelength_is_canonical(self):
        sig = inspect.signature(fit_peaks)
        default = sig.parameters["wavelength_angstrom"].default
        assert default == pytest.approx(CU_KA1_ANGSTROM)

    def test_custom_wavelength_changes_d_spacing(self):
        tt, ii = _three_peak_pattern()
        result = fit_peaks(tt, ii, [28.44], tolerance=0.5, wavelength_angstrom=1.0)
        peak = result.fitted_peaks[0]
        theta_rad = math.radians(peak.two_theta / 2.0)
        expected_d = 1.0 / (2.0 * math.sin(theta_rad))
        assert peak.d_spacing == pytest.approx(expected_d, rel=1e-3)

    def test_single_peak_fit(self):
        tt, ii = _three_peak_pattern()
        result = fit_peaks(tt, ii, [47.30], tolerance=0.5)
        assert result.n_peaks_fitted == 1
        assert abs(result.fitted_peaks[0].two_theta - 47.30) < 0.1
