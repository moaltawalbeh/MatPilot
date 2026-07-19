
"""
Generate synthetic Bruker v1 RAW files for testing the RAWParser.

Produces a small binary file that mimics Bruker RAW v1 layout:
  bytes 0-1   : version (uint16 LE) = 1
  bytes 4-7   : n_points (uint32 LE)
  bytes 16-19 : two_theta_start (float32 LE)
  bytes 20-23 : two_theta_end   (float32 LE)
  bytes 24-27 : two_theta_step  (float32 LE)
  bytes 36-39 : wavelength      (float32 LE)
  bytes 256+  : intensity float32 array

Uses known Si powder peaks (Cu Kα, λ = 1.5418 Å) for easy verification.
"""

import math
import struct
from pathlib import Path


def _si_peak_positions() -> list[float]:
    """Approximate 2θ positions for major Si (cubic, a=5.431 Å) reflections."""
    return [
        28.44,  # (111)
        47.30,  # (220)
        56.12,  # (311)
        69.13,  # (400)
        76.38,  # (331)
        88.03,  # (422)
        94.95,  # (511/333)
        106.72,  # (440)
        114.10,  # (531)
        127.55,  # (620)
        136.90,  # (533)
    ]


def _generate_pattern(
    two_theta_start: float = 5.0,
    two_theta_end: float = 140.0,
    step: float = 0.02,
    fwhm: float = 0.15,
    background: float = 100.0,
    peak_height: float = 10000.0,
) -> tuple[list[float], list[float]]:
    """Create a synthetic Si-like XRD pattern on a regular grid."""
    n_points = int((two_theta_end - two_theta_start) / step) + 1
    positions = [two_theta_start + i * step for i in range(n_points)]
    intensities = [background] * n_points

    for peak_2t in _si_peak_positions():
        sigma = fwhm / 2.3548
        for j, t in enumerate(positions):
            diff = t - peak_2t
            intensities[j] += peak_height * math.exp(-0.5 * (diff / sigma) ** 2)

    return positions, intensities


def generate_bruker_v1_raw(path: str | Path) -> Path:
    """Write a Bruker v1 RAW file and return the path."""
    path = Path(path)
    two_theta_start = 5.0
    two_theta_end = 140.0
    step = 0.02
    positions, intensities = _generate_pattern(two_theta_start, two_theta_end, step)
    n_points = len(intensities)

    header = bytearray(256)

    struct.pack_into("<H", header, 0, 1)
    struct.pack_into("<I", header, 4, n_points)
    struct.pack_into("<f", header, 16, two_theta_start)
    struct.pack_into("<f", header, 20, two_theta_end)
    struct.pack_into("<f", header, 24, step)
    struct.pack_into("<f", header, 36, 1.5418)

    sample_name = b"Si Powder Standard"
    header[40:40 + len(sample_name)] = sample_name

    payload = b"".join(struct.pack("<f", v) for v in intensities)

    path.write_bytes(bytes(header) + payload)
    return path


def generate_text_raw(path: str | Path) -> Path:
    """Write a tab-delimited text file with .raw extension."""
    path = Path(path)
    positions, intensities = _generate_pattern()

    lines = ["2Theta\tIntensity\n"]
    for t, i in zip(positions, intensities):
        lines.append(f"{t:.4f}\t{i:.2f}\n")

    path.write_text("".join(lines), encoding="utf-8")
    return path


def generate_panalytical_raw(path: str | Path) -> Path:
    """Write a PANalytical-style ASCII RAW file."""
    path = Path(path)
    positions, intensities = _generate_pattern()

    lines = [
        " PANalytical XRD data\n",
        "Sample: Si Standard\n",
        "2Theta   Intensity\n",
    ]
    for t, i in zip(positions, intensities):
        lines.append(f"  {t:.4f}   {i:.2f}\n")

    path.write_text("".join(lines), encoding="utf-8")
    return path


def generate_generic_binary_raw(path: str | Path) -> Path:
    """Write float32 pairs: [tth0, int0, tth1, int1, ...]."""
    path = Path(path)
    positions, intensities = _generate_pattern()

    values = []
    for t, i in zip(positions, intensities):
        values.extend([t, i])

    payload = b"".join(struct.pack("<f", v) for v in values)
    path.write_bytes(payload)
    return path


if __name__ == "__main__":
    out = Path(__file__).parent / "fixtures"
    out.mkdir(exist_ok=True)

    p1 = generate_bruker_v1_raw(out / "si_bruker_v1.raw")
    print(f"Generated Bruker v1  -> {p1}  ({p1.stat().st_size} bytes)")

    p2 = generate_text_raw(out / "si_text_delimited.raw")
    print(f"Generated text delim -> {p2}  ({p2.stat().st_size} bytes)")

    p3 = generate_panalytical_raw(out / "si_panalytical.raw")
    print(f"Generated PANalytical -> {p3}  ({p3.stat().st_size} bytes)")

    p4 = generate_generic_binary_raw(out / "si_generic_binary.raw")
    print(f"Generated generic bin -> {p4}  ({p4.stat().st_size} bytes)")
