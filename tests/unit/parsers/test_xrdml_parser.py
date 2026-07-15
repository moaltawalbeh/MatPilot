
import pytest
from backend.parsers.xrdml_parser import XRDMLParser


class TestXRDMLParser:
    @pytest.fixture
    def parser(self):
        return XRDMLParser()

    @pytest.mark.asyncio
    async def test_can_parse_xrdml(self, parser):
        assert parser.can_parse("data.xrdml") is True
        assert parser.can_parse("data.XRDML") is True
        assert parser.can_parse("data.raw") is False

    @pytest.mark.asyncio
    async def test_parse_minimal_xrdml(self, parser):
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <scan scanAxis="2Theta">
        <startPosition>10.0</startPosition>
        <stepSize>0.02</stepSize>
        <intensities>100 200 150 300</intensities>
    </scan>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "test.xrdml", {})
        assert exp.name == "test.xrdml"
        assert exp.metadata["source_format"] == "XRDML"
        assert exp.data_points == 4
        assert exp.two_theta == [10.0, 10.02, 10.04, 10.06]
        assert exp.intensity == [100.0, 200.0, 150.0, 300.0]

    @pytest.mark.asyncio
    async def test_parse_with_wavelength(self, parser):
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <scan>
        <startPosition>0</startPosition>
        <stepSize>1</stepSize>
        <intensities>1 2</intensities>
    </scan>
    <wavelength>1.5406</wavelength>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "test.xrdml", {})
        assert exp.wavelength is not None
        assert abs(exp.wavelength.value_angstrom - 1.5406) < 0.001

    @pytest.mark.asyncio
    async def test_parse_invalid_xml_raises(self, parser):
        with pytest.raises(ValueError):
            await parser.parse(b"not xml", "bad.xrdml", {})
