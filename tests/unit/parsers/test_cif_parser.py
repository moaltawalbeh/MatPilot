
import pytest
from backend.parsers.cif_parser import CIFParser


class TestCIFParser:
    @pytest.fixture
    def parser(self):
        return CIFParser()

    @pytest.mark.asyncio
    async def test_can_parse_cif(self, parser):
        assert parser.can_parse("silicon.cif") is True
        assert parser.can_parse("silicon.CIF") is True
        assert parser.can_parse("silicon.xy") is False

    @pytest.mark.asyncio
    async def test_parse_extracts_formula(self, parser):
        cif_data = b"data_silicon\n_cell_length_a 5.4301\n_cell_length_b 5.4301\n_cell_length_c 5.4301\n_chemical_formula_sum Si\n_symmetry_space_group_name_H-M 'Fd-3m'\n"
        exp = await parser.parse(cif_data, "si.cif", {})
        assert exp.name == "si.cif"
        assert exp.metadata["source_format"] == "CIF"
        assert exp.metadata["is_structure_file"] is True
        assert exp.material is not None
        assert exp.material.formula == "Si"
        assert exp.material.space_group == "Fd-3m"

    @pytest.mark.asyncio
    async def test_parse_extracts_lattice_parameters(self, parser):
        cif_data = b"data_test\n_cell_length_a 4.0\n_cell_length_b 5.0\n_cell_length_c 6.0\n_cell_angle_alpha 90.0\n_cell_angle_beta 90.0\n_cell_angle_gamma 120.0\n"
        exp = await parser.parse(cif_data, "test.cif", {})
        assert exp.material is not None
        assert exp.material.lattice_parameters is not None
        assert exp.material.lattice_parameters.a == 4.0
        assert exp.material.lattice_parameters.b == 5.0
        assert exp.material.lattice_parameters.c == 6.0
        assert exp.material.lattice_parameters.gamma == 120.0

    @pytest.mark.asyncio
    async def test_parse_empty_cif(self, parser):
        exp = await parser.parse(b"", "empty.cif", {})
        assert exp.data_points == 0
        assert exp.metadata["source_format"] == "CIF"
