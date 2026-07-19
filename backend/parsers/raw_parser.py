
import re
import struct
from typing import Dict, Any, List, Optional, Tuple

from backend.parsers.parser_interface import IParser
from backend.domain.entities.xrd_experiment import XRDExperiment
from backend.domain.value_objects.wavelength import Wavelength, RadiationType


class RAWParser(IParser):
    """
    Multi-format RAW file parser for XRD data.

    Attempts parsing in this order:
    1. Bruker proprietary binary (v1 / v3 / generic)
    2. Text-based: PANalytical ASCII, tab/space/comma-delimited
    3. Generic binary float32 / float64 extraction with 2θ-range validation

    Always falls back gracefully with empty arrays on failure.
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
        two_theta: List[float] = []
        intensity: List[float] = []
        header = self._extract_header(data)
        parse_method = "unknown"

        two_theta, intensity = self._extract_bruker_data(data, header)
        if two_theta and intensity:
            parse_method = "bruker_binary"

        if not two_theta or not intensity:
            t, i = self._try_text_parse(data)
            if t and i:
                two_theta, intensity = t, i
                parse_method = "text_delimited"

        if not two_theta or not intensity:
            t, i = self._try_generic_binary(data)
            if t and i:
                two_theta, intensity = t, i
                parse_method = "generic_binary"

        header["meta"]["parse_method"] = parse_method

        wavelength = header.get("wavelength")
        if not wavelength:
            wavelength = Wavelength.from_radiation_type(RadiationType.Cu_K_ALPHA_AVG)

        return XRDExperiment(
            name=filename,
            two_theta=two_theta,
            intensity=intensity,
            wavelength=wavelength,
            metadata={
                "source_format": self.format_name,
                "is_binary": True,
                "file_size": len(data),
                **header.get("meta", {}),
                **metadata
            }
        )

    # ── Text-based parsing (PANalytical ASCII, delimited) ──────────────

    def _try_text_parse(self, data: bytes) -> Tuple[List[float], List[float]]:
        """Attempt to read as a text file with numeric columns."""
        text = self._decode_text(data)
        if text is None:
            return [], []

        lines = [ln.strip() for ln in text.splitlines()]
        lines = [ln for ln in lines if ln]

        parsed_rows: List[Tuple[float, float]] = []
        two_theta_idx: Optional[int] = None
        intensity_idx: Optional[int] = None
        header_processed = False

        for line in lines:
            if not header_processed:
                lower = line.lower()
                if "2theta" in lower or "two-theta" in lower or "2 theta" in lower:
                    two_theta_idx, intensity_idx = self._detect_column_indices(line)
                    header_processed = True
                    continue
                header_processed = True

            row = self._parse_numeric_line(line)
            if row is not None:
                parsed_rows.append(row)

        if parsed_rows:
            return self._rows_to_columns(parsed_rows)

        return [], []

    def _decode_text(self, data: bytes) -> Optional[str]:
        """Try decoding bytes as UTF-8 / ASCII text; return None if binary."""
        if not data:
            return None
        try:
            text = data.decode("utf-8")
        except (UnicodeDecodeError, ValueError):
            try:
                text = data.decode("latin-1")
            except Exception:
                return None

        printable = sum(1 for ch in text[:2048] if ch.isprintable() or ch in "\r\n\t")
        if printable / max(len(text[:2048]), 1) < 0.85:
            return None
        return text

    def _detect_column_indices(self, header_line: str) -> Tuple[Optional[int], Optional[int]]:
        """Detect 2theta and intensity column indices from a header line."""
        parts = re.split(r"[\t,;|\s]{2,}", header_line.strip())
        t_idx: Optional[int] = None
        i_idx: Optional[int] = None
        for idx, part in enumerate(parts):
            lower = part.lower().strip()
            if any(tok in lower for tok in ("2theta", "two-theta", "2 theta", "theta")):
                t_idx = idx
            elif any(tok in lower for tok in ("intensity", "intens", "counts", "i(")):
                i_idx = idx
        return t_idx, i_idx

    def _parse_numeric_line(self, line: str) -> Optional[Tuple[float, float]]:
        """Parse a line containing exactly two numeric values."""
        if not line or line.startswith(("!", "#", ";", "/*", "//")):
            return None

        parts = re.split(r"[\t,;|]+", line.strip())
        raw_tokens: List[str] = []
        for p in parts:
            raw_tokens.extend(p.split())

        nums: List[float] = []
        for token in raw_tokens:
            token = token.strip()
            if not token:
                continue
            try:
                nums.append(float(token))
            except ValueError:
                continue
        if len(nums) >= 2:
            return (nums[0], nums[1])
        return None

    def _rows_to_columns(self, rows: List[Tuple[float, float]]) -> Tuple[List[float], List[float]]:
        """Transpose list of (two_theta, intensity) tuples into two lists."""
        tth = [r[0] for r in rows]
        inten = [r[1] for r in rows]
        return tth, inten

    # ── Generic binary float extraction ────────────────────────────────

    def _try_generic_binary(self, data: bytes) -> Tuple[List[float], List[float]]:
        """
        Try interpreting the whole file as a flat float32 or float64 array.
        Tests two layouts:
          1. Split:  [tth0..tthN, int0..intN]
          2. Interleaved: [tth0, int0, tth1, int1, ...]
        Validates that the 2θ half has min/max in the 5-150° range.
        """
        for fmt, width in ("<f", 4), ("<d", 8):
            values = self._unpack_float_array(data, fmt, width)
            if not values or len(values) < 4:
                continue

            result = self._validate_and_split_float_array(values)
            if result:
                return result

            result = self._try_interleaved_float_array(values)
            if result:
                return result

        return [], []

    def _try_interleaved_float_array(
        self, values: List[float]
    ) -> Optional[Tuple[List[float], List[float]]]:
        """Try interpreting values as interleaved [tth, int, tth, int, ...]."""
        if len(values) < 6:
            return None

        n = len(values) // 2 * 2
        tth_half = values[0:n:2]
        int_half = values[1:n:2]

        tth_min = min(tth_half)
        tth_max = max(tth_half)

        if not (5.0 <= tth_min <= 150.0 and 5.0 <= tth_max <= 150.0):
            return None
        if tth_min >= tth_max:
            return None

        return [float(v) for v in tth_half], [abs(float(v)) for v in int_half]

    def _unpack_float_array(self, data: bytes, fmt: str, width: int) -> List[float]:
        """Unpack as many consecutive floats as possible from *data*."""
        n = len(data) // width
        if n < 4:
            return []
        try:
            values = list(struct.unpack(f"<{n}{fmt[-1]}", data[: n * width]))
            valid = [v for v in values if -1e10 < v < 1e10 and v != 0.0]
            if len(valid) < n * 0.5:
                return []
            return values
        except struct.error:
            return []

    def _validate_and_split_float_array(
        self, values: List[float]
    ) -> Optional[Tuple[List[float], List[float]]]:
        """
        Assume the first half of values are 2θ positions and the second half
        are intensities.  Require the 2θ half to have min/max in the
        5-150° range (typical XRD scan window).
        """
        n = len(values)
        mid = n // 2
        if mid < 2:
            return None

        tth_half = values[:mid]
        int_half = values[mid:mid + mid]

        tth_min = min(tth_half)
        tth_max = max(tth_half)

        if not (5.0 <= tth_min <= 150.0 and 5.0 <= tth_max <= 150.0):
            return None
        if tth_min >= tth_max:
            return None

        tth_out = [float(v) for v in tth_half]
        int_out = [abs(float(v)) for v in int_half]
        return tth_out, int_out

    # ── Bruker binary parsing (original logic preserved) ───────────────

    def _extract_header(self, data: bytes) -> Dict[str, Any]:
        """Extract metadata from Bru RAW header."""
        result: Dict[str, Any] = {"meta": {}}

        if len(data) < 100:
            return result

        try:
            version = struct.unpack_from("<H", data, 0)[0]
            result["meta"]["raw_version"] = version

            if version == 1:
                self._parse_v1_header(data, result)
            elif version == 3:
                self._parse_v3_header(data, result)
            else:
                self._parse_generic_header(data, result)

        except Exception:
            result["meta"]["parse_error"] = "header extraction failed"

        return result

    def _parse_v1_header(self, data: bytes, result: Dict[str, Any]):
        """Parse Bruker RAW v1 header."""
        try:
            if len(data) >= 8:
                n_points = struct.unpack_from("<I", data, 4)[0]
                result["meta"]["n_points_hint"] = n_points

            start = self._read_float_at(data, 16)
            end = self._read_float_at(data, 20)
            step = self._read_float_at(data, 24)
            if start is not None and end is not None:
                result["meta"]["two_theta_start"] = start
                result["meta"]["two_theta_end"] = end
                if step:
                    result["meta"]["two_theta_step"] = step

            wl = self._read_float_at(data, 36)
            if wl and 0.1 < wl < 10.0:
                result["wavelength"] = Wavelength(
                    value_angstrom=wl, radiation_type=RadiationType.Cu_K_ALPHA1
                )

            result["meta"].update(self._extract_strings(data[:256]))
        except Exception:
            pass

    def _parse_v3_header(self, data: bytes, result: Dict[str, Any]):
        """Parse Bruker RAW v3 header (extended format)."""
        try:
            header_end = struct.unpack_from("<I", data, 4)[0] if len(data) >= 8 else 512
            header_end = min(header_end, len(data))

            if len(data) >= 16:
                start = self._read_float_at(data, 8)
                end = self._read_float_at(data, 12)
                if start is not None:
                    result["meta"]["two_theta_start"] = start
                if end is not None:
                    result["meta"]["two_theta_end"] = end

            result["meta"].update(self._extract_strings(data[:min(header_end, 1024)]))
        except Exception:
            pass

    def _parse_generic_header(self, data: bytes, result: Dict[str, Any]):
        """Best-effort header extraction for unknown versions."""
        result["meta"].update(self._extract_strings(data[:512]))

        for offset in range(0, min(128, len(data)) - 4, 4):
            val = self._read_float_at(data, offset)
            if val is not None and 0.3 < val < 3.0:
                result["wavelength"] = Wavelength(
                    value_angstrom=val, radiation_type=RadiationType.Cu_K_ALPHA_AVG
                )
                break

    def _extract_bruker_data(self, data: bytes, header: Dict[str, Any]) -> Tuple[List[float], List[float]]:
        """Attempt to extract intensity data from the Bruker binary file."""
        meta = header.get("meta", {})
        n_points = meta.get("n_points_hint")
        start = meta.get("two_theta_start")
        end = meta.get("two_theta_end")
        step = meta.get("two_theta_step")

        header_end = 0
        if meta.get("raw_version") == 1:
            header_end = 256
        elif meta.get("raw_version") == 3:
            header_end = struct.unpack_from("<I", data, 4)[0] if len(data) >= 8 else 512
            header_end = min(header_end, len(data))
        else:
            header_end = 256

        data_region = data[header_end:]

        if len(data_region) < 8:
            return [], []

        intensities = self._try_float32_array(data_region, n_points)
        if not intensities:
            intensities = self._try_float64_array(data_region, n_points)

        if not intensities:
            return [], []

        if start is not None and end is not None and len(intensities) > 1:
            if step and step > 0:
                two_theta = [start + i * step for i in range(len(intensities))]
            else:
                step_val = (end - start) / (len(intensities) - 1)
                two_theta = [start + i * step_val for i in range(len(intensities))]
        elif start is not None and step:
            two_theta = [start + i * step for i in range(len(intensities))]
        else:
            return [], []

        return two_theta, intensities

    # ── Shared helpers ─────────────────────────────────────────────────

    def _try_float32_array(self, data: bytes, expected_len: Optional[int] = None) -> List[float]:
        """Try interpreting data as an array of 32-bit floats."""
        if len(data) < 4:
            return []

        n_floats = len(data) // 4
        if expected_len and expected_len <= n_floats:
            n_floats = expected_len

        if n_floats < 2:
            return []

        try:
            values = list(struct.unpack(f"<{n_floats}f", data[:n_floats * 4]))
            valid = [v for v in values if -1e10 < v < 1e10 and v != 0.0]
            if len(valid) < n_floats * 0.5:
                return []
            return values[:n_floats]
        except struct.error:
            return []

    def _try_float64_array(self, data: bytes, expected_len: Optional[int] = None) -> List[float]:
        """Try interpreting data as an array of 64-bit floats."""
        if len(data) < 8:
            return []

        n_floats = len(data) // 8
        if expected_len and expected_len <= n_floats:
            n_floats = expected_len

        if n_floats < 2:
            return []

        try:
            values = list(struct.unpack(f"<{n_floats}d", data[:n_floats * 8]))
            valid = [v for v in values if -1e10 < v < 1e10 and v != 0.0]
            if len(valid) < n_floats * 0.5:
                return []
            return values[:n_floats]
        except struct.error:
            return []

    def _read_float_at(self, data: bytes, offset: int) -> Optional[float]:
        """Read a 32-bit float at a specific offset."""
        if offset + 4 > len(data):
            return None
        try:
            val = struct.unpack_from("<f", data, offset)[0]
            if -1e10 < val < 1e10:
                return val
            return None
        except struct.error:
            return None

    def _extract_strings(self, region: bytes) -> Dict[str, str]:
        """Extract readable ASCII strings from a binary region."""
        result: Dict[str, str] = {}
        current = bytearray()
        strings = []

        for b in region:
            if 32 <= b < 127:
                current.append(b)
            else:
                if len(current) > 3:
                    s = bytes(current).decode("ascii", errors="ignore").strip()
                    if s:
                        strings.append(s)
                current = bytearray()

        if len(current) > 3:
            s = bytes(current).decode("ascii", errors="ignore").strip()
            if s:
                strings.append(s)

        if strings:
            result["header_strings"] = strings[:10]

        return result
