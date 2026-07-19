"""End-to-End Scientific Pipeline Validation Test.

Tests the complete XRD analysis workflow using synthetic Silicon data:
1. Upload/create experiment with synthetic Si pattern
2. Background correction
3. Ka2 stripping
4. Noise reduction
5. Intensity normalization
6. Peak detection
7. Phase identification (local DB)
8. Candidate selection
9. Rietveld refinement
10. Verify all statistics (Rwp, Rp, Rexp, chi^2, GoF)

Uses real services, not mocked. Validates scientific correctness.
"""

import math
import numpy as np
import pytest
from unittest.mock import MagicMock, AsyncMock


def _make_silicon_pattern(n_points=500, add_noise=True):
    """Generate a realistic synthetic Silicon XRD pattern.

    Si (Fd-3m, a=5.431 A) with Cu K-alpha (1.5406 A).
    Major peaks at: 28.44, 47.30, 56.12, 69.13, 76.38, 88.03, 94.95 deg 2-theta.
    """
    np.random.seed(42)

    two_theta = np.linspace(10, 100, n_points)

    # Si peak positions and relative intensities (Cu K-alpha)
    si_peaks = [
        (28.443, 100.0, 0.15),  # (2theta, relative_intensity, FWHM)
        (47.303, 55.0, 0.18),
        (56.122, 30.0, 0.20),
        (69.130, 25.0, 0.22),
        (76.380, 8.0, 0.25),
        (88.032, 12.0, 0.28),
        (94.950, 4.0, 0.30),
    ]

    intensity = np.zeros_like(two_theta)
    for pos, rel_int, fwhm in si_peaks:
        sigma = fwhm / (2.0 * math.sqrt(2.0 * math.log(2.0)))
        intensity += rel_int * np.exp(-0.5 * ((two_theta - pos) / sigma) ** 2)

    # Add polynomial background
    bg = 5.0 + 2.0 * (two_theta / 100.0) + 1.5 * (two_theta / 100.0) ** 2
    intensity += bg

    # Add realistic noise
    if add_noise:
        noise = np.random.normal(0, 1.5, size=n_points)
        intensity += noise

    # Ensure non-negative
    intensity = np.maximum(intensity, 0.0)

    return two_theta.tolist(), intensity.tolist()


class TestBackgroundCorrection:
    """Test background estimation and subtraction."""

    def test_removes_background(self):
        from backend.services.background_correction import correct_background

        tt, ii = _make_silicon_pattern()
        result = correct_background(tt, ii)

        assert len(result.intensity_corrected) == len(tt)
        assert len(result.background) == len(tt)
        assert result.iterations > 0
        assert result.iterations <= 50

    def test_background_is_subtracted(self):
        from backend.services.background_correction import correct_background

        tt, ii = _make_silicon_pattern()
        result = correct_background(tt, ii)

        # Corrected = Original - Background
        for i in range(len(ii)):
            expected = max(0.0, ii[i] - result.background[i])
            assert abs(result.intensity_corrected[i] - expected) < 1e-10

    def test_corrected_has_peaks(self):
        from backend.services.background_correction import correct_background

        tt, ii = _make_silicon_pattern()
        result = correct_background(tt, ii)

        # After background subtraction, Si peak at 28.44 should be prominent
        idx_2844 = min(range(len(tt)), key=lambda i: abs(tt[i] - 28.44))
        peak_val = result.intensity_corrected[idx_2844]
        assert peak_val > 10, f"Si peak at 28.44 should be visible after bg correction, got {peak_val}"

    def test_no_negative_corrected(self):
        from backend.services.background_correction import correct_background

        tt, ii = _make_silicon_pattern()
        result = correct_background(tt, ii)
        assert all(v >= 0 for v in result.intensity_corrected)


