"""Tests for Similarity Engine."""

import pytest
from backend.reference.similarity_engine import SimilarityEngine, SimilarityResult


class TestSimilarityEngine:
    """Test pattern similarity comparison."""

    def setup_method(self):
        self.engine = SimilarityEngine(tolerance_deg=0.3, wavelength=1.5406)

    def test_perfect_match(self):
        """Test comparison of identical patterns."""
        exp_peaks = [
            {"two_theta": 28.44, "intensity": 100},
            {"two_theta": 47.30, "intensity": 55},
            {"two_theta": 56.12, "intensity": 30},
        ]
        ref_peaks = [
            {"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"},
            {"two_theta": 47.30, "intensity": 55, "d_spacing": 1.920, "hkl": "220"},
            {"two_theta": 56.12, "intensity": 30, "d_spacing": 1.637, "hkl": "311"},
        ]

        result = self.engine.compare_patterns(
            exp_peaks, ref_peaks,
            material_name="Silicon", material_formula="Si"
        )

        assert result.match_score > 0.9
        assert result.matched_peaks == 3
        assert result.confidence == "High"
        assert result.cosine_similarity > 0.9
        assert result.fom < 0.1

    def test_shifted_peaks(self):
        """Test comparison with shifted peak positions."""
        exp_peaks = [
            {"two_theta": 28.6, "intensity": 100},
            {"two_theta": 47.5, "intensity": 55},
        ]
        ref_peaks = [
            {"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"},
            {"two_theta": 47.30, "intensity": 55, "d_spacing": 1.920, "hkl": "220"},
        ]

        result = self.engine.compare_patterns(exp_peaks, ref_peaks)

        assert result.matched_peaks == 2
        assert result.match_score > 0.5
        assert result.rmse_2theta > 0

    def test_no_match(self):
        """Test comparison with completely different patterns."""
        exp_peaks = [
            {"two_theta": 10.0, "intensity": 100},
            {"two_theta": 20.0, "intensity": 50},
        ]
        ref_peaks = [
            {"two_theta": 80.0, "intensity": 100, "d_spacing": 1.0, "hkl": "999"},
        ]

        result = self.engine.compare_patterns(exp_peaks, ref_peaks)

        assert result.matched_peaks == 0
        assert result.match_score == 0.0
        assert result.confidence == "Very Low"

    def test_empty_patterns(self):
        """Test comparison with empty patterns."""
        result = self.engine.compare_patterns([], [])
        assert result.match_score == 0.0
        assert result.matched_peaks == 0

    def test_partial_match(self):
        """Test comparison where only some peaks match."""
        exp_peaks = [
            {"two_theta": 28.44, "intensity": 100},
            {"two_theta": 35.0, "intensity": 50},  # Extra peak
            {"two_theta": 47.30, "intensity": 30},
        ]
        ref_peaks = [
            {"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"},
            {"two_theta": 47.30, "intensity": 55, "d_spacing": 1.920, "hkl": "220"},
            {"two_theta": 56.12, "intensity": 30, "d_spacing": 1.637, "hkl": "311"},
        ]

        result = self.engine.compare_patterns(exp_peaks, ref_peaks)

        assert result.matched_peaks == 2
        assert result.total_reference_peaks == 3
        assert 0 < result.peak_fraction < 1.0

    def test_confidence_levels(self):
        """Test confidence assignment at different score levels."""
        # High confidence
        assert self.engine._assign_confidence(SimilarityResult(
            match_score=0.85, matched_peaks=5
        )) == "High"

        # Medium confidence
        assert self.engine._assign_confidence(SimilarityResult(
            match_score=0.65, matched_peaks=3
        )) == "Medium"

        # Low confidence
        assert self.engine._assign_confidence(SimilarityResult(
            match_score=0.45, matched_peaks=2
        )) == "Low"

        # Very Low confidence
        assert self.engine._assign_confidence(SimilarityResult(
            match_score=0.2, matched_peaks=1
        )) == "Very Low"

    def test_combined_score_weights(self):
        """Test that combined score properly weights components."""
        result = SimilarityResult(
            fom=1.0,
            peak_fraction=0.8,
            cosine_similarity=0.9,
        )
        score = self.engine._combined_score(result)
        assert 0.0 <= score <= 1.0

    def test_correspondences_stored(self):
        """Test that peak correspondences are stored in result."""
        exp_peaks = [{"two_theta": 28.44, "intensity": 100}]
        ref_peaks = [{"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"}]

        result = self.engine.compare_patterns(exp_peaks, ref_peaks)

        assert len(result.correspondences) == 1
        assert result.correspondences[0]["experimental_2theta"] == 28.44
        assert result.correspondences[0]["reference_2theta"] == 28.44
