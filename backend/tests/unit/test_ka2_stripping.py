"""Tests for the Kα2 stripping service (Rachinger recursion)."""

import math

import numpy as np
import pytest

from backend.services.ka2_stripping import (
    strip_ka2,
    compute_delta_2theta,
    WAVELENGTH_RATIOS,
    INTENSITY_RATIOS,
)
from backend.domain.value_objects.wavelength import (
    CU_KA1_ANGSTROM,
    CU_KA2_ANGSTROM,
)


def _gaussian(x, center, sigma, height=1.0):
    return height * np.exp(-0.5 * ((x - center) / sigma) ** 2)


def _doublet(tt, center, sigma, r=0.5):
    """Observed profile = α1(2θ) + r·α1(2θ − Δ(2θ)) per the Rachinger model.

    The Kα2 contribution at 2θ comes from the Kα1 component at the lower
    angle 2θ − Δ(2θ), so an α1 peak at `center` produces an α2 peak
    Δ degrees higher in 2θ.
    """
    ratio = WAVELENGTH_RATIOS["Cu"]
    alpha1 = _gaussian(tt, center, sigma)
    obs = alpha1.copy()
    for i, t in enumerate(tt):
        delta = compute_delta_2theta(t, CU_KA1_ANGSTROM, ratio)
        obs[i] += r * float(np.interp(t - delta, tt, alpha1))
    return alpha1, obs


class TestComputeDelta2Theta:
    def test_positive_and_small(self):
        delta = compute_delta_2theta(30.0, CU_KA1_ANGSTROM, WAVELENGTH_RATIOS["Cu"])
        assert 0 < delta < 1.0

    def test_increases_with_angle(self):
        d1 = compute_delta_2theta(20.0, CU_KA1_ANGSTROM, WAVELENGTH_RATIOS["Cu"])
        d2 = compute_delta_2theta(60.0, CU_KA1_ANGSTROM, WAVELENGTH_RATIOS["Cu"])
        assert d2 > d1

    def test_matches_delhez_mittemeijer_formula(self):
        lam1 = CU_KA1_ANGSTROM
        lam2 = CU_KA2_ANGSTROM
        lam_bar = (lam1 + lam2) / 2.0
        theta_rad = math.radians(28.44 / 2.0)
        expected = math.degrees(2.0 * math.tan(theta_rad) * ((lam2 - lam1) / lam_bar))
        delta = compute_delta_2theta(28.44, lam1, WAVELENGTH_RATIOS["Cu"])
        assert delta == pytest.approx(expected, rel=1e-9)

    def test_zero_below_horizon(self):
        assert compute_delta_2theta(0.0, CU_KA1_ANGSTROM, WAVELENGTH_RATIOS["Cu"]) == 0.0


class TestStripKa2:
    def test_recovers_alpha1_from_doublet(self):
        tt = np.arange(40.0, 80.0, 0.005)
        alpha1, obs = _doublet(tt, center=60.0, sigma=0.15)
        result = strip_ka2(tt.tolist(), obs.tolist(), element="Cu")
        stripped = np.asarray(result.intensity_stripped)
        err = np.max(np.abs(stripped - alpha1)) / float(alpha1.max())
        assert err < 0.03, f"Kα2 not fully removed, max rel. error = {err:.4f}"

    def test_leaves_single_wavelength_data_unchanged(self):
        # A sharp single-wavelength (α1-only) peak has no Kα2 partner, so the
        # recursion must not distort the peak itself: position and height are
        # preserved and the zero baseline stays zero. (Rachinger inherently
        # leaves small ghost ripples at the Δ-shifted positions — a documented
        # limitation, see research doc §2.1 — which is why stripping is only
        # applied to Kα1/Kα2 data in the pipeline.)
        tt = np.arange(40.0, 80.0, 0.005)
        alpha1 = _gaussian(tt, center=60.0, sigma=0.02)
        result = strip_ka2(tt.tolist(), alpha1.tolist(), element="Cu")
        stripped = np.asarray(result.intensity_stripped)

        # Peak center preserved.
        center = int(np.argmin(np.abs(tt - 60.0)))
        assert abs(stripped[center] - alpha1[center]) < 0.01

        # Peak position unchanged.
        assert abs(tt[int(np.argmax(stripped))] - 60.0) < 0.005

        # Zero baseline far from the peak and its Δ-shifted positions stays zero.
        far = (tt < 55.0) | (tt > 65.0)
        assert np.max(np.abs(stripped[far])) < 1e-6

    def test_ka2_component_balances_stripped_intensity(self):
        tt = np.arange(40.0, 80.0, 0.005)
        alpha1, obs = _doublet(tt, center=60.0, sigma=0.15)
        result = strip_ka2(tt.tolist(), obs.tolist(), element="Cu")
        obs_arr = np.asarray(obs)
        stripped = np.asarray(result.intensity_stripped)
        comp = np.asarray(result.ka2_component)
        # Where no negative clamping occurred, stripped + component == observed.
        mask = stripped > 1e-9
        assert np.allclose(stripped[mask] + comp[mask], obs_arr[mask], atol=1e-9)

    def test_ratio_used_is_racachinger_convention(self):
        tt = np.arange(40.0, 80.0, 0.005)
        alpha1, obs = _doublet(tt, center=60.0, sigma=0.15)
        result = strip_ka2(tt.tolist(), obs.tolist(), element="Cu")
        assert result.ratio_used == pytest.approx(0.50)
        assert result.delta_2theta > 0
        assert len(result.intensity_stripped) == len(tt)

    def test_default_ratio_constant_is_half(self):
        assert INTENSITY_RATIOS["Cu"] == pytest.approx(0.50)

    def test_invalid_input_passthrough(self):
        result = strip_ka2([20.0, 30.0], [1.0, 2.0], element="Cu")
        assert result.intensity_stripped == [1.0, 2.0]
        assert result.ratio_used == pytest.approx(0.50)

    def test_zero_baseline_stays_zero(self):
        # After background subtraction (pipeline precondition) the input to
        # stripping has a zero baseline; the recursion must not inject signal
        # where there is none.
        tt = np.arange(40.0, 80.0, 0.005)
        zero = np.zeros_like(tt)
        result = strip_ka2(tt.tolist(), zero.tolist(), element="Cu")
        assert np.max(np.abs(np.asarray(result.intensity_stripped))) < 1e-12

    def test_leading_edge_not_corrupted(self):
        # At the very start of the scan there is no lower-angle data, so no
        # correction may be applied (a spurious subtraction at channel 0 would
        # corrupt the whole sweep).
        tt = np.arange(40.0, 80.0, 0.005)
        pattern = np.full_like(tt, 0.0)
        pattern[:10] = 5.0  # flat plateau at the scan start
        result = strip_ka2(tt.tolist(), pattern.tolist(), element="Cu")
        stripped = np.asarray(result.intensity_stripped)
        assert stripped[0] == pytest.approx(5.0)
        assert stripped[9] == pytest.approx(5.0)
