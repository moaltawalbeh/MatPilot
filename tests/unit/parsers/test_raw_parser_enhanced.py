
import math
import struct
from pathlib import Path

import pytest

from backend.parsers.raw_parser import RAWParser
from tests.generate_test_raw import (
    _generate_pattern,
    _si_peak_positions,
    generate_bruker_v1_raw,
    generate_generic_binary_raw,
    generate_panalytical_raw,
    generate_text_raw,
)

FIXTURES = Path(__file__).resolve().parent.parent.parent / "fixtures"


@pytest.fixture(scope="module")
def fixtures_dir() -> Path:
    FIXTURES.mkdir(exist_ok=True)
    return FIXTURES


@pytest.fixture
def parser():
    return RAWParser()


# ── Basic interface tests ──────────────────────────────────────────────


class TestRAWParserInterface:
    @pytest.mark.asyncio
    async def test_can_parse_raw(self, parser):
        assert parser.can_parse("data.raw") is True
        assert parser.can_parse("data.RAW") is True
        assert parser.can_parse("data.cif") is False
        assert parser.can_parse("data.xy") is False

    @pytest.mark.asyncio
    async def test_format_name(self, parser):
        assert parser.format_name == "RAW"

    @pytest.mark.asyncio
    async def test_supported_extensions(self, parser):
        assert ".raw" in parser.supported_extensions

    @pytest.mark.asyncio
    async def test_parse_returns_experiment(self, parser):
        data = b"\x00\x01\x02\x03" * 50
        exp = await parser.parse(data, "test.raw", {})
        assert exp.name == "test.raw"
        assert exp.metadata["source_format"] == "RAW"
        assert exp.metadata["is_binary"] is True
        assert exp.data_points == 0


# ── Bruker binary tests ───────────────────────────────────────────────


class TestBrukerBinary:
    @pytest.mark.asyncio
    async def test_parse_version_detected(self, parser):
        data = struct.pack("<H", 1) + b"\x00" * 200
        exp = await parser.parse(data, "test.raw", {})
        assert exp.metadata.get("raw_version") == 1

    @pytest.mark.asyncio
    async def test_parse_v1_full_fixture(self, parser, fixtures_dir):
        raw_path = generate_bruker_v1_raw(fixtures_dir / "test_bruker_v1.raw")
        data = raw_path.read_bytes()
        exp = await parser.parse(data, "si_bruker.raw", {})

        assert exp.metadata["raw_version"] == 1
        assert exp.metadata["parse_method"] == "bruker_binary"
        assert exp.data_points > 0
        assert exp.two_theta[0] == pytest.approx(5.0, abs=0.1)
        assert exp.two_theta[-1] == pytest.approx(140.0, abs=0.1)

    @pytest.mark.asyncio
    async def test_bruker_v1_peak_positions(self, parser, fixtures_dir):
        raw_path = generate_bruker_v1_raw(fixtures_dir / "test_bruker_peaks.raw")
        data = raw_path.read_bytes()
        exp = await parser.parse(data, "si.raw", {})

        peak_idx = []
        for target in _si_peak_positions():
            diffs = [abs(t - target) for t in exp.two_theta]
            best = min(range(len(diffs)), key=lambda i: diffs[i])
            peak_idx.append(best)

        peak_intensities = [exp.intensity[i] for i in peak_idx]
        bg = 100.0
        for pi in peak_intensities:
            assert pi > bg * 5, f"Peak intensity {pi:.0f} too low (expected >> {bg})"

    @pytest.mark.asyncio
    async def test_bruker_v3_header(self, parser):
        header_end = 512
        header = bytearray(header_end)
        struct.pack_into("<H", header, 0, 3)
        struct.pack_into("<I", header, 4, header_end)
        struct.pack_into("<f", header, 8, 10.0)
        struct.pack_into("<f", header, 12, 80.0)

        n_pts = 100
        payload = struct.pack(f"<{n_pts}f", *([1000.0] * n_pts))

        data = bytes(header) + payload
        exp = await parser.parse(data, "test_v3.raw", {})
        assert exp.metadata["raw_version"] == 3
        assert exp.metadata["parse_method"] == "bruker_binary"
        assert exp.data_points == 100


# ── Text-delimited parsing ────────────────────────────────────────────


