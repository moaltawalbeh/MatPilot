
import struct
from typing import Dict, Any, List

from backend.parsers.parser_interface import IParser
from backend.domain.entities.xrd_experiment import XRDExperiment
from backend.domain.value_objects.wavelength import Wavelength, RadiationType


class RAWParser(IParser):
    """
    Parser for Bruker RAW files.

    Bruker RAW is a proprietary binary format.
    This parser reads the file header to extract metadata
    and returns an XRDExperiment with empty pattern arrays.

    Full binary pattern extraction requires reverse-engineering
    the Bruker format specification.
    """

    @property
    def format_name(self) -> str:
        return "RAW"

    @property
    def supported_extensions(self) -> list[str]:
        return [".raw"]

    @property
    def mime_types(self) -> list[str]:
        return ["application/octet-stream"]

    def can_parse(self, filename: str) -> bool:
        return filename.lower().endswith(".raw")

    async def parse(
        self,
        data: bytes,
        filename: str,
        metadata: Dict[str, Any]
    ) -> XRDExperiment:
        # Extract whatever metadata we can from the binary header
        extracted = self._extract_header_metadata(data)

        return XRDExperiment(
            name=filename,
            two_theta=[],
            intensity=[],
            wavelength=extracted.get("wavelength") or Wavelength.from_radiation_type(RadiationType.Cu_K_ALPHA_AVG),
            metadata={
                "source_format": self.format_name,
                "is_binary": True,
                "file_size": len(data),
                **extracted.get("meta", {}),
                **metadata
            }
        )

    def _extract_header_metadata(self, data: bytes) -> Dict[str, Any]:
        """Attempt to extract metadata from Bruker RAW header."""
        result: Dict[str, Any] = {"meta": {}}
        if len(data) < 100:
            return result

        # Bruker RAW v1/v3 header starts with magic bytes
        # This is a best-effort extraction
        try:
            # File version (offset 0)
            version = struct.unpack("<H", data[0:2])[0]
            result["meta"]["raw_version"] = version

            # Sample title often starts around offset 12 or 80 depending on version
            # Try to read ASCII strings from header region
            header_region = data[:512]
            strings = []
            current = bytearray()
            for b in header_region:
                if 32 <= b < 127:
                    current.append(b)
                else:
                    if len(current) > 3:
                        strings.append(bytes(current).decode("ascii", errors="ignore"))
                    current = bytearray()
            if strings:
                result["meta"]["header_strings"] = strings[:5]
        except Exception:
            pass

        return result
