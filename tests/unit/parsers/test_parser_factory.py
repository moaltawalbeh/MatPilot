
import pytest
from backend.parsers.parser_factory import ParserFactory
from backend.parsers.xy_parser import XYParser
from backend.parsers.cif_parser import CIFParser
from backend.parsers.xrdml_parser import XRDMLParser
from backend.parsers.raw_parser import RAWParser


class TestParserFactory:
    @pytest.fixture
    def factory(self):
        f = ParserFactory()
        f.register_parser(XYParser())
        f.register_parser(CIFParser())
        f.register_parser(XRDMLParser())
        f.register_parser(RAWParser())
        return f

    def test_get_parser_for_csv(self, factory):
        parser = factory.get_parser("data.csv")
        assert parser is not None
        assert parser.format_name == "XY"

    def test_get_parser_for_cif(self, factory):
        parser = factory.get_parser("data.cif")
        assert parser is not None
        assert parser.format_name == "CIF"

    def test_get_parser_for_xrdml(self, factory):
        parser = factory.get_parser("data.xrdml")
        assert parser is not None
        assert parser.format_name == "XRDML"

    def test_get_parser_for_raw(self, factory):
        parser = factory.get_parser("data.raw")
        assert parser is not None
        assert parser.format_name == "RAW"

    def test_get_parser_for_txt(self, factory):
        parser = factory.get_parser("data.txt")
        assert parser is not None
        assert parser.format_name == "XY"

    def test_get_parser_for_xy(self, factory):
        parser = factory.get_parser("data.xy")
        assert parser is not None
        assert parser.format_name == "XY"

    def test_get_parser_for_dat(self, factory):
        parser = factory.get_parser("data.dat")
        assert parser is not None
        assert parser.format_name == "XY"

    def test_get_parser_for_unknown_returns_none(self, factory):
        parser = factory.get_parser("data.unknown")
        assert parser is None

    def test_list_supported_formats(self, factory):
        formats = factory.list_supported_formats()
        assert "XY" in formats
        assert "CIF" in formats
        assert "XRDML" in formats
        assert "RAW" in formats

    def test_list_supported_extensions(self, factory):
        exts = factory.list_supported_extensions()
        assert ".xy" in exts
        assert ".csv" in exts
        assert ".cif" in exts
        assert ".xrdml" in exts
        assert ".raw" in exts