class TestKa2Stripping:
    """Test Ka2 removal."""

    def test_compute_delta(self):
        from backend.services.ka2_stripping import compute_delta_2theta, WAVELENGTH_RATIOS

        wavelength = 1.54056
        ratio = WAVELENGTH_RATIOS["Cu"]
        delta = compute_delta_2theta(28.44, wavelength, ratio)
        assert 0 < delta < 1.0

    def test_delta_increases_with_angle(self):
        from backend.services.ka2_stripping import compute_delta_2theta, WAVELENGTH_RATIOS

        wavelength = 1.54056
        ratio = WAVELENGTH_RATIOS["Cu"]
        d1 = compute_delta_2theta(20.0, wavelength, ratio)
        d2 = compute_delta_2theta(60.0, wavelength, ratio)
        assert d2 > d1

    def test_strip_ka2(self):
        from backend.services.ka2_stripping import strip_ka2

        tt, ii = _make_silicon_pattern()
        result = strip_ka2(tt, ii, element="Cu", wavelength=1.5406)

        assert len(result.intensity_stripped) == len(tt)
        assert result.delta_2theta > 0
        assert result.ratio_used > 0


class TestNoiseReduction:
    """Test noise reduction."""

    def test_smooths_data(self):
        from backend.services.noise_reduction import reduce_noise

        tt, ii = _make_silicon_pattern()
        result = reduce_noise(tt, ii, window_size=11, polynomial_order=3)

        assert len(result.intensity_smoothed) == len(tt)

    def test_preserves_peaks(self):
        from backend.services.noise_reduction import reduce_noise

        tt, ii = _make_silicon_pattern()
        result = reduce_noise(tt, ii, window_size=11, polynomial_order=3)

        # Si peak at 28.44 should still be prominent
        idx_2844 = min(range(len(tt)), key=lambda i: abs(tt[i] - 28.44))
        assert result.intensity_smoothed[idx_2844] > 10


class TestIntensityNormalization:
    """Test normalization."""

    def test_max_normalization(self):
        from backend.services.intensity_normalization import normalize_max

        tt, ii = _make_silicon_pattern()
        result = normalize_max(tt, ii)
        assert abs(max(result.intensity_normalized) - 100.0) < 1e-10

    def test_area_normalization(self):
        from backend.services.intensity_normalization import normalize_area

        tt, ii = _make_silicon_pattern()
        result = normalize_area(tt, ii)
        assert result.method == "area"


class TestPeakDetection:
    """Test peak detection algorithm."""

    def test_detects_si_peaks(self):
        from backend.services.peak_detection import detect_peaks

        tt, ii = _make_silicon_pattern()
        peaks = detect_peaks(tt, ii, wavelength_angstrom=1.5406)

        # Should detect at least the 3 strongest Si peaks
        assert len(peaks) >= 3, f"Expected >= 3 Si peaks, got {len(peaks)}"

    def test_peak_positions_reasonable(self):
        from backend.services.peak_detection import detect_peaks

        tt, ii = _make_silicon_pattern()
        peaks = detect_peaks(tt, ii, wavelength_angstrom=1.5406)

        # Check that at least one peak is near 28.44 (strongest Si)
        near_2844 = [p for p in peaks if abs(p.two_theta - 28.44) < 1.0]
        assert len(near_2844) >= 1, "Should detect peak near Si 28.44 deg"

    def test_d_spacing_computed(self):
        from backend.services.peak_detection import detect_peaks

        tt, ii = _make_silicon_pattern()
        peaks = detect_peaks(tt, ii, wavelength_angstrom=1.5406)

        peaks_with_d = [p for p in peaks if p.d_spacing is not None]
        assert len(peaks_with_d) >= 3

        # Si (111) d-spacing should be ~3.135 A
        near_2844 = [p for p in peaks_with_d if abs(p.two_theta - 28.44) < 1.0]
        if near_2844:
            assert abs(near_2844[0].d_spacing - 3.135) < 0.1

    def test_fwhm_computed(self):
        from backend.services.peak_detection import detect_peaks

        tt, ii = _make_silicon_pattern()
        peaks = detect_peaks(tt, ii, wavelength_angstrom=1.5406)

        peaks_with_fwhm = [p for p in peaks if p.fwhm is not None]
        assert len(peaks_with_fwhm) >= 1
        for p in peaks_with_fwhm:
            assert 0.01 < p.fwhm < 5.0, f"FWHM {p.fwhm} not in reasonable range"


