
from typing import List, Optional

from backend.parsers.parser_interface import IParser


class ParserFactory:
    """
    Factory for creating appropriate parser instances.

    Design: Factory + Registry patterns.
    Parsers are registered at application startup.
    """

    def __init__(self):
        self._parsers: List[IParser] = []

    def register_parser(self, parser: IParser) -> None:
        """Register a parser for use."""
        self._parsers.append(parser)

    def get_parser(self, filename: str) -> Optional[IParser]:
        """
        Get the appropriate parser for a filename.

        Returns None if no parser can handle the file.
        """
        for parser in self._parsers:
            if parser.can_parse(filename):
                return parser
        return None

    def get_parser_by_format(self, format_name: str) -> Optional[IParser]:
        """Get parser by format name."""
        for parser in self._parsers:
            if parser.format_name.lower() == format_name.lower():
                return parser
        return None

    def list_supported_formats(self) -> List[str]:
        """List all supported format names."""
        return [p.format_name for p in self._parsers]

    def list_supported_extensions(self) -> List[str]:
        """List all supported file extensions."""
        extensions = []
        for parser in self._parsers:
            extensions.extend(parser.supported_extensions)
        return extensions
