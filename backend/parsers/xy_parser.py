import os

import re
from typing import Dict, Any, List, Tuple

from backend.parsers.parser_interface import IParser
from backend.domain.entities.xrd_experiment import XRDExperiment
from backend.domain.value_objects.wavelength import Wavelength, RadiationType


class XYParser(IParser):
    """
    Parser for XY text files.

    Supports:
    - Space-delimited:   "10.0 100.0"
    - Tab-delimited:     "10.0\t100.0"
    - Comma-delimited:   "10.0,100.0"
    - Semicolon:         "10.0;100.0"
    - Mixed delimiters
    - Comments starting with # or ;
    - Header lines (skipped automatically)
    """

    @property
    def format_name(self) -> str:
        return "XY"

    @property
    def supported_extensions(self) -> list[str]:
        return [".xy", ".txt", ".dat", ".csv"]

    @property
    def mime_types(self) -> list[str]:
        return ["text/plain", "text/csv", "text/xy", "application/octet-stream"]

    def can_parse(self, filename: str) -> bool:
        ext = os.path.splitext(filename.lower())[1]
        return ext in self.supported_extensions

    async def parse(
        self,
        data: bytes,
        filename: str,
        metadata: Dict[str, Any]
    ) -> XRDExperiment:
        text = data.decode("utf-8", errors="ignore")
        lines = text.splitlines()

        two_theta: List[float] = []
        intensity: List[float] = []
        header_lines = 0

        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Skip comments
            if line.startswith("#") or line.startswith(";") or line.startswith("//"):
                header_lines += 1
                continue
            # Skip non-numeric header lines
            first_char = line[0]
            if not (first_char.isdigit() or first_char in "-.+"):
                header_lines += 1
                continue

            # Split by any whitespace, comma, semicolon, or tab
            parts = re.split(r"[\t,;\s]+", line)
            parts = [p for p in parts if p]

            if len(parts) >= 2:
                try:
                    t2 = float(parts[0])
                    intens = float(parts[1])
                    two_theta.append(t2)
                    intensity.append(intens)
                except ValueError:
                    continue

        # Detect wavelength from metadata
        wavelength = self._detect_wavelength(metadata)

        return XRDExperiment(
            name=filename,
            two_theta=two_theta,
            intensity=intensity,
            wavelength=wavelength,
            metadata={
                "source_format": self.format_name,
                "header_lines_skipped": header_lines,
                **metadata
            }
        )

    def _detect_wavelength(self, metadata: Dict[str, Any]) -> Wavelength:
        """Try to detect wavelength from user metadata."""
        if "wavelength" in metadata:
            try:
                return Wavelength(value_angstrom=float(metadata["wavelength"]))
            except (ValueError, TypeError):
                pass
        if "radiation" in metadata:
            try:
                rad_type = RadiationType(metadata["radiation"])
                return Wavelength.from_radiation_type(rad_type)
            except (ValueError, KeyError):
                pass
        return Wavelength.from_radiation_type(RadiationType.Cu_K_ALPHA_AVG)
