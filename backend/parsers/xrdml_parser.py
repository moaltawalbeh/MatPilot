
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Tuple

from backend.parsers.parser_interface import IParser
from backend.domain.entities.xrd_experiment import XRDExperiment
from backend.domain.value_objects.wavelength import Wavelength, RadiationType


class XRDMLParser(IParser):
    """
    Parser for PANalytical XRDML files.

    XRDML is an XML-based format containing:
    - 2θ scan range and step size
    - Intensity counts array
    - Wavelength / radiation type
    - Sample and instrument metadata
    """

    @property
    def format_name(self) -> str:
        return "XRDML"

    @property
    def supported_extensions(self) -> list[str]:
        return [".xrdml"]

    @property
    def mime_types(self) -> list[str]:
        return ["application/xml", "text/xml", "application/octet-stream"]

    def can_parse(self, filename: str) -> bool:
        return filename.lower().endswith(".xrdml")

    async def parse(
        self,
        data: bytes,
        filename: str,
        metadata: Dict[str, Any]
    ) -> XRDExperiment:
        text = data.decode("utf-8", errors="ignore")

        # XRDML uses namespaces; ET with namespaces is tricky, so we strip them
        text = self._strip_namespaces(text)

        try:
            root = ET.fromstring(text)
        except ET.ParseError as exc:
            raise ValueError(f"Invalid XRDML XML: {exc}") from exc

        # Extract 2θ and intensity arrays
        two_theta, intensity = self._extract_scan_data(root)

        # Extract wavelength
        wavelength = self._extract_wavelength(root)

        # Extract metadata
        xrd_metadata = self._extract_metadata(root)

        return XRDExperiment(
            name=filename,
            two_theta=two_theta,
            intensity=intensity,
            wavelength=wavelength,
            metadata={
                "source_format": self.format_name,
                **xrd_metadata,
                **metadata
            }
        )

    def _strip_namespaces(self, xml_text: str) -> str:
        """Remove XML namespaces for easier parsing."""
        import re
        return re.sub(r'\sxmlns[^"]*"[^"]*"', '', xml_text)

    def _extract_scan_data(self, root: ET.Element) -> Tuple[List[float], List[float]]:
        """Extract 2θ and intensity arrays from scan points."""
        two_theta: List[float] = []
        intensity: List[float] = []

        # Try multiple possible XRDML structures
        for scan in root.iter("scan"):
            # Find starting 2θ and step
            start = 0.0
            step = 0.0
            for pos in scan.iter("startPosition"):
                try:
                    start = float(pos.text or 0)
                    break
                except (ValueError, TypeError):
                    pass
            for step_el in scan.iter("stepSize"):
                try:
                    step = float(step_el.text or 0)
                    break
                except (ValueError, TypeError):
                    pass

            # Intensity data
            for data in scan.iter("intensities"):
                counts = data.text
                if counts:
                    vals = counts.strip().split()
                    for i, v in enumerate(vals):
                        try:
                            intensity.append(float(v))
                            two_theta.append(start + i * step)
                        except ValueError:
                            pass

            # Alternative: dataPoints with explicit positions
            for dp in scan.iter("dataPoint"):
                pos_el = dp.find("positions")
                if pos_el is not None:
                    for pos in pos_el.iter("position"):
                        if pos.get("axis") == "2Theta":
                            try:
                                two_theta.append(float(pos.text or 0))
                            except (ValueError, TypeError):
                                pass
                counts_el = dp.find("intensities")
                if counts_el is not None and counts_el.text:
                    try:
                        intensity.append(float(counts_el.text))
                    except (ValueError, TypeError):
                        pass

        return two_theta, intensity

    def _extract_wavelength(self, root: ET.Element) -> Wavelength:
        """Extract wavelength from XRDML."""
        for wl in root.iter("wavelength"):
            try:
                val = float(wl.text or 0)
                if val > 0:
                    return Wavelength(value_angstrom=val, radiation_type=RadiationType.CUSTOM)
            except (ValueError, TypeError):
                pass

        # Try K-alpha from radiation type
        for rad in root.iter("kAlpha1"):
            try:
                val = float(rad.text or 0)
                if val > 0:
                    return Wavelength(value_angstrom=val, radiation_type=RadiationType.Cu_K_ALPHA1)
            except (ValueError, TypeError):
                pass

        return Wavelength.from_radiation_type(RadiationType.Cu_K_ALPHA_AVG)

    def _extract_metadata(self, root: ET.Element) -> Dict[str, Any]:
        """Extract instrument and sample metadata."""
        meta: Dict[str, Any] = {}
        for title in root.iter("title"):
            if title.text:
                meta["measurement_title"] = title.text
        for sample in root.iter("sample"):
            name = sample.find("name")
            if name is not None and name.text:
                meta["sample_name"] = name.text
        for instrument in root.iter("instrument"):
            name = instrument.find("name")
            if name is not None and name.text:
                meta["instrument_name"] = name.text
        return meta


