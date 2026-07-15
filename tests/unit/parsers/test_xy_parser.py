
import pytest
from backend.parsers.xy_parser import XYParser


class TestXYParser:
    @pytest.fixture
    def parser(self):
        return XYParser()

    @pytest.mark.asyncio
    async def test_can_parse_xy_extension(self, parser):
        assert parser.can_parse("data.xy") is True
        assert parser.can_parse("data.XY") is True

    @pytest.mark.asyncio
    async def test_can_parse_csv_extension(self, parser):
        assert parser.can_parse("data.csv") is True
        assert parser.can_parse("data.CSV") is True

    @pytest.mark.asyncio
    async def test_can_parse_txt_extension(self, parser):
        assert parser.can_parse("data.txt") is True

    @pytest.mark.asyncio
    async def test_can_parse_dat_extension(self, parser):
        assert parser.can_parse("data.dat") is True

    @pytest.mark.asyncio
    async def test_cannot_parse_xrdml(self, parser):
        assert parser.can_parse("data.xrdml") is False

    @pytest.mark.asyncio
    async def test_parse_space_delimited(self, parser):
        data = b"10.0 100.0\n20.0 200.0\n30.0 150.0\n"
        exp = await parser.parse(data, "test.xy", {})
        assert exp.name == "test.xy"
        assert exp.data_points == 3
        assert exp.two_theta == [10.0, 20.0, 30.0]
        assert exp.intensity == [100.0, 200.0, 150.0]

    @pytest.mark.asyncio
    async def test_parse_comma_delimited(self, parser):
        data = b"10.0,100.0\n20.0,200.0\n"
        exp = await parser.parse(data, "test.csv", {})
        assert exp.data_points == 2
        assert exp.two_theta == [10.0, 20.0]

    @pytest.mark.asyncio
    async def test_parse_tab_delimited(self, parser):
        data = b"10.0\t100.0\n20.0\t200.0\n"
        exp = await parser.parse(data, "test.dat", {})
        assert exp.data_points == 2

    @pytest.mark.asyncio
    async def test_parse_skips_comments(self, parser):
        data = b"# This is a comment\n; another comment\n10.0 100.0\n20.0 200.0\n"
        exp = await parser.parse(data, "test.txt", {})
        assert exp.data_points == 2
        assert exp.metadata["header_lines_skipped"] == 2

    @pytest.mark.asyncio
    async def test_parse_empty_file(self, parser):
        data = b""
        exp = await parser.parse(data, "test.xy", {})
        assert exp.data_points == 0

    @pytest.mark.asyncio
    async def test_wavelength_from_metadata(self, parser):
        data = b"10.0 100.0\n"
        exp = await parser.parse(data, "test.xy", {"wavelength": 1.5406})
        assert exp.wavelength is not None
        assert abs(exp.wavelength.value_angstrom - 1.5406) < 0.001

    @pytest.mark.asyncio
    async def test_wavelength_from_radiation(self, parser):
        data = b"10.0 100.0\n"
        exp = await parser.parse(data, "test.xy", {"radiation": "Cu K\u03b11"})
        assert exp.wavelength is not None
        assert abs(exp.wavelength.value_angstrom - 1.540598) < 0.001
