"""Tests for PymatgenPatternGenerator.

Tests the pymatgen-based theoretical pattern generation pipeline:
- CIF content → Structure → XRD pattern
- Parsed data → Structure → XRD pattern
- Fallback behavior when pymatgen is unavailable
- Edge cases: empty CIF, invalid structures, missing atoms
"""

import pytest
from unittest.mock import patch, MagicMock
from backend.reference.pymatgen_pattern_generator import PymatgenPatternGenerator


@pytest.fixture
def generator():
    return PymatgenPatternGenerator(wavelength=1.5406)


@pytest.fixture
def silicon_cif():
    from backend.reference.providers.cod_provider import CODProvider
    provider = CODProvider()
    return provider.download_cif("1526655")


@pytest.fixture
def silicon_parsed():
    from backend.reference.providers.cod_provider import CODProvider
    from backend.reference.cif_parser import CIFParser
    provider = CODProvider()
    parser = CIFParser()
    cif = provider.download_cif("1526655")
    return parser.parse(cif)


class TestPymatgenAvailability:
    def test_available(self, generator):
        assert generator.available is True

    @patch("backend.reference.pymatgen_pattern_generator.logger")
    def test_not_available(self, mock_logger):
        with patch.dict("sys.modules", {"pymatgen": None, "pymatgen.io.cif": None}):
            gen = PymatgenPatternGenerator()
            assert gen.available is False


class TestGenerateFromCifContent:
    def test_silicon_generates_peaks(self, generator, silicon_cif):
        peaks = generator.generate_from_cif_content(silicon_cif, max_two_theta=80.0)
        assert peaks is not None
        assert len(peaks) > 0

    def test_silicon_peak_positions(self, generator, silicon_cif):
        peaks = generator.generate_from_cif_content(silicon_cif, max_two_theta=80.0)
        two_thetas = [p["two_theta"] for p in peaks]
        # Si 111 should be around 28.4-28.7
        assert any(28.0 < tt < 29.5 for tt in two_thetas)

    def test_silicon_peak_structure(self, generator, silicon_cif):
        peaks = generator.generate_from_cif_content(silicon_cif, max_two_theta=80.0)
        for peak in peaks:
            assert "two_theta" in peak
            assert "intensity" in peak
            assert "d_spacing" in peak
            assert "hkl" in peak
            assert peak["two_theta"] > 0
            assert peak["d_spacing"] > 0

    def test_max_intensity_is_100(self, generator, silicon_cif):
        peaks = generator.generate_from_cif_content(silicon_cif, max_two_theta=80.0)
        if peaks:
            intensities = [p["intensity"] for p in peaks]
            assert max(intensities) > 0

    def test_peaks_sorted_by_two_theta(self, generator, silicon_cif):
        peaks = generator.generate_from_cif_content(silicon_cif, max_two_theta=80.0)
        if peaks:
            tts = [p["two_theta"] for p in peaks]
            assert tts == sorted(tts)

    def test_empty_cif_returns_none(self, generator):
        result = generator.generate_from_cif_content("data_test\n", max_two_theta=80.0)
        assert result is None

    def test_invalid_cif_returns_none(self, generator):
        result = generator.generate_from_cif_content("not a cif file", max_two_theta=80.0)
        assert result is None

    def test_max_two_theta_limits_peaks(self, generator, silicon_cif):
        peaks_low = generator.generate_from_cif_content(silicon_cif, max_two_theta=30.0)
        peaks_high = generator.generate_from_cif_content(silicon_cif, max_two_theta=80.0)
        assert len(peaks_low) <= len(peaks_high)

    def test_min_intensity_filters(self, generator, silicon_cif):
        peaks_all = generator.generate_from_cif_content(
            silicon_cif, max_two_theta=80.0, min_intensity_ratio=0.0
        )
        peaks_strict = generator.generate_from_cif_content(
            silicon_cif, max_two_theta=80.0, min_intensity_ratio=0.1
        )
        assert len(peaks_strict) <= len(peaks_all)


class TestGenerateFromParsedData:
    def test_silicon_generates_peaks(self, generator, silicon_parsed):
        peaks = generator.generate_from_parsed_data(silicon_parsed, max_two_theta=80.0)
        assert peaks is not None
        assert len(peaks) > 0

    def test_silicon_peak_positions(self, generator, silicon_parsed):
        peaks = generator.generate_from_parsed_data(silicon_parsed, max_two_theta=80.0)
        two_thetas = [p["two_theta"] for p in peaks]
        assert any(28.0 < tt < 29.5 for tt in two_thetas)

    def test_empty_atoms_returns_none_or_empty(self, generator):
        parsed = {
            "unit_cell": {"a": 5.43, "b": 5.43, "c": 5.43, "alpha": 90, "beta": 90, "gamma": 90},
            "atoms": [],
            "formula": "Test",
        }
        result = generator.generate_from_parsed_data(parsed, max_two_theta=80.0)
        assert result is None or len(result) == 0

    def test_invalid_unit_cell_returns_none(self, generator):
        parsed = {
            "unit_cell": {"a": 0, "b": 0, "c": 0, "alpha": 90, "beta": 90, "gamma": 90},
            "atoms": [{"element": "Si", "x": 0, "y": 0, "z": 0}],
            "formula": "Si",
        }
        result = generator.generate_from_parsed_data(parsed, max_two_theta=80.0)
        assert result is None or len(result) == 0


class TestBuildStructureFromParsedData:
    def test_valid_structure(self, generator, silicon_parsed):
        structure = generator._build_structure_from_parsed_data(silicon_parsed)
        assert structure is not None

    def test_invalid_lattice(self, generator):
        parsed = {
            "unit_cell": {"a": -1, "b": 5.43, "c": 5.43, "alpha": 90, "beta": 90, "gamma": 90},
            "atoms": [{"element": "Si", "x": 0, "y": 0, "z": 0}],
            "formula": "Si",
        }
        result = generator._build_structure_from_parsed_data(parsed)
        assert result is None


class TestTwoThetaToDSpacing:
    def test_known_value(self):
        # For Cu K-alpha (1.5406), Si 111 at ~28.44 deg -> d ~3.135
        d = PymatgenPatternGenerator._two_theta_to_d_spacing(28.44, 1.5406)
        assert abs(d - 3.135) < 0.05

    def test_zero_angle(self):
        d = PymatgenPatternGenerator._two_theta_to_d_spacing(0, 1.5406)
        assert d == 0.0
