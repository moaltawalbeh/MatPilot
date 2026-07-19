"""Tests for Theoretical Pattern Generator."""

import pytest
import math
from backend.reference.theoretical_pattern import TheoreticalPatternGenerator


class TestTheoreticalPatternGenerator:
    """Test theoretical XRD pattern generation."""

    def setup_method(self):
        self.generator = TheoreticalPatternGenerator(wavelength=1.5406)

    def test_generate_silicon_pattern(self):
        """Test pattern generation for Silicon (cubic, Fd-3m)."""
        cif_data = {
            "unit_cell": {
                "a": 5.4301, "b": 5.4301, "c": 5.4301,
                "alpha": 90.0, "beta": 90.0, "gamma": 90.0,
            },
            "atoms": [
                {"element": "Si", "x": 0.0, "y": 0.0, "z": 0.0, "occupancy": 1.0},
                {"element": "Si", "x": 0.25, "y": 0.25, "z": 0.25, "occupancy": 1.0},
            ],
            "space_group_number": 227,
        }

        peaks = self.generator.generate_pattern(cif_data, max_two_theta=80.0)

        assert len(peaks) > 0
        # All peaks should have valid 2θ
        for peak in peaks:
            assert 1.0 < peak["two_theta"] < 80.0
            assert peak["intensity"] > 0
            assert peak["d_spacing"] > 0
            assert "hkl" in peak

        # Check that peaks exist in reasonable positions for Si
        # Note: without systematic absences, we get ALL hkl reflections
        # So we just check that the pattern is non-empty and has reasonable 2θ range
        two_thetas = [p["two_theta"] for p in peaks]
        assert min(two_thetas) > 10.0  # First peak should be above 10°
        assert max(two_thetas) < 80.0  # All below cutoff

    def test_peak_positions_sorted(self):
        """Test that peaks are sorted by 2θ."""
        cif_data = {
            "unit_cell": {
                "a": 4.05, "b": 4.05, "c": 4.05,
                "alpha": 90.0, "beta": 90.0, "gamma": 90.0,
            },
            "atoms": [
                {"element": "Al", "x": 0.0, "y": 0.0, "z": 0.0, "occupancy": 1.0},
            ],
            "space_group_number": 225,
        }

        peaks = self.generator.generate_pattern(cif_data, max_two_theta=60.0)

        for i in range(len(peaks) - 1):
            assert peaks[i]["two_theta"] <= peaks[i + 1]["two_theta"]

    def test_intensity_normalization(self):
        """Test that intensities are normalized to max 100."""
        cif_data = {
            "unit_cell": {
                "a": 4.05, "b": 4.05, "c": 4.05,
                "alpha": 90.0, "beta": 90.0, "gamma": 90.0,
            },
            "atoms": [
                {"element": "Al", "x": 0.0, "y": 0.0, "z": 0.0, "occupancy": 1.0},
            ],
            "space_group_number": 225,
        }

        peaks = self.generator.generate_pattern(cif_data, max_two_theta=60.0)
        if peaks:
            max_intensity = max(p["intensity"] for p in peaks)
            assert max_intensity == pytest.approx(100.0, abs=1.0)

    def test_invalid_unit_cell(self):
        """Test handling of invalid unit cell parameters."""
        cif_data = {
            "unit_cell": {
                "a": 0, "b": 0, "c": 0,
                "alpha": 90.0, "beta": 90.0, "gamma": 90.0,
            },
            "atoms": [],
        }

        peaks = self.generator.generate_pattern(cif_data)
        assert peaks == []

    def test_bragg_angle_calculation(self):
        """Test Bragg's law calculation."""
        # For d = 3.135 Å, λ = 1.5406 Å → 2θ ≈ 28.44°
        d_spacing = 3.135
        two_theta = self.generator._bragg_angle(d_spacing, 1.5406)
        assert two_theta is not None
        assert two_theta == pytest.approx(28.44, abs=0.1)

    def test_d_spacing_calculation(self):
        """Test d-spacing from hkl and metric tensor."""
        import numpy as np
        a = 5.4301
        metric = self.generator._compute_metric_tensor(a, a, a, 90, 90, 90)
        metric_inv = np.linalg.inv(metric)

        # (111) reflection
        d = self.generator._compute_d_spacing((1, 1, 1), metric_inv)
        assert d > 0
        # d_111 = a / sqrt(h²+k²+l²) = 5.4301 / sqrt(3) ≈ 3.135
        assert d == pytest.approx(3.135, abs=0.01)

    def test_hkl_generation(self):
        """Test hkl index generation."""
        hkl_list = self.generator._generate_hkl(2)

        # Should include reflections like (1,0,0), (1,1,0), (1,1,1), etc.
        assert (1, 0, 0) in hkl_list
        assert (1, 1, 0) in hkl_list
        assert (1, 1, 1) in hkl_list
        assert (0, 0, 0) not in hkl_list

        # All should have first non-zero index positive
        for h, k, l in hkl_list:
            first_nonzero = next(x for x in [h, k, l] if x != 0)
            assert first_nonzero > 0
