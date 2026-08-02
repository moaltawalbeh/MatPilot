"""Tests for the background correction service (iterative polynomial + SNIP)."""

import numpy as np
import pytest

from backend.services.background_correction import (
    correct_background,
    estimate_background,
    estimate_background_snip,
)


def _pattern_with_background():
    """Synthetic Si-like pattern: linear background + Gaussian peaks."""
    tt = np.arange(10.0, 100.0, 0.02)
    bg = 50.0 + 0.15 * tt
    intensity = bg.copy()
    for pk in (28.44, 47.30, 56.12, 69.13, 76.38):
        intensity += 500 * np.exp(-0.5 * ((tt - pk) / 0.15) ** 2)
    return tt.tolist(), intensity.tolist()


class TestPolyBackground:
    def test_subtraction_invariant(self):
        tt, ii = _pattern_with_background()
        result = correct_background(tt, ii, polynomial_order=4)
        for i in range(len(ii)):
            expected = max(0.0, ii[i] - result.background[i])
            assert abs(result.intensity_corrected[i] - expected) < 1e-9

    def test_background_nonnegative_and_length(self):
        tt, ii = _pattern_with_background()
        result = correct_background(tt, ii)
        assert len(result.background) == len(tt)
        assert len(result.intensity_corrected) == len(tt)
        assert all(b >= 0 for b in result.background)
        assert result.iterations > 0

    def test_off_peak_residual_is_small(self):
        tt, ii = _pattern_with_background()
        result = correct_background(tt, ii, polynomial_order=4)
        # Far from any peak the corrected intensity should be near zero.
        idx = int(np.argmin(np.abs(np.asarray(tt) - 60.0)))
        assert 0 <= result.intensity_corrected[idx] < 50

    def test_peak_preserved(self):
        tt, ii = _pattern_with_background()
        result = correct_background(tt, ii)
        idx = int(np.argmin(np.abs(np.asarray(tt) - 28.44)))
        assert result.intensity_corrected[idx] > 100

    def test_estimate_background_returns_poly_coeffs(self):
        tt, ii = _pattern_with_background()
        corrected, background, coeffs, iterations = estimate_background(
            np.asarray(tt), np.asarray(ii), polynomial_order=4
        )
        assert len(coeffs) == 5
        assert iterations > 0
        assert len(corrected) == len(tt)


class TestSnipBackground:
    def test_snip_removes_background_and_preserves_peaks(self):
        tt, ii = _pattern_with_background()
        result = correct_background(tt, ii, method="snip", clip_window=30)
        assert len(result.background) == len(tt)
        assert all(b >= 0 for b in result.background)
        assert result.iterations > 0
        idx = int(np.argmin(np.abs(np.asarray(tt) - 28.44)))
        assert result.intensity_corrected[idx] > 100

    def test_snip_subtraction_invariant(self):
        tt, ii = _pattern_with_background()
        result = correct_background(tt, ii, method="snip")
        for i in range(len(ii)):
            expected = max(0.0, ii[i] - result.background[i])
            assert abs(result.intensity_corrected[i] - expected) < 1e-9

    def test_snip_preserves_constant_background(self):
        # For a constant background there is nothing to clip, so SNIP must
        # recover it exactly.
        tt = np.arange(10.0, 60.0, 0.05)
        bg = np.full_like(tt, 100.0)
        result = correct_background(tt.tolist(), bg.tolist(), method="snip", clip_window=40)
        assert np.max(np.abs(np.asarray(result.intensity_corrected))) < 1e-6

    def test_snip_estimator(self):
        intensity = np.asarray([0.0, 1.0, 5.0, 10.0, 5.0, 1.0, 0.0], dtype=float)
        background, passes = estimate_background_snip(intensity, clip_window=3)
        assert passes == 3
        assert len(background) == len(intensity)
        assert np.all(background >= 0)
