"""Tests for the Phase Identification Engine (one-to-one matching, FOMs, dedupe)."""

import math

import pytest

from backend.domain.value_objects.peak import Peak
from backend.services.phase_identifier import (
    PhaseCandidate,
    calculate_match_score,
    compute_d_spacing,
    compute_figures_of_merit,
    identify_phases,
)


def _peaks(positions, intensity=100.0):
    return [Peak(two_theta=pos, intensity=intensity) for pos in positions]


class TestOneToOneMatching:
    """Peak assignment must be strictly one-to-one."""

    def test_single_exp_peak_cannot_match_two_reference_lines(self):
        # Greedy non-one-to-one matching would let the single experimental
        # peak satisfy both reference lines -> matched == 2 (inflated).
        exp = _peaks([28.46])
        ref = [28.44, 28.50]
        score, matched, correspondences = calculate_match_score(exp, ref, tolerance_deg=0.3)
        assert matched == 1
        assert len(correspondences) == 1

    def test_single_reference_line_cannot_be_consumed_twice(self):
        exp = _peaks([28.40, 28.50])
        ref = [28.44]
        score, matched, correspondences = calculate_match_score(exp, ref, tolerance_deg=0.3)
        assert matched == 1
        assert len(correspondences) == 1

    def test_matched_never_exceeds_smaller_side(self):
        exp = _peaks([28.44, 47.30])
        ref = [28.44, 47.30, 56.12]
        score, matched, correspondences = calculate_match_score(exp, ref, tolerance_deg=0.3)
        assert matched == 2
        assert matched <= min(len(exp), len(ref))

    def test_one_to_one_chooses_best_global_assignment(self):
        # Two experimental peaks within tolerance of both reference peaks;
        # optimal assignment pairs each once without double use.
        exp = _peaks([28.40, 28.50])
        ref = [28.44, 47.30]
        score, matched, correspondences = calculate_match_score(exp, ref, tolerance_deg=0.3)
        assert matched == 1  # only the 28.4x region has a reference line


class TestFiguresOfMerit:
    """F_N and M20 must be actually computed on a synthetic known profile."""

    def test_f_n_definition(self):
        # Smith-Snyder F_N = (1/mean|d2t|) * (N/N_poss)
        exp = _peaks([30.00, 45.00])
        ref = [30.05, 44.98]
        wavelength = 1.5406
        score, matched, correspondences = calculate_match_score(
            exp, ref, tolerance_deg=0.3, wavelength=wavelength
        )
        foms = compute_figures_of_merit(exp, ref, correspondences, wavelength)

        assert matched == 2
        mean_delta = (0.05 + 0.02) / 2.0
        expected = (1.0 / mean_delta) * (2 / 2)
        assert foms["f_n"] == pytest.approx(expected, rel=0.01)
        assert foms["f_n"] > 0
        assert foms["f_n_n_poss"] == 2
        assert foms["rmse_2theta"] > 0

    def test_m20_definition_and_positivity(self):
        # de Wolff M20 = Q20 / (2*epsbar*N20); here Q = 1/d^2 from the
        # experimental/ref 2-theta via Bragg's law.
        exp = _peaks([30.00, 45.00])
        ref = [30.05, 44.98]
        wavelength = 1.5406
        score, matched, correspondences = calculate_match_score(
            exp, ref, tolerance_deg=0.3, wavelength=wavelength
        )
        foms = compute_figures_of_merit(exp, ref, correspondences, wavelength)

        assert foms["m20"] > 0
        assert foms["m20_epsbar"] > 0
        assert foms["m20_n_q"] >= 1

        # Recompute M20 from the returned components to confirm consistency.
        q_n = max(
            1.0 / compute_d_spacing(c["reference_2theta"], wavelength) ** 2
            for c in correspondences[:20]
        )
        expected = q_n / (2.0 * foms["m20_epsbar"] * foms["m20_n_q"])
        assert foms["m20"] == pytest.approx(expected, rel=0.02)

    def test_no_match_returns_zero_foms(self):
        exp = _peaks([10.0])
        ref = [80.0]
        score, matched, correspondences = calculate_match_score(exp, ref, tolerance_deg=0.3)
        foms = compute_figures_of_merit(exp, ref, correspondences)
        assert matched == 0
        assert foms["f_n"] == 0.0
        assert foms["m20"] == 0.0

    def test_figures_of_merit_attached_to_candidates(self):
        exp = _peaks([30.00, 45.00])
        entries = [{
            "material_name": "Test Phase",
            "material_formula": "Si",
            "source_provider": "LocalCOD",
            "source_id": "t1",
            "peaks": [30.05, 44.98],
        }]
        candidates = identify_phases(exp, entries, tolerance_deg=0.3)
        assert len(candidates) == 1
        c = candidates[0]
        assert isinstance(c, PhaseCandidate)
        assert c.fom > 0
        assert c.f_n > 0
        assert c.m20 > 0
        assert c.rmse_2theta > 0


class TestDuplicateRemoval:
    """Duplicate phases must be removed by canonical identity."""

    def _entries(self):
        return [
            {
                "material_name": "Quartz (a)",
                "material_formula": "SiO2",
                "source_provider": "LocalCOD",
                "source_id": "a",
                "peaks": [26.64, 50.14, 59.96],
                "crystal_system": "Trigonal",
                "space_group": "P3221",
            },
            {
                "material_name": "Quartz (b)",
                "material_formula": "Si O2",
                "source_provider": "LocalCOD",
                "source_id": "b",
                "peaks": [26.64, 50.14, 59.96],
                "crystal_system": "Trigonal",
                "space_group": "P 32 2 1",
            },
            {
                "material_name": "Cristobalite",
                "material_formula": "SiO2",
                "source_provider": "LocalCOD",
                "source_id": "c",
                "peaks": [21.98, 36.08, 45.86],
                "crystal_system": "Cubic",
                "space_group": "Fd-3m",
            },
        ]

    def test_duplicates_are_deduplicated(self):
        # Synthetic experiment containing both the quartz and cristobalite lines.
        exp = _peaks([26.64, 50.14, 59.96, 21.98, 36.08, 45.86])
        candidates = identify_phases(
            exp, self._entries(), tolerance_deg=0.3, min_score=0.2
        )
        names = {c.material_name for c in candidates}
        assert len(candidates) == 2
        assert "Cristobalite" in names
        quartz = [c for c in candidates if "Quartz" in c.material_name]
        assert len(quartz) == 1

    def test_highest_scoring_duplicate_is_kept(self):
        exp = _peaks([26.64, 50.14, 59.96, 21.98, 36.08, 45.86])
        candidates = identify_phases(
            exp, self._entries(), tolerance_deg=0.3, min_score=0.2
        )
        quartz = [c for c in candidates if "Quartz" in c.material_name]
        assert len(quartz) == 1
        assert quartz[0].source_id in ("a", "b")
        # Both duplicates match identically; the first-encountered is kept.
        assert quartz[0].matched_peaks == 3
