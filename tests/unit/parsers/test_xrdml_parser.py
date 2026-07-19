
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
        assert parser.can_parse("LaB6_041008.xrdml") is True
        assert parser.can_parse("data.raw") is False
        assert parser.can_parse("data.xy") is False

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
    async def test_parse_with_default_namespace(self, parser):
        """Real PANalytical XRDML files use default namespaces."""
        xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<xrdMeasurements xmlns="http://www.panalytical.com/2007/xrdml">
    <scan>
        <startPosition>20.0</startPosition>
        <stepSize>0.05</stepSize>
        <intensities>500 800 1200 600 300</intensities>
    </scan>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "real_file.xrdml", {})
        assert exp.data_points == 5
        assert exp.two_theta[0] == 20.0
        assert exp.two_theta[4] == 20.2
        assert exp.intensity[2] == 1200.0

    @pytest.mark.asyncio
    async def test_parse_with_prefixed_namespace(self, parser):
        """Some XRDML files use prefixed namespaces like xns:."""
        xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<xns:xrdMeasurements xmlns:xns="http://www.panalytical.com/2007/xrdml">
    <xns:scan>
        <xns:startPosition>15.0</xns:startPosition>
        <xns:stepSize>0.01</xns:stepSize>
        <xns:intensities>100 300 500 400 200 150</xns:intensities>
    </xns:scan>
</xns:xrdMeasurements>
"""
        exp = await parser.parse(xml, "prefixed.xrdml", {})
        assert exp.data_points == 6
        assert exp.two_theta[0] == 15.0
        assert exp.two_theta[5] == 15.05
        assert exp.intensity[2] == 500.0

    @pytest.mark.asyncio
    async def test_parse_with_multiple_namespaces(self, parser):
        """Real files may have multiple namespace declarations."""
        xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<xrdMeasurements xmlns="http://www.panalytical.com/2007/xrdml"
                  xmlns:ns2="http://www.example.com/schema">
    <scan>
        <startPosition>5.0</startPosition>
        <stepSize>0.1</stepSize>
        <intensities>10 20 30 40 50</intensities>
    </scan>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "multi_ns.xrdml", {})
        assert exp.data_points == 5
        assert exp.two_theta[0] == 5.0

    @pytest.mark.asyncio
    async def test_parse_panalytical_realistic(self, parser):
        """Realistic PANalytical XRDML with multiple scans and full metadata."""
        xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<xrdMeasurements xmlns="http://www.panalytical.com/2007/xrdml"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <generator>Unknown software</generator>
    <status>Ok</status>
    <title>LaB6 measurement</title>
    <sample>
        <name>LaB6</name>
    </sample>
    <instrument>
        <name>Empyrean</name>
    </instrument>
    <radiation>
        <name>K_alpha_1_2</name>
    </radiation>
    <wavelength>1.54060</wavelength>
    <scan scanAxis="2Theta">
        <startPosition>10.0000</startPosition>
        <endPosition>80.0000</endPosition>
        <stepSize>0.0200</stepSize>
        <intensities>100 150 200 800 1500 2000 1200 600 300 200
                      180 160 150 170 190 250 300 280 260 240
                      220 210 200 350 600 900 700 400 250 200
                      190 180 175 170 168 165 160 158 155 153
                      150 148 145 143 140 138 136 135 133 130</intensities>
    </scan>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "LaB6_041008.xrdml", {})
        assert exp.data_points == 50
        assert exp.two_theta[0] == 10.0
        assert exp.two_theta[-1] == pytest.approx(10.0 + 49 * 0.02, abs=0.001)
        assert exp.wavelength is not None
        assert abs(exp.wavelength.value_angstrom - 1.5406) < 0.001
        assert exp.metadata["sample_name"] == "LaB6"
        assert exp.metadata["instrument_name"] == "Empyrean"

    @pytest.mark.asyncio
    async def test_parse_with_end_position(self, parser):
        """When stepSize is missing, compute from start/end positions."""
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <scan>
        <startPosition>20.0</startPosition>
        <endPosition>22.0</endPosition>
        <intensities>10 20 30 40 50 60 70 80 90 100 110</intensities>
    </scan>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "test.xrdml", {})
        assert exp.data_points == 11
        assert exp.two_theta[0] == 20.0
        assert exp.two_theta[-1] == 22.0

    @pytest.mark.asyncio
    async def test_parse_with_wavelength_element(self, parser):
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
    async def test_parse_with_kalpha1(self, parser):
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <scan>
        <startPosition>0</startPosition>
        <stepSize>1</stepSize>
        <intensities>1 2</intensities>
    </scan>
    <kAlpha1>1.54056</kAlpha1>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "test.xrdml", {})
        assert exp.wavelength is not None
        assert abs(exp.wavelength.value_angstrom - 1.54056) < 0.001

    @pytest.mark.asyncio
    async def test_parse_per_point_format(self, parser):
        """XRDML files can use per-point dataPoints format."""
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <scan>
        <dataPoints>
            <dataPoint>
                <positions><position axis="2Theta">10.0</position></positions>
                <intensities>100</intensities>
            </dataPoint>
            <dataPoint>
                <positions><position axis="2Theta">10.5</position></positions>
                <intensities>250</intensities>
            </dataPoint>
            <dataPoint>
                <positions><position axis="2Theta">11.0</position></positions>
                <intensities>180</intensities>
            </dataPoint>
        </dataPoints>
    </scan>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "per_point.xrdml", {})
        assert exp.data_points == 3
        assert exp.two_theta == [10.0, 10.5, 11.0]
        assert exp.intensity == [100.0, 250.0, 180.0]

    @pytest.mark.asyncio
    async def test_parse_metadata_extraction(self, parser):
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <generator>PANalytical HighScore</generator>
    <title>Test scan</title>
    <sample><name>Si powder</name></sample>
    <instrument><name>X'Pert MPD</name></instrument>
    <scan>
        <startPosition>0</startPosition>
        <stepSize>1</stepSize>
        <intensities>1</intensities>
    </scan>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "test.xrdml", {})
        assert exp.metadata["sample_name"] == "Si powder"
        assert exp.metadata["instrument_name"] == "X'Pert MPD"
        assert exp.metadata["measurement_title"] == "Test scan"
        assert exp.metadata["generator"] == "PANalytical HighScore"

    @pytest.mark.asyncio
    async def test_parse_invalid_xml_raises(self, parser):
        import xml.etree.ElementTree as ET
        with pytest.raises(ET.ParseError):
            await parser.parse(b"not xml at all", "bad.xrdml", {})

    @pytest.mark.asyncio
    async def test_parse_no_scan_data_raises(self, parser):
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <title>Empty measurement</title>
</xrdMeasurements>
"""
        with pytest.raises(ValueError, match="No diffraction data"):
            await parser.parse(xml, "empty.xrdml", {})

    @pytest.mark.asyncio
    async def test_parse_multiple_scans(self, parser):
        """Some XRDML files contain multiple scans."""
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <scan>
        <startPosition>10.0</startPosition>
        <stepSize>0.1</stepSize>
        <intensities>100 200 300</intensities>
    </scan>
    <scan>
        <startPosition>50.0</startPosition>
        <stepSize>0.1</stepSize>
        <intensities>50 75 100</intensities>
    </scan>
