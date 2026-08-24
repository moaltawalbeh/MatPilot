"""Spectroscopy service for FTIR, Raman and UV-Vis analysis.

This service is intentionally self-contained: it stores spectra in-memory
(matching the existing ``samples`` / ``measurements`` in-memory routers) and
provides parsing, numerical analysis (smoothing, baseline correction, peak
detection) and lightweight band assignment.

Every spectrum is optionally linked to a ``sample_id`` so that all
measurements belonging to the same sample can later be correlated by the AI.
"""

from __future__ import annotations

import io
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from backend.infrastructure.config.settings import load_config


TECHNIQUES = ("ftir", "raman", "uvvis")
TECHNIQUE_ALIASES = {
    "ft-ir": "ftir",
    "ftir": "ftir",
    "raman": "raman",
    "uv": "uvvis",
    "uv-vis": "uvvis",
    "uv_vis": "uvvis",
    "uvvis": "uvvis",
}

# ── Per-technique configuration ────────────────────────────────────────

@dataclass(frozen=True)
class TechniqueConfig:
    slug: str
    display_name: str
    x_label: str
    y_label: str
    x_unit: str
    y_unit: str
    x_axis_label: str
    y_axis_label: str
    extensions: tuple
    default_window: int
    default_baseline_order: int
    default_prominence: float
    bands: tuple = ()

    @property
    def default_prominence_percent(self) -> float:
        return self.default_prominence


def _bands(rows: List[Tuple[float, float, str]]) -> tuple:
    return tuple(
        (float(lo), float(hi), str(label))
        for lo, hi, label in rows
    )


TECHNIQUE_CONFIGS: Dict[str, TechniqueConfig] = {
    "ftir": TechniqueConfig(
        slug="ftir",
        display_name="FTIR Spectroscopy",
        x_label="Wavenumber",
        y_label="Absorbance",
        x_unit="cm⁻¹",
        y_unit="a.u.",
        x_axis_label="Wavenumber (cm⁻¹)",
        y_axis_label="Absorbance (a.u.)",
        extensions=(".csv", ".txt", ".dat", ".dpt", ".spa", ".0"),
        default_window=7,
        default_baseline_order=1,
        default_prominence=0.01,
        bands=_bands([
            (3200, 3600, "O–H stretch (hydrogen bonding)"),
            (2850, 3000, "C–H aliphatic stretch"),
            (1700, 1750, "C=O ester stretch"),
            (1650, 1690, "C=O amide I stretch"),
            (1600, 1640, "C=C aromatic ring stretch"),
            (1550, 1650, "Amide II (N–H bend / C–N stretch)"),
            (1000, 1300, "C–O / C–N stretch region"),
            (800, 900, "C–H out-of-plane aromatic bend"),
        ]),
    ),
    "raman": TechniqueConfig(
        slug="raman",
        display_name="Raman Spectroscopy",
        x_label="Raman shift",
        y_label="Intensity",
        x_unit="cm⁻¹",
        y_unit="a.u.",
        x_axis_label="Raman shift (cm⁻¹)",
        y_axis_label="Intensity (a.u.)",
        extensions=(".csv", ".txt", ".dat", ".spc", ".jdx"),
        default_window=5,
        default_baseline_order=2,
        default_prominence=0.02,
        bands=_bands([
            (3000, 3100, "Aromatic C–H stretch"),
            (2800, 3000, "Aliphatic C–H stretch"),
            (1500, 1650, "Aromatic ring breathing"),
            (1300, 1400, "C–H deformation"),
            (1000, 1100, "Ring breathing (e.g. 1001 cm⁻¹ polystyrene)"),
            (800, 1000, "C–C skeletal stretch"),
        ]),
    ),
    "uvvis": TechniqueConfig(
        slug="uvvis",
        display_name="UV-Vis Spectroscopy",
        x_label="Wavelength",
        y_label="Absorbance",
        x_unit="nm",
        y_unit="a.u.",
        x_axis_label="Wavelength (nm)",
        y_axis_label="Absorbance (a.u.)",
        extensions=(".csv", ".txt", ".dat", ".sp", ".uv"),
        default_window=5,
        default_baseline_order=1,
        default_prominence=0.02,
        bands=_bands([
            (180, 260, "π→π* transitions (aromatic / conjugated)"),
            (260, 400, "n→π* transitions (carbonyl, heteroatom)"),
            (400, 780, "Visible absorption (chromophores)"),
            (700, 1100, "Near-infrared region"),
        ]),
    ),
}


def normalize_technique(technique: str) -> str:
    key = technique.strip().lower()
    return TECHNIQUE_ALIASES.get(key, key)


# ── In-memory store ────────────────────────────────────────────────────

