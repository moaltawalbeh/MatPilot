"""Tests for the scientific processing pipeline services."""

import math
import pytest
from backend.services.background_correction import correct_background
from backend.services.ka2_stripping import strip_ka2, compute_delta_2theta
from backend.services.noise_reduction import reduce_noise
from backend.services.intensity_normalization import normalize_max, normalize_area
from backend.services.scientific_pipeline import ScientificPipeline


def _make_silicon_pattern():
    """Create a synthetic Si XRD pattern for testing."""
    two_theta = [10.0 + i * 0.02 for i in range(2000)]
    si_peaks = [28.44, 47.30, 56.12, 69.13, 76.38]
    intensity = []
    for t in two_theta:
        bg = 50 + 0.1 * t
        signal = sum(
            500 * math.exp(-0.5 * ((t - pk) / 0.15) ** 2)
            for pk in si_peaks
        )
        noise = (hash(str(t)) % 10 - 5) * 0.5
        intensity.append(bg + signal + noise)
    return two_theta, intensity


class TestBackgroundCorrection:
    def test_removes_background(self):
        tt, ii = _make_silicon_pattern()
        result = correct_background(tt, ii, polynomial_order=4, max_iterations=30)
        assert result.intensity_corrected is not None
        assert len(result.intensity_corrected) == len(tt)
        assert result.background is not None
        assert len(result.background) == len(tt)
        assert result.polynomial_coeffs is not None
        # Background should be non-negative
        assert all(b >= 0 for b in result.background)

    def test_preserves_peaks(self):
        tt, ii = _make_silicon_pattern()
        result = correct_background(tt, ii)
        # The Si peak at 28.44° should still be prominent
        peak_idx = min(range(len(tt)), key=lambda i: abs(tt[i] - 28.44))
        peak_intensity = result.intensity_corrected[peak_idx]
        # Should be significantly above zero
        assert peak_intensity > 100


class TestKa2Stripping:
    def test_compute_delta_2theta(self):
        delta = compute_delta_2theta(30.0, 1.5406, 1.00242)
        assert delta > 0
        assert delta < 1.0

    def test_delta_increases_with_angle(self):
        d1 = compute_delta_2theta(20.0, 1.5406, 1.00242)
        d2 = compute_delta_2theta(60.0, 1.5406, 1.00242)
        assert d2 > d1

    def test_strip_ka2(self):
        tt, ii = _make_silicon_pattern()
        result = strip_ka2(tt, ii, element="Cu", wavelength=1.5406)
        assert result.intensity_stripped is not None
        assert len(result.intensity_stripped) == len(tt)
        assert result.ka2_component is not None
        assert result.delta_2theta > 0


class TestNoiseReduction:
    def test_smooths_noise(self):
        tt, ii = _make_silicon_pattern()
        result = reduce_noise(tt, ii, window_size=11, polynomial_order=3)
        assert result.intensity_smoothed is not None
        assert len(result.intensity_smoothed) == len(tt)

    def test_preserves_peak_positions(self):
        tt, ii = _make_silicon_pattern()
        result = reduce_noise(tt, ii)
        # Peak at 28.44° should still be at the same position
        peak_idx = min(range(len(tt)), key=lambda i: abs(tt[i] - 28.44))
        peak_intensity = result.intensity_smoothed[peak_idx]
        assert peak_intensity > 100


class TestNormalization:
    def test_max_normalization(self):
        tt, ii = _make_silicon_pattern()
        result = normalize_max(tt, ii)
        assert result.intensity_normalized is not None
        assert max(result.intensity_normalized) == pytest.approx(100.0, rel=1e-6)

    def test_area_normalization(self):
        tt, ii = _make_silicon_pattern()
        result = normalize_area(tt, ii)
        assert result.intensity_normalized is not None
        assert result.method == "area"


class TestScientificPipeline:
    def test_stage_definitions(self):
        pipeline = ScientificPipeline()
        stages = pipeline.get_stage_definitions()
        assert len(stages) == 8
        stage_ids = [s["id"] for s in stages]
        assert "background_correction" in stage_ids
        assert "peak_detection" in stage_ids
        assert "phase_identification" in stage_ids
        assert "rietveld_refinement" in stage_ids
