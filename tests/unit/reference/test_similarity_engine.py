"""Tests for Similarity Engine."""

import pytest
from backend.reference.similarity_engine import (
    SimilarityEngine,
    SimilarityResult,
    canonical_formula,
    dedupe_phases,
    reference_quality_prior,
)


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
        # FOM is the Smith-Snyder F_N (higher is better); a perfect match is huge.
        assert result.fom > 10
        assert result.f_n > 10
        assert result.m20 > 10

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

    def test_matching_is_one_to_one_single_exp_peak(self):
        """A single experimental peak must not satisfy two reference lines."""
        exp_peaks = [{"two_theta": 28.46, "intensity": 100}]
        ref_peaks = [
            {"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"},
            {"two_theta": 28.50, "intensity": 60, "d_spacing": 3.130, "hkl": "220"},
        ]

        result = self.engine.compare_patterns(exp_peaks, ref_peaks)

        assert result.matched_peaks == 1
        assert len(result.correspondences) == 1
        assert result.n_missing_ref == 1

    def test_matching_is_one_to_one_single_ref_peak(self):
        """A single reference line must not be consumed by two experimental peaks."""
        exp_peaks = [
            {"two_theta": 28.40, "intensity": 80},
            {"two_theta": 28.50, "intensity": 100},
        ]
        ref_peaks = [{"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"}]

        result = self.engine.compare_patterns(exp_peaks, ref_peaks)

        assert result.matched_peaks == 1
        assert result.n_unexplained_exp == 1

    def test_matching_not_limited_by_smaller_side(self):
        """Hungarian on a rectangular matrix must respect one-to-one bounds."""
        exp_peaks = [{"two_theta": 28.44, "intensity": 100}]
        ref_peaks = [
            {"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"},
            {"two_theta": 47.30, "intensity": 55, "d_spacing": 1.920, "hkl": "220"},
        ]
        result = self.engine.compare_patterns(exp_peaks, ref_peaks)
        assert result.matched_peaks == 1

    def test_f_n_matches_definition(self):
        """Smith-Snyder F_N = (1/mean|d2t|) * (N/N_poss)."""
        exp_peaks = [
            {"two_theta": 30.00, "intensity": 100},
            {"two_theta": 45.00, "intensity": 50},
        ]
        ref_peaks = [
            {"two_theta": 30.05, "intensity": 100, "d_spacing": 2.975, "hkl": "200"},
            {"two_theta": 44.98, "intensity": 50, "d_spacing": 2.014, "hkl": "220"},
        ]
        result = self.engine.compare_patterns(exp_peaks, ref_peaks)

        assert result.matched_peaks == 2
        mean_delta = (0.05 + 0.02) / 2.0  # deviations 0.05 and 0.02
        expected_f_n = (1.0 / mean_delta) * (2 / 2)
        assert result.f_n == pytest.approx(expected_f_n, rel=0.01)
        assert result.f_n_mean_delta == pytest.approx(0.035, abs=0.001)
        assert result.f_n_n_poss == 2

    def test_counter_evidence_reported(self):
        """Unexplained experimental and missing reference peaks are reported."""
        exp_peaks = [
            {"two_theta": 28.44, "intensity": 100},
            {"two_theta": 35.00, "intensity": 50},
        ]
        ref_peaks = [
            {"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"},
            {"two_theta": 47.30, "intensity": 55, "d_spacing": 1.920, "hkl": "220"},
        ]
        result = self.engine.compare_patterns(exp_peaks, ref_peaks)
        assert result.n_unexplained_exp == 1
        assert result.n_missing_ref == 1


class TestPhaseIdentity:
    """Tests for duplicate-phase identity helpers."""

    def test_canonical_formula_normalizes(self):
        assert canonical_formula("SiO2") == canonical_formula("O2Si")
        assert canonical_formula("Si O2") == "O2Si"
        assert canonical_formula("NaCl") == "ClNa"

    def test_reference_quality_priors(self):
        assert reference_quality_prior("*") == 1.0
        assert reference_quality_prior("G") == 0.85
        assert reference_quality_prior("I") == 0.6
        assert reference_quality_prior("B") == 0.4
        assert reference_quality_prior("H") == 0.2
        assert reference_quality_prior("") == 0.5
        assert reference_quality_prior("unknown-mark") == 0.5

    def test_dedupe_keeps_best_representative(self):
        low = SimilarityResult(
            material_name="Quartz (COD 1)", material_formula="SiO2",
            crystal_system="Trigonal", space_group="P3221", match_score=0.60,
        )
        high = SimilarityResult(
            material_name="Quartz (COD 2)", material_formula="O2Si",
            crystal_system="Trigonal", space_group="P 32 2 1", match_score=0.95,
        )
        other = SimilarityResult(
            material_name="Cristobalite", material_formula="SiO2",
            crystal_system="Cubic", space_group="Fd-3m", match_score=0.70,
        )
        deduped = dedupe_phases([low, high, other])
        assert len(deduped) == 2
        names = {r.material_name for r in deduped}
        assert "Quartz (COD 2)" in names
        assert "Quartz (COD 1)" not in names
        assert "Cristobalite" in names

    def test_quality_prior_reweights_score(self):
        engine = SimilarityEngine(tolerance_deg=0.3)
        exp_peaks = [{"two_theta": 28.44, "intensity": 100}]
        ref_peaks = [{"two_theta": 28.44, "intensity": 100, "d_spacing": 3.135, "hkl": "111"}]
        marked = engine.compare_patterns(exp_peaks, ref_peaks, quality_mark="*")
        unmarked = engine.compare_patterns(exp_peaks, ref_peaks)
        assert marked.quality_mark == "*"
        assert marked.quality_prior == 1.0
        # star quality should not lower a perfect match
        assert marked.match_score <= unmarked.match_score + 1e-9
        assert unmarked.raw_match_score == unmarked.match_score
        assert marked.raw_match_score > 0