class TestTextDelimited:
    @pytest.mark.asyncio
    async def test_parse_tab_delimited(self, parser, fixtures_dir):
        raw_path = generate_text_raw(fixtures_dir / "test_tab.raw")
        data = raw_path.read_bytes()
        exp = await parser.parse(data, "si_tab.raw", {})

        assert exp.metadata["parse_method"] == "text_delimited"
        assert exp.data_points > 0
        assert exp.two_theta[0] == pytest.approx(5.0, abs=0.1)
        assert exp.two_theta[-1] == pytest.approx(140.0, abs=0.1)

    @pytest.mark.asyncio
    async def test_parse_panalytical(self, parser, fixtures_dir):
        raw_path = generate_panalytical_raw(fixtures_dir / "test_panalytical.raw")
        data = raw_path.read_bytes()
        exp = await parser.parse(data, "si_panalytical.raw", {})

        assert exp.metadata["parse_method"] == "text_delimited"
        assert exp.data_points > 0

    @pytest.mark.asyncio
    async def test_parse_inline_text(self, parser):
        lines = ["2Theta\tIntensity\n"]
        positions, intensities = _generate_pattern()
        for t, i in zip(positions, intensities):
            lines.append(f"{t:.4f}\t{i:.2f}\n")
        data = "".join(lines).encode("utf-8")

        exp = await parser.parse(data, "inline.raw", {})
        assert exp.metadata["parse_method"] == "text_delimited"
        assert exp.data_points > 0

    @pytest.mark.asyncio
    async def test_parse_space_delimited(self, parser):
        lines = ["theta  counts\n"]
        positions, intensities = _generate_pattern()
        for t, i in zip(positions, intensities):
            lines.append(f"  {t:.4f}  {i:.2f}\n")
        data = "".join(lines).encode("utf-8")

        exp = await parser.parse(data, "space.raw", {})
        assert exp.metadata["parse_method"] == "text_delimited"
        assert exp.data_points > 0

    @pytest.mark.asyncio
    async def test_parse_comma_delimited(self, parser):
        lines = ["theta, intensity\n"]
        positions, intensities = _generate_pattern()
        for t, i in zip(positions, intensities):
            lines.append(f"{t:.4f},{i:.2f}\n")
        data = "".join(lines).encode("utf-8")

        exp = await parser.parse(data, "comma.raw", {})
        assert exp.metadata["parse_method"] == "text_delimited"
        assert exp.data_points > 0

    @pytest.mark.asyncio
    async def test_parse_comment_lines_skipped(self, parser):
        lines = [
            "# This is a comment\n",
            "! Another comment\n",
            "2Theta\tIntensity\n",
        ]
        positions, intensities = _generate_pattern()
        for t, i in zip(positions, intensities):
            lines.append(f"{t:.4f}\t{i:.2f}\n")
        data = "".join(lines).encode("utf-8")

        exp = await parser.parse(data, "comments.raw", {})
        assert exp.metadata["parse_method"] == "text_delimited"
        assert exp.data_points > 0


# ── Generic binary parsing ────────────────────────────────────────────


class TestGenericBinary:
    @pytest.mark.asyncio
    async def test_parse_generic_binary_pairs(self, parser, fixtures_dir):
        raw_path = generate_generic_binary_raw(fixtures_dir / "test_generic.raw")
        data = raw_path.read_bytes()
        exp = await parser.parse(data, "si_generic.raw", {})

        assert exp.metadata["parse_method"] == "generic_binary"
        assert exp.data_points > 0

    @pytest.mark.asyncio
    async def test_parse_generic_binary_in_memory(self, parser):
        positions, intensities = _generate_pattern()
        values = []
        for t, i in zip(positions, intensities):
            values.extend([t, i])

        payload = b"".join(struct.pack("<f", v) for v in values)
        exp = await parser.parse(payload, "generic.raw", {})

        assert exp.metadata["parse_method"] == "generic_binary"
        assert exp.data_points > 0

    @pytest.mark.asyncio
    async def test_generic_binary_64bit(self, parser):
        positions, intensities = _generate_pattern()
        values = []
        for t, i in zip(positions, intensities):
            values.extend([t, i])

        payload = b"".join(struct.pack("<d", v) for v in values)
        exp = await parser.parse(payload, "generic64.raw", {})

        assert exp.metadata["parse_method"] == "generic_binary"
        assert exp.data_points > 0


# ── Fallback and edge cases ───────────────────────────────────────────