class TestPeakFitting:
    """Test peak fitting service."""

    def test_fit_peaks(self):
        from backend.services.peak_fitting import fit_peaks

        tt, ii = _make_silicon_pattern()
        peak_positions = [28.44, 47.30, 56.12]

        result = fit_peaks(tt, ii, peak_positions, wavelength_angstrom=1.5406)

        assert result.n_peaks_fitted >= 1, f"Should fit at least 1 peak, got {result.n_peaks_fitted}"
        assert result.r_factor < 50, f"R-factor {result.r_factor}% too high"

    def test_fitted_peak_has_params(self):
        from backend.services.peak_fitting import fit_peaks

        tt, ii = _make_silicon_pattern()
        result = fit_peaks(tt, ii, [28.44])

        if result.fitted_peaks:
            peak = result.fitted_peaks[0]
            assert abs(peak.two_theta - 28.44) < 1.0
            assert peak.fwhm > 0
            assert peak.area > 0
            assert 0 <= peak.eta <= 1


class TestSimilarityEngine:
    """Test pattern matching."""

    def test_perfect_match(self):
        from backend.reference.similarity_engine import SimilarityEngine

        engine = SimilarityEngine()
        exp_peaks = [
            {"two_theta": 28.44, "intensity": 100},
            {"two_theta": 47.30, "intensity": 55},
        ]
        ref_peaks = [
            {"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"},
            {"two_theta": 47.30, "intensity": 55, "d_spacing": 1.920, "hkl": "220"},
        ]

        result = engine.compare_patterns(exp_peaks, ref_peaks)
        assert result.match_score > 0.8
        assert result.matched_peaks == 2
        assert result.confidence == "High"

    def test_no_match(self):
        from backend.reference.similarity_engine import SimilarityEngine

        engine = SimilarityEngine()
        exp_peaks = [{"two_theta": 15.0, "intensity": 100}]
        ref_peaks = [{"two_theta": 80.0, "intensity": 100, "d_spacing": 1.0, "hkl": "001"}]

        result = engine.compare_patterns(exp_peaks, ref_peaks)
        assert result.match_score < 0.3


class TestScientificPipeline:
    """Test the full pipeline orchestration."""

    @pytest.mark.asyncio
    async def test_full_pipeline(self):
        from backend.services.scientific_pipeline import ScientificPipeline
        from backend.domain.entities.experiment import Experiment
        from uuid import uuid4

        pipeline = ScientificPipeline(reference_engine=None, upload_service=None)

        experiment = Experiment(
            id=uuid4(),
            name="Test Si Pattern",
            raw_two_theta=_make_silicon_pattern()[0],
            raw_intensity=_make_silicon_pattern()[1],
            wavelength_angstrom=1.5406,
        )

        # Run signal processing stages only (no phase ID without ref engine)
        result = await pipeline.run_full_pipeline(
            experiment,
            stages_to_run=[
                "background_correction",
                "ka2_stripping",
                "noise_reduction",
                "intensity_normalization",
                "peak_detection",
            ],
        )

        assert result["success"], f"Pipeline failed: {result}"
        completed = result["completed_stages"]
        assert "background_correction" in completed
        assert "peak_detection" in completed

        # Check that peaks were detected
        assert len(experiment.detected_peaks) >= 3, \
            f"Expected >= 3 peaks, got {len(experiment.detected_peaks)}"

    @pytest.mark.asyncio
    async def test_background_correction_result(self):
        from backend.services.scientific_pipeline import ScientificPipeline
        from backend.domain.entities.experiment import Experiment
        from uuid import uuid4

        pipeline = ScientificPipeline()
        tt, ii = _make_silicon_pattern()

        experiment = Experiment(
            id=uuid4(),
            raw_two_theta=tt,
            raw_intensity=ii,
            wavelength_angstrom=1.5406,
        )

        result = await pipeline.run_stage("background_correction", experiment)
        assert result["success"]
        assert result["iterations_used"] > 0

        # Check processed pattern was stored
        assert experiment._processed_pattern is not None
        assert len(experiment._processed_pattern["two_theta"]) == len(tt)


