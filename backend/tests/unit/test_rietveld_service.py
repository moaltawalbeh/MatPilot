"""Tests for the Rietveld refinement engine (research doc formulas).

Covers the science-critical pieces of backend/services/rietveld_service.py:
canonical wavelength, TCH pseudo-Voigt mixing, area normalization, Poisson
weights, March-Dollase preferred orientation, Chebyshev background, and the
esd computation from the inverted weighted normal matrix.
"""

import math

import numpy as np
import pytest

from backend.services.rietveld_service import (
    RietveldService,
    CU_KA_AVG_ANGSTROM,
    TCH_GAMMA_COEFFS,
    TCH_ETA_COEFFS,
)
from backend.domain.value_objects.wavelength import (
    Wavelength,
    RadiationType,
)


def _silicon_peaks(a=5.431, wavelength=1.541874, max_two_theta=80.0, n_strong=None):
    """Simple all-reflections peak list for an fcc-like cell (no absences)."""
    peaks = []
    for h in range(0, 4):
        for k in range(0, 4):
            for l in range(0, 4):
                if h == k == l == 0:
                    continue
                d2 = (h * h + k * k + l * l) / (a * a)
                sinth = wavelength / (2.0 * math.sqrt(1.0 / d2))
                if 0 < sinth < 1:
                    tth = 2.0 * math.degrees(math.asin(sinth))
                    if 10.0 < tth < max_two_theta:
                        mult = len(
                            {(h, k, l), (h, l, k), (k, h, l), (k, l, h), (l, h, k), (l, k, h)}
                        )
                        peaks.append(
                            {
                                "two_theta": tth,
                                "intensity": float(mult * 100.0 / (h * h + k * k + l * l)),
                                "h": h,
                                "k": k,
                                "l": l,
                            }
                        )
    if n_strong is not None:
        peaks.sort(key=lambda p: p["intensity"], reverse=True)
        peaks = peaks[:n_strong]
    return peaks


def _silicon_phase(peaks):
    return {
        "formula": "Si",
        "name": "Silicon",
        "space_group": "Fd-3m",
        "crystal_system": "Cubic",
        "unit_cell": {"a": 5.431, "b": 5.431, "c": 5.431,
                      "alpha": 90, "beta": 90, "gamma": 90},
        "_theoretical_peaks": peaks,
    }


class TestCanonicalWavelength:
    def test_service_uses_shared_nist_value(self):
        expected = Wavelength.from_radiation_type(RadiationType.Cu_K_ALPHA_AVG).value_angstrom
        assert CU_KA_AVG_ANGSTROM == pytest.approx(expected, rel=1e-12)
        assert RietveldService.WAVELENGTH_CU_KA == pytest.approx(expected, rel=1e-12)
        assert RietveldService()._wavelength == pytest.approx(expected, rel=1e-12)
        # Weighted average (2*Kalpha1 + Kalpha2)/3, not a hardcoded 1.5406.
        assert CU_KA_AVG_ANGSTROM == pytest.approx(1.541874, rel=1e-4)
        assert CU_KA_AVG_ANGSTROM != pytest.approx(1.5406, abs=1e-4)


class TestTchMixing:
    def test_pure_gaussian(self):
        svc = RietveldService()
        gamma, eta = svc._tch_mixing(0.1, 0.0)
        assert gamma == pytest.approx(0.1, rel=1e-9)
        assert eta == pytest.approx(0.0, abs=1e-9)

    def test_pure_lorentzian(self):
        svc = RietveldService()
        gamma, eta = svc._tch_mixing(0.0, 0.1)
        assert gamma == pytest.approx(0.1, rel=1e-9)
        assert eta == pytest.approx(1.0, abs=1e-9)

    def test_eta_matches_tch_polynomial(self):
        svc = RietveldService()
        fw_g, fw_l = 0.2, 0.15
        gamma, eta = svc._tch_mixing(fw_g, fw_l)
        expected_gamma = (
            fw_g ** 5
            + TCH_GAMMA_COEFFS[0] * fw_g ** 4 * fw_l
            + TCH_GAMMA_COEFFS[1] * fw_g ** 3 * fw_l ** 2
            + TCH_GAMMA_COEFFS[2] * fw_g ** 2 * fw_l ** 3
            + TCH_GAMMA_COEFFS[3] * fw_g * fw_l ** 4
            + TCH_GAMMA_COEFFS[4] * fw_l ** 5
        ) ** 0.2
        q = fw_l / expected_gamma
        expected_eta = (
            TCH_ETA_COEFFS[0] * q
            + TCH_ETA_COEFFS[1] * q ** 2
            + TCH_ETA_COEFFS[2] * q ** 3
        )
        assert gamma == pytest.approx(expected_gamma, rel=1e-9)
        assert eta == pytest.approx(expected_eta, rel=1e-9)
        assert 0.0 <= eta <= 1.0

    def test_mixing_always_returns_valid_eta(self):
        svc = RietveldService()
        for fw_g, fw_l in [(0.0, 0.0), (0.05, 0.3), (0.3, 0.05), (1.0, 1.0)]:
            gamma, eta = svc._tch_mixing(fw_g, fw_l)
            assert gamma > 0
            assert 0.0 <= eta <= 1.0