</xrdMeasurements>
"""
        exp = await parser.parse(xml, "multi.xrdml", {})
        assert exp.data_points == 6
        assert exp.two_theta[:3] == [10.0, 10.1, 10.2]
        assert exp.two_theta[3:] == [50.0, 50.1, 50.2]

    @pytest.mark.asyncio
    async def test_parse_preserves_metadata(self, parser):
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <scan>
        <startPosition>0</startPosition>
        <stepSize>1</stepSize>
        <intensities>1</intensities>
    </scan>
</xrdMeasurements>
"""
        user_meta = {"wavelength": 1.5406, "custom_key": "custom_value"}
        exp = await parser.parse(xml, "test.xrdml", user_meta)
        assert exp.metadata["source_format"] == "XRDML"
        assert exp.metadata["wavelength"] == 1.5406
        assert exp.metadata["custom_key"] == "custom_value"

    @pytest.mark.asyncio
    async def test_parse_with_xsi_schema_location(self, parser):
        """Regression: xsi:schemaLocation attribute caused 'unbound prefix' error.

        The old regex approach stripped xmlns:xsi declarations but left behind
        xsi:schemaLocation attributes, creating an unbound prefix. This test
        ensures the parser handles real PANalytical files with schemaLocation.
        """
        xml = b'''<?xml version="1.0" encoding="UTF-8"?>
<xrdMeasurements xmlns="http://www.panalytical.com/2007/xrdml"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.panalytical.com/2007/xrdml http://www.panalytical.com/2007/xrdml.xsd">
  <xrdMeasurement>
    <generator>PANalytical X'Pert Pro</generator>
    <status>Ok</status>
    <title>LaB6_041008</title>
    <sample><name>LaB6</name></sample>
    <instrument><name>Empyrean</name></instrument>
    <wavelength>1.54060</wavelength>
    <scan scanAxis="2Theta">
      <startPosition>10.0000</startPosition>
      <endPosition>120.0000</endPosition>
      <stepSize>0.0200</stepSize>
      <intensities>100.0 150.0 200.0 500.0 1200.0 800.0 300.0 150.0 100.0 80.0</intensities>
    </scan>
  </xrdMeasurement>
</xrdMeasurements>'''
        exp = await parser.parse(xml, "LaB6_041008.xrdml", {})
        assert exp.data_points == 10
        assert exp.two_theta[0] == 10.0
        assert exp.two_theta[1] == 10.02
        assert exp.two_theta[-1] == pytest.approx(10.0 + 9 * 0.02, abs=0.001)
        assert abs(exp.wavelength.value_angstrom - 1.5406) < 0.001
        assert exp.metadata["sample_name"] == "LaB6"
        assert exp.metadata["instrument_name"] == "Empyrean"
        assert exp.metadata["measurement_title"] == "LaB6_041008"
