"""Tests for CIF Parser."""

import pytest
from backend.reference.cif_parser import CIFParser


class TestCIFParser:
    """Test CIF file parsing."""

    def setup_method(self):
        self.parser = CIFParser()

    def test_parse_basic_cif(self):
        """Test parsing a basic CIF with unit cell and atoms."""
        cif = """
data_test
_cell_length_a    5.4301
_cell_length_b    5.4301
_cell_length_c    5.4301
_cell_angle_alpha 90.0
_cell_angle_beta  90.0
_cell_angle_gamma 90.0
_symmetry_space_group_name_H-M 'F d -3 m'
_symmetry_space_group_number    227

loop_
_atom_site_label
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
Si1  0.00000  0.00000  0.00000
Si2  0.25000  0.25000  0.25000
"""
        result = self.parser.parse(cif)

        assert result["unit_cell"]["a"] == pytest.approx(5.4301, abs=0.001)
        assert result["unit_cell"]["b"] == pytest.approx(5.4301, abs=0.001)
        assert result["unit_cell"]["c"] == pytest.approx(5.4301, abs=0.001)
        assert result["unit_cell"]["alpha"] == pytest.approx(90.0)
        assert result["space_group"] == "F d -3 m"
        assert result["space_group_number"] == 227
        assert result["crystal_system"] == "Cubic"
        assert len(result["atoms"]) == 2
        assert result["atoms"][0]["element"] == "Si"
        assert result["atoms"][0]["x"] == pytest.approx(0.0)

    def test_parse_formula_from_atoms(self):
        """Test formula generation from atom list."""
        cif = """
data_test
_cell_length_a    4.759
_cell_length_b    4.759
_cell_length_c    12.991
_cell_angle_alpha 90.0
_cell_angle_beta  90.0
_cell_angle_gamma 120.0
_space_group_name_H-M_alt 'R -3 c'
_space_group.IT_number     167

loop_
_atom_site_label
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
Al1  0.00000  0.00000  0.35530
O1   0.30580  0.00000  0.25000
"""
        result = self.parser.parse(cif)

        assert result["formula"] == "AlO"
        assert result["crystal_system"] == "Trigonal"

    def test_parse_uncertain_numbers(self):
        """Test parsing CIF numbers with uncertainty notation."""
        cif = """
data_test
_cell_length_a    5.430(2)
_cell_length_b    5.4301(3)
_cell_length_c    5.43
"""
        result = self.parser.parse(cif)

        assert result["unit_cell"]["a"] == pytest.approx(5.430, abs=0.001)
        assert result["unit_cell"]["b"] == pytest.approx(5.4301, abs=0.0001)
        assert result["unit_cell"]["c"] == pytest.approx(5.43, abs=0.001)

    def test_empty_cif(self):
        """Test parsing empty CIF."""
        result = self.parser.parse("")
        assert result["unit_cell"]["a"] == 0.0
        assert result["atoms"] == []

    def test_crystal_system_determination(self):
        """Test crystal system from space group number."""
        assert self.parser._determine_crystal_system(227, "F d -3 m") == "Cubic"
        assert self.parser._determine_crystal_system(167, "R -3 c") == "Trigonal"
        assert self.parser._determine_crystal_system(194, "P 63/m m c") == "Hexagonal"
        assert self.parser._determine_crystal_system(136, "P 42/m n m") == "Tetragonal"
        assert self.parser._determine_crystal_system(62, "P n m a") == "Orthorhombic"
        assert self.parser._determine_crystal_system(14, "C 2/c") == "Monoclinic"
        assert self.parser._determine_crystal_system(2, "P -1") == "Triclinic"

    def test_parse_reflections(self):
        """Test parsing reflection data."""
        cif = """
data_test
_cell_length_a  5.4301

loop_
_refln_index_h
_refln_index_k
_refln_index_l
_refln_F_squared_meas
1  1  1  100.5
2  2  0   55.2
3  1  1   30.1
"""
        result = self.parser.parse(cif)
        assert len(result["reflections"]) == 3
        assert result["reflections"][0]["h"] == 1
        assert result["reflections"][0]["f_squared_meas"] == pytest.approx(100.5)