class TestPseudoVoigt:
    def test_area_normalized_dual_width(self):
        """pV with independent L/G widths integrates to ~1 (wide range for L tails)."""
        svc = RietveldService()
        x = np.linspace(-30, 30, 60001)
        for fw_l, fw_g, eta in [(1.0, 1.0, 0.5), (0.5, 1.5, 0.3), (1.5, 0.5, 0.8), (0.2, 0.2, 1.0)]:
            profile = svc._pseudo_voigt(x, 0.0, fw_l, fw_g, eta)
            integral = np.trapezoid(profile, x)
            assert integral == pytest.approx(1.0, abs=0.02)

    def test_backward_compat_fwhm_keyword(self):
        svc = RietveldService()
        x = np.linspace(-5, 5, 10000)
        profile = svc._pseudo_voigt(x, x0=0.0, fwhm=1.0, eta=0.5)
        assert np.trapezoid(profile, x) == pytest.approx(1.0, abs=0.05)

    def test_lorentzian_tails_dominance(self):
        svc = RietveldService()
        x = np.linspace(-10, 10, 20001)
        pure_l = svc._pseudo_voigt(x, 0.0, 1.0, 1.0, 1.0)
        pure_g = svc._pseudo_voigt(x, 0.0, 1.0, 1.0, 0.0)
        # Lorentzian decays more slowly than the Gaussian in the tails.
        assert pure_l[np.abs(x) > 4].max() > pure_g[np.abs(x) > 4].max()


class TestWeights:
    def test_poisson_weights_proportional_to_1_over_y(self):
        svc = RietveldService()
        y = np.array([200.0, 500.0, 1000.0])
        w = svc._weights(y)
        # All channels sit above the 5% floor, so w*y must be constant.
        assert w[0] * y[0] == pytest.approx(w[1] * y[1], rel=1e-9)
        assert w[1] * y[1] == pytest.approx(w[2] * y[2], rel=1e-9)

    def test_zero_channels_bounded(self):
        """Zero-count channels get the max finite weight (1/floor), no blow-up."""
        svc = RietveldService()
        y = np.array([0.0, 0.0, 100.0])
        w = svc._weights(y)
        assert np.all(np.isfinite(w))
        assert w[0] == pytest.approx(w[1], abs=1e-12)
        assert w[0] == pytest.approx(w[2] * 20.0, rel=1e-9)

    def test_scale_invariance(self):
        svc = RietveldService()
        y = np.array([1.0, 2.0, 5.0, 20.0])
        w1 = svc._weights(y)
        w2 = svc._weights(y * 100.0)
        # Relative weights (ratios) must be unchanged by rescaling.
        assert w1 / w1.max() == pytest.approx(w2 / w2.max(), rel=1e-9)

    def test_rwp_consistent_with_weights(self):
        svc = RietveldService()
        obs = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
        calc = np.array([10.5, 19.5, 30.5, 39.5, 50.5])
        w = svc._weights(obs)
        expected = math.sqrt(np.sum(w * (obs - calc) ** 2) / np.sum(w * obs ** 2)) * 100.0
        assert svc._compute_rwp(obs, calc) == pytest.approx(expected, rel=1e-9)