class TestFallbackEdgeCases:
    @pytest.mark.asyncio
    async def test_empty_data_returns_empty(self, parser):
        exp = await parser.parse(b"", "empty.raw", {})
        assert exp.data_points == 0
        assert exp.metadata["parse_method"] == "unknown"

    @pytest.mark.asyncio
    async def test_garbage_bytes_returns_empty(self, parser):
        data = bytes(range(256)) * 10
        exp = await parser.parse(data, "garbage.raw", {})
        assert exp.data_points == 0

    @pytest.mark.asyncio
    async def test_truncated_bruker_falls_back(self, parser):
        data = struct.pack("<H", 1) + b"\x00" * 5
        exp = await parser.parse(data, "tiny.raw", {})
        assert exp.data_points == 0

    @pytest.mark.asyncio
    async def test_metadata_passthrough(self, parser):
        data = b"\x00" * 200
        exp = await parser.parse(data, "meta.raw", {"custom_key": 42})
        assert exp.metadata["custom_key"] == 42
        assert exp.metadata["source_format"] == "RAW"

    @pytest.mark.asyncio
    async def test_wavelength_defaults_to_cu_kalpha(self, parser):
        data = b"\x00" * 200
        exp = await parser.parse(data, "wl.raw", {})
        assert exp.wavelength is not None
        assert exp.wavelength.value_angstrom == pytest.approx(1.5418, abs=0.001)

    @pytest.mark.asyncio
    async def test_two_theta_intensity_length_match(self, parser, fixtures_dir):
        raw_path = generate_bruker_v1_raw(fixtures_dir / "test_match.raw")
        data = raw_path.read_bytes()
        exp = await parser.parse(data, "match.raw", {})
        assert len(exp.two_theta) == len(exp.intensity)

    @pytest.mark.asyncio
    async def test_generic_binary_out_of_range_rejected(self, parser):
        values = [0.001] * 100 + [1000.0] * 100
        payload = b"".join(struct.pack("<f", v) for v in values)
        exp = await parser.parse(payload, "oor.raw", {})
        assert exp.metadata["parse_method"] != "generic_binary"

    @pytest.mark.asyncio
    async def test_fallback_order_bruker_first(self, parser, fixtures_dir):
        raw_path = generate_bruker_v1_raw(fixtures_dir / "test_order.raw")
        data = raw_path.read_bytes()
        exp = await parser.parse(data, "order.raw", {})
        assert exp.metadata["parse_method"] == "bruker_binary"

    @pytest.mark.asyncio
    async def test_text_over_generic_binary(self, parser):
        lines = ["2Theta\tIntensity\n"]
        positions, intensities = _generate_pattern()
        for t, i in zip(positions, intensities):
            lines.append(f"{t:.4f}\t{i:.2f}\n")
        data = "".join(lines).encode("utf-8")

        exp = await parser.parse(data, "text_priority.raw", {})
        assert exp.metadata["parse_method"] == "text_delimited"


# ── Integration: round-trip via generator ─────────────────────────────


class TestRoundTrip:
    @pytest.mark.asyncio
    async def test_all_generated_files_parse(self, parser, fixtures_dir):
        files = {
            "bruker": generate_bruker_v1_raw(fixtures_dir / "rt_bruker.raw"),
            "text": generate_text_raw(fixtures_dir / "rt_text.raw"),
            "panalytical": generate_panalytical_raw(fixtures_dir / "rt_panalytical.raw"),
            "generic": generate_generic_binary_raw(fixtures_dir / "rt_generic.raw"),
        }

        for label, path in files.items():
            data = path.read_bytes()
            exp = await parser.parse(data, path.name, {})
            assert exp.data_points > 0, f"{label}: no data points extracted"
            assert len(exp.two_theta) == len(exp.intensity), f"{label}: length mismatch"
            assert min(exp.two_theta) >= 0, f"{label}: negative 2theta"
            assert max(exp.two_theta) <= 180, f"{label}: 2theta > 180"

    @pytest.mark.asyncio
    async def test_bruker_peak_positions_match_known_values(self, parser, fixtures_dir):
        raw_path = generate_bruker_v1_raw(fixtures_dir / "rt_peaks.raw")
        data = raw_path.read_bytes()
        exp = await parser.parse(data, "si.raw", {})

        for target in _si_peak_positions():
            closest = min(exp.two_theta, key=lambda t: abs(t - target))
            assert abs(closest - target) < 0.5, (
                f"Peak at {target:.2f} not found (closest: {closest:.2f})"
            )
