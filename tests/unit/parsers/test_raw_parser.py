
import pytest
from backend.parsers.raw_parser import RAWParser


class TestRAWParser:
    @pytest.fixture
    def parser(self):
        return RAWParser()

    @pytest.mark.asyncio
    async def test_can_parse_raw(self, parser):
        assert parser.can_parse("data.raw") is True
        assert parser.can_parse("data.RAW") is True
        assert parser.can_parse("data.cif") is False

    @pytest.mark.asyncio
    async def test_parse_returns_experiment(self, parser):
        data = b"\x00\x01\x02\x03" * 50
        exp = await parser.parse(data, "test.raw", {})
        assert exp.name == "test.raw"
        assert exp.metadata["source_format"] == "RAW"
        assert exp.metadata["is_binary"] is True
        assert exp.data_points == 0

    @pytest.mark.asyncio
    async def test_parse_extracts_version(self, parser):
        import struct
        data = struct.pack("<H", 1) + b"\x00" * 200
        exp = await parser.parse(data, "test.raw", {})
        assert exp.metadata.get("raw_version") == 1