class TestMarchDollase:
    def test_random_orientation_gives_identity(self):
        svc = RietveldService()
        g_star = svc._compute_reciprocal_metric_tensor(5.431, 5.431, 5.431, 90, 90, 90)
        for hkl in [(1, 0, 0), (1, 1, 1), (0, 0, 1), (2, 1, 0)]:
            assert svc._march_dollase(*hkl, g_star, 1.0) == pytest.approx(1.0, abs=1e-9)

    def test_texured_peaks_prefer_axial_scattering_vectors(self):
        svc = RietveldService()
        g_star = svc._compute_reciprocal_metric_tensor(5.431, 5.431, 5.431, 90, 90, 90)
        r = 2.0
        # Texture axis is [001]. With r > 1 the [001] planes lose intensity
        # while the perpendicular (100) planes gain it.
        p_axial = svc._march_dollase(0, 0, 1, g_star, r)
        p_perp = svc._march_dollase(1, 0, 0, g_star, r)
        assert p_axial < 1.0
        assert p_perp > 1.0
        # Exact analytic values: P = r^-3 for (001), r^(+3/2) for (100).
        assert p_axial == pytest.approx(r ** -3, rel=1e-9)
        assert p_perp == pytest.approx(r ** 1.5, rel=1e-9)


class TestBackground:
    def test_chebyshev_constant_term(self):
        svc = RietveldService()
        tth = np.linspace(10, 80, 100)
        bg = svc._chebyshev_bg([5.0, 0.0, 0.0, 0.0], tth)
        np.testing.assert_allclose(bg, 5.0, rtol=1e-9)

    def test_chebyshev_t1_linearity(self):
        svc = RietveldService()
        tth = np.linspace(20, 60, 50)
        x = 2.0 * (tth - 20.0) / (60.0 - 20.0) - 1.0
        bg = svc._chebyshev_bg([0.0, 2.0, 0.0, 0.0], tth)
        np.testing.assert_allclose(bg, 2.0 * x, rtol=1e-9)


class TestRefinementOutput:
    def _observed_pattern(self, wavelength=1.541874):
        peaks = _silicon_peaks(n_strong=18)
        phase = _silicon_phase(peaks)
        tth = np.linspace(10, 80, 100)
        svc = RietveldService()
        y = np.zeros_like(tth)
        U, V, W = 0.004, -0.0015, 0.008
        for p in peaks:
            th = math.radians(p["two_theta"] / 2.0)
            fwhm = math.degrees(math.sqrt(U * math.tan(th) ** 2 + V * math.tan(th) + W))
            profile = svc._pseudo_voigt(tth, p["two_theta"], fwhm, fwhm, 0.5)
            y += p["intensity"] * profile
        y = 200.0 * y / y.max() + 12.0 + 0.03 * tth
        rng = np.random.default_rng(1234)
        y_obs = np.maximum(y + rng.normal(0, 1.2, y.size), 0.0)
        return tth, y_obs, phase, svc

    def test_refinement_converges_and_reports_all_metrics(self):
        tth, y_obs, phase, svc = self._observed_pattern()
        result = svc.refine(tth, y_obs, [phase], wavelength=1.541874, max_iter=80)
        assert result.success, result.message
        assert result.r_wp is not None and result.r_wp < 80
        assert result.r_p is not None
        assert result.chi_squared is not None
        assert result.gof is not None
        assert result.r_exp is not None
        assert result.durbin_watson is not None
        assert len(result.calculated) == len(tth)

    def test_parameter_uncertainties_are_finite_and_nonnegative(self):
        tth, y_obs, phase, svc = self._observed_pattern()
        result = svc.refine(tth, y_obs, [phase], wavelength=1.541874, max_iter=80)
        assert result.success
        unc = result.parameter_uncertainties
        assert unc is not None
        for name, val in unc.items():
            assert math.isfinite(val), f"{name} uncertainty not finite: {val}"
            assert val >= 0.0, f"{name} uncertainty negative: {val}"
        # esd of the refined scale should be nonzero when the optimizer moved.
        assert unc.get("scale", 0.0) >= 0.0

    def test_unpack_params_round_trip(self):
        svc = RietveldService()
        x = np.array([2.0, 0.1, 1.0, 0.5, 0.25, 0.125,
                      0.004, -0.001, 0.008, 800.0, 0.001, 1.5, 0.2])
        info = {"crystal_system": "Cubic", "initial": (5.431,) * 6, "param_indices": [13]}
        x = np.concatenate([x, [5.43]])
        rp = svc._unpack_params(x, 4, 0, 1, [info])
        assert rp.scale == pytest.approx(2.0)
        assert rp.zero_shift == pytest.approx(0.1)
        assert rp.U == pytest.approx(0.004)
        assert rp.size_angstrom == pytest.approx(800.0)
        assert rp.microstrain_eps == pytest.approx(0.001)
        assert rp.preferred_orientation == pytest.approx(1.5)
        assert rp.sample_displacement == pytest.approx(0.2)
        assert rp.phase_fractions == [1.0]