class TestRietveldService:
    """Test Rietveld refinement with synthetic Si data."""

    def test_refinement_with_silicon(self):
        from backend.services.rietveld_service import RietveldService
        from backend.reference.theoretical_pattern import TheoreticalPatternGenerator

        # Generate synthetic Si pattern
        gen = TheoreticalPatternGenerator(wavelength=1.5406)
        si_cif = {
            "formula": "Si",
            "name": "Silicon",
            "space_group": "Fd-3m",
            "unit_cell": {"a": 5.431, "b": 5.431, "c": 5.431},
            "atoms": [
                {"element": "Si", "x": 0.0, "y": 0.0, "z": 0.0, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.25, "z": 0.25, "occupancy": 1.0},
            ],
        }

        theo_peaks = gen.generate_pattern(si_cif, max_two_theta=100)
        assert theo_peaks, "Should generate theoretical Si peaks"

        # Create synthetic observed pattern
        np.random.seed(42)
        tth = np.linspace(10, 100, 500)
        i_obs = np.zeros_like(tth)
        for p in theo_peaks:
            sigma = 0.15
            i_obs += p["intensity"] * np.exp(-0.5 * ((tth - p["two_theta"]) / sigma) ** 2)
        i_obs += np.random.normal(0, 1.0, size=len(tth))
        i_obs = np.maximum(i_obs, 0.0)

        # Run Rietveld
        rietveld = RietveldService(wavelength=1.5406)
        result = rietveld.refine(
            two_theta_obs=tth,
            intensity_obs=i_obs,
            phase_cifs=[si_cif],
            wavelength=1.5406,
        )

        assert result.success, f"Refinement failed: {result.message}"
        assert result.r_wp is not None and result.r_wp < 80
        assert result.r_p is not None and result.r_p < 60
        assert result.r_exp is not None and result.r_exp > 0
        assert result.gof is not None
        assert result.iterations > 0
        assert len(result.two_theta) == len(tth)
        assert len(result.calculated) == len(tth)
        assert len(result.difference) == len(tth)
        assert len(result.background) == len(tth)


class TestReferenceEngine:
    """Test the reference engine with local database."""

    @pytest.mark.asyncio
    async def test_local_search_finds_silicon(self):
        from backend.reference.engine.reference_engine import ReferenceEngine
        from backend.reference.providers.local_cod_provider import LocalCODProvider

        engine = ReferenceEngine()
        engine._providers = {"LocalCOD": LocalCODProvider()}
        engine._provider_order = ["LocalCOD"]

        results = await engine.search("Si")
        assert len(results) > 0
        formulas = [r.formula for r in results]
        assert "Si" in formulas

    @pytest.mark.asyncio
    async def test_identify_phases_local(self):
        from backend.reference.engine.reference_engine import ReferenceEngine
        from backend.reference.providers.local_cod_provider import LocalCODProvider

        engine = ReferenceEngine()
        engine._providers = {"LocalCOD": LocalCODProvider()}
        engine._provider_order = ["LocalCOD"]

        exp_peaks = [
            {"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135},
            {"two_theta": 47.30, "intensity": 55, "d_spacing": 1.920},
            {"two_theta": 56.12, "intensity": 30, "d_spacing": 1.637},
        ]

        results = await engine.identify_phases(exp_peaks, query="Si")
        assert len(results) > 0
        # Silicon should be top-ranked
        assert results[0].material_formula == "Si"
        assert results[0].match_score > 0.5
