
import logging
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Tuple, Optional

from backend.parsers.parser_interface import IParser
from backend.domain.entities.xrd_experiment import XRDExperiment
from backend.domain.value_objects.wavelength import Wavelength, RadiationType

logger = logging.getLogger(__name__)


class XRDMLParser(IParser):
    """
    Parser for PANalytical / Malvern XRDML files.

    XRDML is an XML-based format that uses namespaces. Real files look like:

        <xrdMeasurements xmlns="http://www.panalytical.com/2007/xrdml"
                          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                          xsi:schemaLocation="...">
          <xrdMeasurement>
            <scan>
              <startPosition>10.0</startPosition>
              <stepSize>0.02</stepSize>
              <intensities>100 200 150</intensities>
            </scan>
          </xrdMeasurement>
        </xrdMeasurements>

    Approach: parse the XML natively with ElementTree (which correctly handles
    all namespace declarations and prefixed attributes), then strip the
    namespace URI from element tags so we can search by local name.
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
        logger.info("XRDML parse started for '%s' (%d bytes)", filename, len(data))

        root = self._parse_xml(data)

        self._log_tree(root)

        two_theta, intensity = self._extract_scan_data(root)

        if not two_theta or not intensity:
            raise ValueError("No diffraction data found in XRDML file")

        if len(two_theta) != len(intensity):
            raise ValueError(
                f"Data mismatch: {len(two_theta)} two_theta values but "
                f"{len(intensity)} intensity values"
            )

        wavelength = self._extract_wavelength(root)
        xrd_metadata = self._extract_metadata(root)

        logger.info(
            "XRDML parse OK: %d points, wavelength=%.4f Å",
            len(two_theta), wavelength.value_angstrom,
        )

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

    # ------------------------------------------------------------------
    # XML parsing — the ONLY place the XML bytes touch an XML parser
    # ------------------------------------------------------------------

    def _parse_xml(self, data: bytes) -> ET.Element:
        """Parse raw XML bytes, log diagnostics, strip namespace URIs from tags."""
        first_lines = data[:2000].decode("utf-8", errors="replace").splitlines()[:20]
        logger.info("First %d lines of XRDML:", len(first_lines))
        for i, line in enumerate(first_lines, 1):
            logger.info("  %2d: %s", i, line)

        try:
            root = ET.fromstring(data)
        except ET.ParseError:
            logger.exception("ET.fromstring failed on raw bytes, trying utf-8-sig decode")
            text = data.decode("utf-8-sig", errors="replace")
            try:
                root = ET.fromstring(text)
            except ET.ParseError:
                logger.exception("ET.fromstring also failed on decoded text")
                raise

        logger.info("ET parse succeeded. Root tag (raw): %s", root.tag)

        self._strip_namespace_uris(root)

        return root

    @staticmethod
    def _strip_namespace_uris(root: ET.Element) -> None:
        """Strip '{uri}tag' → 'tag' on every element in the tree, in-place."""
        for elem in root.iter():
            if '}' in elem.tag:
                elem.tag = elem.tag.split('}', 1)[1]

    def _log_tree(self, root: ET.Element) -> None:
        """Log the top two levels of the parsed tree for debugging."""
        logger.info("Element tree (depth 2):")
        logger.info("  <%s> (children: %d)", root.tag, len(root))
        for child in root:
            logger.info("    <%s> text=%r (children: %d)", child.tag, child.text, len(child))
            for grandchild in list(child)[:5]:
                logger.info("      <%s> text=%r", grandchild.tag, grandchild.text)

    # ------------------------------------------------------------------
    # Element search helpers — all work on local (stripped) tag names
    # ------------------------------------------------------------------

    def _find_elements(self, root: ET.Element, tag: str) -> List[ET.Element]:
        return list(root.iter(tag))

    def _find_first(self, root: ET.Element, tag: str) -> Optional[ET.Element]:
        elements = self._find_elements(root, tag)
        return elements[0] if elements else None

    @staticmethod
    def _extract_text(element: Optional[ET.Element]) -> Optional[str]:
        if element is not None and element.text:
            return element.text.strip()
        return None

    # ------------------------------------------------------------------
    # Scan data extraction
    # ------------------------------------------------------------------

    def _extract_scan_data(self, root: ET.Element) -> Tuple[List[float], List[float]]:
        two_theta: List[float] = []
        intensity: List[float] = []

        for scan in self._find_elements(root, "scan"):
            tt, inten = self._parse_scan_compact(scan)
            if tt:
                two_theta.extend(tt)
                intensity.extend(inten)

        if two_theta:
            return two_theta, intensity

        for scan in self._find_elements(root, "scan"):
            tt, inten = self._parse_scan_per_point(scan)
            if tt:
                two_theta.extend(tt)
                intensity.extend(inten)

        return two_theta, intensity

    def _parse_scan_compact(self, scan: ET.Element) -> Tuple[List[float], List[float]]:
        start = self._extract_float(scan, "startPosition")
        end = self._extract_float(scan, "endPosition")
        step = self._extract_float(scan, "stepSize")

        intensities_el = self._find_first(scan, "intensities")
        if intensities_el is None:
            return [], []

        counts_text = self._extract_text(intensities_el)
        if not counts_text:
            return [], []

        vals = []
        for v in counts_text.split():
            try:
                vals.append(float(v))
            except ValueError:
                pass

        if not vals:
            return [], []

        if start is not None and step is not None and step > 0:
            two_theta = [start + i * step for i in range(len(vals))]
            return two_theta, vals

        if start is not None and end is not None and len(vals) > 1:
            step = (end - start) / (len(vals) - 1)
            two_theta = [start + i * step for i in range(len(vals))]
            return two_theta, vals

        if start is not None and len(vals) == 1:
            return [start], vals

        return [], vals

    def _parse_scan_per_point(self, scan: ET.Element) -> Tuple[List[float], List[float]]:
        two_theta: List[float] = []
        intensity: List[float] = []

        for dp in self._find_elements(scan, "dataPoint"):
            pos_el = self._find_first(dp, "positions")
            if pos_el is not None:
                for pos in self._find_elements(pos_el, "position"):
                    axis = pos.get("axis", "")
                    if "2Theta" in axis or "2theta" in axis.lower() or axis == "":
                        val = self._extract_float_from_element(pos)
                        if val is not None:
                            two_theta.append(val)

            counts_el = self._find_first(dp, "intensities")
            if counts_el is not None:
                val = self._extract_float_from_element(counts_el)
                if val is not None:
                    intensity.append(val)
                else:
                    text = self._extract_text(counts_el)
                    if text:
                        try:
                            intensity.append(float(text))
                        except ValueError:
                            pass

        return two_theta, intensity

    # ------------------------------------------------------------------
    # Float / metadata extraction
    # ------------------------------------------------------------------

    def _extract_float(self, parent: ET.Element, tag: str) -> Optional[float]:
        el = self._find_first(parent, tag)
        return self._extract_float_from_element(el)

    @staticmethod
    def _extract_float_from_element(el: Optional[ET.Element]) -> Optional[float]:
        if el is None or el.text is None:
            return None
        try:
            return float(el.text.strip())
        except (ValueError, AttributeError):
            return None

    def _extract_wavelength(self, root: ET.Element) -> Wavelength:
        for tag in ("wavelength", "kAlpha1", "kAlpha2", "kAlpha"):
            for el in self._find_elements(root, tag):
                val = self._extract_float_from_element(el)
                if val and val > 0:
                    rad_type = {
                        "wavelength": RadiationType.CUSTOM,
                        "kAlpha1": RadiationType.Cu_K_ALPHA1,
                        "kAlpha2": RadiationType.Cu_K_ALPHA2,
                        "kAlpha": RadiationType.Cu_K_ALPHA_AVG,
                    }.get(tag, RadiationType.CUSTOM)
                    return Wavelength(value_angstrom=val, radiation_type=rad_type)

        return Wavelength.from_radiation_type(RadiationType.Cu_K_ALPHA_AVG)

    def _extract_metadata(self, root: ET.Element) -> Dict[str, Any]:
        meta: Dict[str, Any] = {}

        for tag, key in [
            ("title", "measurement_title"),
            ("generator", "generator"),
            ("status", "measurement_status"),
        ]:
            el = self._find_first(root, tag)
            text = self._extract_text(el)
            if text:
                meta[key] = text

        for sample in self._find_elements(root, "sample"):
            name_el = self._find_first(sample, "name")
            text = self._extract_text(name_el)
            if text:
                meta["sample_name"] = text

        for instrument in self._find_elements(root, "instrument"):
            name_el = self._find_first(instrument, "name")
            text = self._extract_text(name_el)
            if text:
                meta["instrument_name"] = text

        for radiation in self._find_elements(root, "radiation"):
            name_el = self._find_first(radiation, "name")
            text = self._extract_text(name_el)
            if text:
                meta["radiation_type"] = text

        for scan_axis in self._find_elements(root, "scanAxis"):
            text = self._extract_text(scan_axis)
            if text:
                meta["scan_axis"] = text

        return meta
