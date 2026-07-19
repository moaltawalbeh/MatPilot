"""Tests for Rietveld Refinement Service.

Tests the real Rietveld refinement engine with known crystal structures.
"""

import math
import numpy as np
import pytest


class TestRietveldService:
    """Test the Rietveld refinement engine."""

    def _make_silicon_cif(self):
        """Silicon (Fd-3m) CIF data for testing."""
        return {
            "formula": "Si",
            "name": "Silicon",
            "space_group": "Fd-3m",
            "space_group_number": 227,
            "unit_cell": {"a": 5.431, "b": 5.431, "c": 5.431, "alpha": 90, "beta": 90, "gamma": 90},
            "atoms": [
                {"element": "Si", "x": 0.0, "y": 0.0, "z": 0.0, "occupancy": 1.0},
                {"element": "Si", "x": 0.5, "y": 0.5, "z": 0.5, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.25, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.75, "y": 0.75, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.0, "y": 0.5, "z": 0.5, "occupancy": 1.0},
                {"element": "Si", "x": 0.5, "y": 0.0, "z": 0.5, "occupancy": 1.0},
                {"element": "Si", "x": 0.5, "y": 0.5, "z": 0.0, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.75, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.75, "y": 0.25, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.75, "y": 0.75, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.0, "y": 0.25, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.0, "y": 0.75, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.5, "y": 0.75, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.5, "y": 0.25, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.0, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.75, "y": 0.0, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.5, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.75, "y": 0.5, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.25, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.75, "y": 0.75, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.75, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.75, "y": 0.25, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.0, "y": 0.0, "z": 0.5, "occupancy": 1.0},
                {"element": "Si", "x": 0.0, "y": 0.5, "z": 0.0, "occupancy": 1.0},
                {"element": "Si", "x": 0.5, "y": 0.0, "z": 0.0, "occupancy": 1.0},
                {"element": "Si", "x": 0.0, "y": 0.25, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.0, "y": 0.75, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.5, "y": 0.25, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.5, "y": 0.75, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.0, "z": 0.25, "occupancy": 1.0},
                {"element": "Si", "x": 0.75, "y": 0.0, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.5, "z": 0.75, "occupancy": 1.0},
                {"element": "Si", "x": 0.75, "y": 0.5, "z": 0.25, "occupancy": 1.0},
            ],
        }

    def _generate_synthetic_pattern(self, cif_data, wavelength=1.5406):
        """Generate a synthetic experimental pattern from CIF data with noise."""
        from backend.reference.theoretical_pattern import TheoreticalPatternGenerator
        gen = TheoreticalPatternGenerator(wavelength=wavelength)
        peaks = gen.generate_pattern(cif_data, max_two_theta=80.0)

        tth = np.linspace(10, 80, 700)
        intensity = np.zeros_like(tth)

        for peak in peaks:
            center = peak["two_theta"]
            intens = peak["intensity"]
            sigma = 0.15
            intensity += intens * np.exp(-0.5 * ((tth - center) / sigma) ** 2)

        # Add background
        bg = 0.5 + 0.01 * tth + 0.0001 * tth ** 2
        intensity += bg

        # Add noise
        np.random.seed(42)
        noise = np.random.normal(0, 1.5, len(tth))
        intensity += noise
        intensity = np.maximum(intensity, 0)

        return tth, intensity, peaks

    def test_refinement_converges_with_silicon(self):
        """Rietveld refinement of synthetic Si pattern should converge with low Rwp."""
        from backend.services.rietveld_service import RietveldService

        cif = self._make_silicon_cif()
        tth, intensity, _ = self._generate_synthetic_pattern(cif)

        svc = RietveldService(wavelength=1.5406)
        result = svc.refine(
            two_theta_obs=tth,
            intensity_obs=intensity,
            phase_cifs=[cif],
            wavelength=1.5406,
            max_iter=300,
        )

        assert result.success, f"Refinement failed: {result.message}"
        assert result.r_wp is not None
        assert result.r_p is not None
        assert result.chi_squared is not None
        assert result.gof is not None
        assert result.r_wp > 0, "Rwp should be positive"
        assert result.r_wp < 80, f"Rwp too high: {result.r_wp}%"
        assert result.r_p < 60, f"Rp too high: {result.r_p}%"
        assert len(result.calculated) == len(tth)
        assert len(result.difference) == len(tth)
        assert len(result.background) == len(tth)
        assert result.parameters is not None
        assert result.parameters.scale > 0

    def test_refinement_calculated_matches_observed_shape(self):
        """Calculated pattern must have same length as observed."""
        from backend.services.rietveld_service import RietveldService

        cif = self._make_silicon_cif()
        tth, intensity, _ = self._generate_synthetic_pattern(cif)

        svc = RietveldService()
        result = svc.refine(tth, intensity, [cif])

        assert result.success
        assert len(result.two_theta) == len(tth)
        assert len(result.observed) == len(tth)
        assert len(result.calculated) == len(tth)

    def test_difference_curve_is_obs_minus_calc(self):
        """Difference curve = observed - calculated."""
        from backend.services.rietveld_service import RietveldService

        cif = self._make_silicon_cif()
        tth, intensity, _ = self._generate_synthetic_pattern(cif)

        svc = RietveldService()
        result = svc.refine(tth, intensity, [cif])

        assert result.success
        obs = np.array(result.observed)
        calc = np.array(result.calculated)
        diff = np.array(result.difference)
        np.testing.assert_allclose(diff, obs - calc, rtol=1e-10)

    def test_rwp_formula(self):
        """Rwp = sqrt(sum(w*(obs-calc)^2) / sum(w*obs^2)) * 100."""
        from backend.services.rietveld_service import RietveldService

        svc = RietveldService()
        obs = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
        calc = np.array([10.5, 19.5, 30.5, 39.5, 50.5])
        rwp = svc._compute_rwp(obs, calc)

        eps = 1e-10
        weights = np.where(obs > eps, 1.0 / obs, 0.0)
        expected = math.sqrt(
            np.sum(weights * (obs - calc) ** 2) / np.sum(weights * obs ** 2)
        ) * 100

        assert abs(rwp - expected) < 0.001

    def test_rp_formula(self):
        """Rp = sum(|obs-calc|) / sum(|obs|) * 100."""
        from backend.services.rietveld_service import RietveldService

        svc = RietveldService()
        obs = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
        calc = np.array([10.5, 19.5, 30.5, 39.5, 50.5])
        rp = svc._compute_rp(obs, calc)

        expected = np.sum(np.abs(obs - calc)) / np.sum(np.abs(obs)) * 100
        assert abs(rp - expected) < 0.001

    def test_perfect_match_gives_low_r_factors(self):
        """When obs == calc, R-factors should be very small."""
        from backend.services.rietveld_service import RietveldService

        svc = RietveldService()
        obs = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
        rwp = svc._compute_rwp(obs, obs)
        rp = svc._compute_rp(obs, obs)

        assert rwp < 0.01, f"Rwp for perfect match: {rwp}"
        assert rp < 0.01, f"Rp for perfect match: {rp}"

    def test_pseudovoigt_profile_normalization(self):
        """Pseudo-Voigt profile should integrate to approximately 1."""
        from backend.services.rietveld_service import RietveldService

        svc = RietveldService()
        x = np.linspace(-5, 5, 10000)
        profile = svc._pseudo_voigt(x, x0=0.0, fwhm=1.0, eta=0.5)
        integral = np.trapezoid(profile, x)

        assert abs(integral - 1.0) < 0.05, f"Profile integral: {integral}"

    def test_polynomial_background(self):
        """Polynomial background should evaluate correctly."""
        from backend.services.rietveld_service import RietveldService

        svc = RietveldService()
        coeffs = np.array([10.0, 0.5, 0.001, 0.0])
        tth = np.array([0.0, 10.0, 20.0, 30.0])
        bg = svc._polynomial_bg(coeffs, tth)

        expected = 10.0 + 0.5 * (tth / 100) + 0.001 * (tth / 100) ** 2
        np.testing.assert_allclose(bg, expected, rtol=1e-10)

    def test_empty_phases_returns_error(self):
        """No phases should return error."""
        from backend.services.rietveld_service import RietveldService

        svc = RietveldService()
        result = svc.refine(
            two_theta_obs=np.linspace(10, 80, 100),
            intensity_obs=np.ones(100),
            phase_cifs=[],
        )

        assert not result.success
        assert "No phases" in result.message

    def test_insufficient_data_returns_error(self):
        """Too few data points should return error."""
        from backend.services.rietveld_service import RietveldService

        svc = RietveldService()
        result = svc.refine(
            two_theta_obs=np.array([10.0, 20.0, 30.0]),
            intensity_obs=np.array([100.0, 200.0, 300.0]),
            phase_cifs=[self._make_silicon_cif()],
        )

        assert not result.success
        assert "Insufficient" in result.message

    def test_refinement_iterations_are_positive(self):
        """Successful refinement should take at least 1 iteration."""
        from backend.services.rietveld_service import RietveldService

        cif = self._make_silicon_cif()
        tth, intensity, _ = self._generate_synthetic_pattern(cif)

        svc = RietveldService()
        result = svc.refine(tth, intensity, [cif])

        assert result.success
        assert result.iterations >= 1

    def test_phase_fractions_sum_to_one(self):
        """Phase fractions should sum to ~1 for single phase."""
        from backend.services.rietveld_service import RietveldService

        cif = self._make_silicon_cif()
        tth, intensity, _ = self._generate_synthetic_pattern(cif)

        svc = RietveldService()
        result = svc.refine(tth, intensity, [cif])

        assert result.success
        if result.parameters and result.parameters.phase_fractions:
            total = sum(result.parameters.phase_fractions)
            assert abs(total - 1.0) < 0.15, f"Phase fractions sum: {total}"

    def test_background_is_physically_reasonable(self):
        """Background should be bounded relative to observed intensity."""
        from backend.services.rietveld_service import RietveldService

        cif = self._make_silicon_cif()
        tth, intensity, _ = self._generate_synthetic_pattern(cif)

        svc = RietveldService()
        result = svc.refine(tth, intensity, [cif])

        assert result.success
        bg = np.array(result.background)
        obs_max = np.max(intensity)
        # Background should not exceed 5x the observed maximum
        assert np.all(bg < 5 * obs_max), "Background excessively large"
        # Background should not be more negative than -1x the observed max
        assert np.all(bg > -obs_max), "Background excessively negative"

    def test_multi_phase_refinement(self):
        """Refinement with two phases should converge."""
        from backend.services.rietveld_service import RietveldService

        cif_si = self._make_silicon_cif()
        cif_al = {
            "formula": "Al",
            "name": "Aluminum",
            "space_group": "Fm-3m",
            "space_group_number": 225,
            "unit_cell": {"a": 4.049, "b": 4.049, "c": 4.049, "alpha": 90, "beta": 90, "gamma": 90},
            "atoms": [
                {"element": "Al", "x": 0.0, "y": 0.0, "z": 0.0, "occupancy": 1.0},
                {"element": "Al", "x": 0.5, "y": 0.5, "z": 0.0, "occupancy": 1.0},
                {"element": "Al", "x": 0.5, "y": 0.0, "z": 0.5, "occupancy": 1.0},
                {"element": "Al", "x": 0.0, "y": 0.5, "z": 0.5, "occupancy": 1.0},
            ],
        }

        # Mix 70% Si + 30% Al
        from backend.reference.theoretical_pattern import TheoreticalPatternGenerator
        gen = TheoreticalPatternGenerator(wavelength=1.5406)
        si_peaks = gen.generate_pattern(cif_si, max_two_theta=80.0)
        al_peaks = gen.generate_pattern(cif_al, max_two_theta=80.0)

        tth = np.linspace(10, 80, 700)
        intensity = np.zeros_like(tth)

        for p in si_peaks:
            intensity += 0.7 * p["intensity"] * np.exp(-0.5 * ((tth - p["two_theta"]) / 0.15) ** 2)
        for p in al_peaks:
            intensity += 0.3 * p["intensity"] * np.exp(-0.5 * ((tth - p["two_theta"]) / 0.15) ** 2)

        bg = 0.5 + 0.01 * tth
        intensity += bg
        np.random.seed(42)
        intensity += np.random.normal(0, 1.5, len(tth))
        intensity = np.maximum(intensity, 0)

        svc = RietveldService()
        result = svc.refine(tth, intensity, [cif_si, cif_al], max_iter=300)

        assert result.success, f"Multi-phase refinement failed: {result.message}"
        assert len(result.phases_used) == 2
        assert result.r_wp < 80, f"Rwp too high for multi-phase: {result.r_wp}"

    def test_result_contains_all_required_fields(self):
        """RietveldResult must contain all required fields."""
        from backend.services.rietveld_service import RietveldService, RietveldResult

        cif = self._make_silicon_cif()
        tth, intensity, _ = self._generate_synthetic_pattern(cif)

        svc = RietveldService()
        result = svc.refine(tth, intensity, [cif])

        assert result.success
        assert result.message
        assert isinstance(result.r_wp, (int, float))
        assert isinstance(result.r_p, (int, float))
        assert isinstance(result.chi_squared, (int, float))
        assert isinstance(result.gof, (int, float))
        assert isinstance(result.two_theta, list)
        assert isinstance(result.observed, list)
        assert isinstance(result.calculated, list)
        assert isinstance(result.difference, list)
        assert isinstance(result.background, list)
        assert result.parameters is not None
        assert isinstance(result.phases_used, list)
        assert isinstance(result.iterations, int)