@dataclass
class SpectrumRecord:
    id: str
    technique: str
    filename: str
    name: str
    description: str
    sample_id: Optional[str]
    x: List[float]
    y: List[float]
    x_unit: str
    y_unit: str
    metadata: Dict[str, Any]
    processed_y: Optional[List[float]] = None
    baseline: Optional[List[float]] = None
    peaks: List[Dict[str, Any]] = field(default_factory=list)
    results: Optional[Dict[str, Any]] = None
    history: List[Dict[str, Any]] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def as_list_item(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "technique": self.technique,
            "filename": self.filename,
            "name": self.name or self.filename,
            "description": self.description,
            "sample_id": self.sample_id,
            "data_points": len(self.x),
            "x_range": [min(self.x) if self.x else None, max(self.x) if self.x else None],
            "has_results": bool(self.results is not None),
            "analysis_count": len(self.history),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    def as_detail(self) -> Dict[str, Any]:
        item = self.as_list_item()
        item.update({
            "x": self.x,
            "y": self.y,
            "x_unit": self.x_unit,
            "y_unit": self.y_unit,
            "processed_y": self.processed_y,
            "baseline": self.baseline,
            "peaks": self.peaks,
            "results": self.results,
            "history": self.history,
            "metadata": self.metadata,
        })
        return item


_spectra: Dict[str, Dict[str, SpectrumRecord]] = {
    technique: {} for technique in TECHNIQUES
}

MAX_POINTS = 20000


def get_spectra_store() -> Dict[str, Dict[str, SpectrumRecord]]:
    return _spectra


def _downsample(x: List[float], y: List[float]) -> Tuple[List[float], List[float]]:
    if len(x) <= MAX_POINTS:
        return x, y
    step = max(1, len(x) // MAX_POINTS)
    return x[::step], y[::step]


# ── Parsing ────────────────────────────────────────────────────────────

_METADATA_PATTERNS = [
    re.compile(r"^#\s*([^:=\t]+)\s*[:=]\s*(.+)$"),
    re.compile(r"^;\s*([^:=\t]+)\s*[:=]\s*(.+)$"),
    re.compile(r"^@([^=\t]+)\s*=\s*(.+)$"),
    re.compile(r"^([A-Za-z][A-Za-z0-9_ .()/-]{2,40})\s*[:=]\s*(.+)$"),
]

_FLOAT_RE = re.compile(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?")


def _parse_float(value: str) -> Optional[float]:
    m = _FLOAT_RE.search(value)
    return float(m.group(0)) if m else None


def _looks_numeric(line: str) -> bool:
    return bool(_FLOAT_RE.match(line.strip()))


def parse_spectrum_data(content: bytes) -> Dict[str, Any]:
    """Parse CSV/TXT/DAT spectrum files into x/y arrays plus header metadata.

    Returns ``{"x": [...], "y": [...], "metadata": {...}}``.
    """
    text = content.decode("utf-8", errors="replace")
    x: List[float] = []
    y: List[float] = []
    metadata: Dict[str, Any] = {}

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("#") or line.startswith(";") or line.startswith("@"):
            for pattern in _METADATA_PATTERNS[:3]:
                m = pattern.match(line)
                if m:
                    key = m.group(1).strip().lower().replace(" ", "_")
                    value = m.group(2).strip()
                    num = _parse_float(value)
                    metadata[key] = num if num is not None else value
                    break
            continue

        if not _looks_numeric(line):
            for pattern in _METADATA_PATTERNS:
                m = pattern.match(line)
                if m:
                    key = m.group(1).strip().lower().replace(" ", "_")
                    value = m.group(2).strip()
                    num = _parse_float(value)
                    metadata[key] = num if num is not None else value
                    break
            continue

        parts = [p for p in re.split(r"[\t,;:\s]+", line) if p]
        if len(parts) < 2:
            continue
        try:
            xv = float(parts[0])
            yv = float(parts[1])
        except ValueError:
            continue
        x.append(xv)
        y.append(yv)

    # Decimate very large traces before returning to keep payloads lean.
    x, y = _downsample(x, y)

    if x and x[0] > x[-1]:
        metadata["axis_direction"] = "decreasing"

    return {"x": x, "y": y, "metadata": metadata}


# ── Numerical analysis ─────────────────────────────────────────────────

def _moving_average(y: np.ndarray, window: int) -> np.ndarray:
    window = max(3, int(window))
    if window % 2 == 0:
        window += 1
    kernel = np.ones(window) / window
    return np.convolve(y, kernel, mode="same")


def _polynomial_baseline(x: np.ndarray, y: np.ndarray, order: int) -> np.ndarray:
    order = max(0, min(int(order), 5))
    if order == 0:
        return np.full_like(y, np.min(y))
    coeffs = np.polynomial.polynomial.polyfit(x, y, order)
    return np.polynomial.polynomial.polyval(x, coeffs)


def analyze_spectrum(
    x: List[float],
    y: List[float],
    technique: str,
    window: Optional[int] = None,
    baseline_order: Optional[int] = None,
    prominence: Optional[float] = None,
) -> Dict[str, Any]:
    """Run smoothing, baseline correction and peak detection on a spectrum."""
    cfg = TECHNIQUE_CONFIGS.get(normalize_technique(technique), TECHNIQUE_CONFIGS["ftir"])
    x_arr = np.asarray(x, dtype=float)
    y_arr = np.asarray(y, dtype=float)
    if x_arr.size == 0:
        raise ValueError("Cannot analyze an empty spectrum")

    window = int(window) if window else cfg.default_window
    baseline_order = int(baseline_order) if baseline_order is not None else cfg.default_baseline_order

    smoothed = _moving_average(y_arr, window)
    baseline = _polynomial_baseline(x_arr, smoothed, baseline_order)
    corrected = smoothed - baseline
    corrected = corrected - np.min(corrected) if corrected.size else corrected

    y_span = float(np.max(corrected) - np.min(corrected)) if corrected.size else 1.0
    if not y_span or y_span <= 0:
        y_span = 1.0

    # Estimate noise floor to keep peak detection robust against noise.
    # The estimate is only meaningful on dense data; sparse traces rely on a
    # signal-span threshold alone.
    noise_floor = float(np.std(corrected[corrected <= np.percentile(corrected, 25)])) if corrected.size else 0.0
    if prominence is None:
        prominence = y_span * cfg.default_prominence
        if corrected.size >= 200:
            prominence = max(prominence, 4.0 * noise_floor)
    if prominence <= 0:
        prominence = y_span * cfg.default_prominence or 1e-6

    try:
        from scipy.signal import find_peaks
        peak_idx, props = find_peaks(
            corrected,
            prominence=prominence,
            width=max(1, int(window) // 2) if int(window) >= 2 else None,
        )
    except Exception:
        peak_idx, props = np.array([], dtype=int), {}

    prominences = list(props.get("prominences", [prominence] * len(peak_idx)))
    peaks: List[Dict[str, Any]] = []
    for rank, i in enumerate(peak_idx):
        pos = float(x_arr[i])
        intensity = float(corrected[i])
        half_max = intensity * 0.5
        left = right = float(x_arr[i])
        # FWHM estimate around the peak
        for j in range(int(i), -1, -1):
            if corrected[j] <= half_max:
                left = float(x_arr[j])
                break
        for j in range(int(i), len(corrected)):
            if corrected[j] <= half_max:
                right = float(x_arr[j])
                break
        peaks.append({
            "position": round(pos, 4),
            "intensity": round(intensity, 6),
            "fwhm": round(right - left, 4),
            "prominence": round(float(prominences[rank]), 6) if rank < len(prominences) else round(prominence, 6),
            "assignment": assign_band(technique, pos),
        })

    peaks.sort(key=lambda p: p["intensity"], reverse=True)

    noise = noise_floor
    signal = float(np.max(corrected)) if corrected.size else 0.0

    return {
        "smoothed": [round(float(v), 6) for v in smoothed],
        "baseline": [round(float(v), 6) for v in baseline],
        "corrected": [round(float(v), 6) for v in corrected],
        "peaks": peaks,
        "stats": {
            "peak_count": len(peaks),
            "max_intensity": round(signal, 6),
            "noise_estimate": round(noise, 6),
            "snr": round(signal / noise, 2) if noise > 0 else None,
            "y_min": round(float(np.min(corrected)), 6) if corrected.size else 0.0,
            "y_max": round(float(np.max(corrected)), 6) if corrected.size else 0.0,
        },
        "parameters": {
            "window": window,
            "baseline_order": baseline_order,
            "prominence": round(float(prominence), 6),
        },
    }


def assign_band(technique: str, position: float) -> Optional[str]:
    cfg = TECHNIQUE_CONFIGS.get(normalize_technique(technique), TECHNIQUE_CONFIGS["ftir"])
    for lo, hi, label in cfg.bands:
        if lo <= position <= hi:
            return label
    return None


# ── CRUD helpers ───────────────────────────────────────────────────────

def create_spectrum(
    technique: str,
    filename: str,
    x: List[float],
    y: List[float],
    metadata: Dict[str, Any],
    sample_id: Optional[str] = None,
    name: str = "",
    description: str = "",
) -> SpectrumRecord:
    cfg = TECHNIQUE_CONFIGS[technique]
    record = SpectrumRecord(
        id=str(uuid.uuid4()),
        technique=technique,
        filename=filename,
        name=name or filename,
        description=description,
        sample_id=sample_id,
        x=x,
        y=y,
        x_unit=cfg.x_unit,
        y_unit=cfg.y_unit,
        metadata=metadata,
    )
    _spectra[technique][record.id] = record
    _register_measurement(record)
    return record


def _register_measurement(record: SpectrumRecord) -> None:
    """Mirror the spectrum into the measurements store so sample pages and
    the characterization dashboard can aggregate all techniques together."""
    if record.sample_id is None:
        return
    try:
        from backend.api.routers.measurements import _measurements

        _measurements[record.id] = {
            "id": record.id,
            "sample_id": record.sample_id,
            "name": record.name,
            "description": record.description,
            "type": record.technique,
            "status": "COMPLETED" if record.results is not None else "UPLOADED",
            "values": {
                "x": record.x,
                "y": record.y,
                "x_unit": record.x_unit,
                "y_unit": record.y_unit,
            },
            "units": {"x": record.x_unit, "y": record.y_unit},
            "metadata": {
                "spectrum_id": record.id,
                "filename": record.filename,
                "technique": record.technique,
            },
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }
    except Exception:
        # Mirroring is best-effort and must never break the spectrum upload.
        pass
