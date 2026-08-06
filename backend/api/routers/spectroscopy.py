"""Spectroscopy API endpoints for FTIR, Raman and UV-Vis analysis.

Every endpoint is additive and self-contained: existing XRD / project /
sample / measurement functionality is untouched. Spectra uploaded here are
optionally linked to a sample (``sample_id``) so that all measurements of the
same sample can later be correlated by the unified AI analysis.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from backend.services.spectroscopy_service import (
    MAX_POINTS,
    TECHNIQUE_CONFIGS,
    TECHNIQUES,
    analyze_spectrum,
    create_spectrum,
    generate_report,
    get_spectra_store,
    normalize_technique,
    parse_spectrum_data,
)

router = APIRouter(prefix="/spectroscopy", tags=["Spectroscopy"])


# ── Schemas ────────────────────────────────────────────────────────────

class SpectrumListItem(BaseModel):
    id: str
    technique: str
    filename: str
    name: str
    description: str
    sample_id: Optional[str]
    data_points: int
    x_range: Optional[List[Optional[float]]]
    has_results: bool
    analysis_count: int
    created_at: str
    updated_at: str


class SpectrumUploadResponse(BaseModel):
    spectrum: SpectrumListItem
    data_points: int
    message: str
    warnings: List[str] = []


class SpectrumDetail(SpectrumListItem):
    x: List[float]
    y: List[float]
    x_unit: str
    y_unit: str
    processed_y: Optional[List[float]] = None
    baseline: Optional[List[float]] = None
    peaks: List[dict] = []
    results: Optional[dict] = None
    history: List[dict] = []
    metadata: dict = {}


class SpectrumListResponse(BaseModel):
    technique: str
    spectra: List[SpectrumListItem]
    total: int


class BySampleResponse(BaseModel):
    sample_id: str
    spectra: List[SpectrumListItem]
    total: int


class AnalyzeRequest(BaseModel):
    window: Optional[int] = None
    baseline_order: Optional[int] = None
    prominence: Optional[float] = None


class AnalyzeResponse(BaseModel):
    spectrum_id: str
    success: bool
    message: str
    results: Optional[dict] = None
    history: List[dict] = []


class ReportResponse(BaseModel):
    spectrum_id: str
    technique: str
    title: str
    markdown: str
    created_at: str
    stats: dict


class SpectroscopyStats(BaseModel):
    technique: str
    count: int


class SpectroscopySummary(BaseModel):
    techniques: List[SpectroscopyStats]
    total: int
    with_results: int
    samples_covered: int


def _require_technique(technique: str) -> str:
    normalized = normalize_technique(technique)
    if normalized not in TECHNIQUES:
        raise HTTPException(status_code=404, detail=f"Unsupported technique: {technique}")
    return normalized


def _require_spectrum(technique: str, spectrum_id: str):
    store = get_spectra_store()[technique]
    record = store.get(spectrum_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Spectrum not found")
    return record


# ── Endpoints ──────────────────────────────────────────────────────────

@router.get("/summary", response_model=SpectroscopySummary)
async def spectroscopy_summary():
    """Aggregate statistics across all spectroscopy techniques."""
    store = get_spectra_store()
    total = 0
    with_results = 0
    samples = set()
    techniques = []
    for technique in TECHNIQUES:
        records = list(store[technique].values())
        techniques.append(
            SpectroscopyStats(technique=technique, count=len(records))
        )
        total += len(records)
        with_results += sum(1 for r in records if r.results is not None)
        samples.update(r.sample_id for r in records if r.sample_id)
    return SpectroscopySummary(
        techniques=techniques,
        total=total,
        with_results=with_results,
        samples_covered=len(samples),
    )


@router.get("/{technique}", response_model=SpectrumListResponse)
async def list_spectra(
    technique: str,
    sample_id: Optional[str] = None,
    limit: int = 100,
):
    """List spectra for a technique, optionally filtered by sample."""
    normalized = _require_technique(technique)
    records = list(get_spectra_store()[normalized].values())
    if sample_id:
        records = [r for r in records if r.sample_id == sample_id]
    records.sort(key=lambda r: r.created_at, reverse=True)
    records = records[: max(1, min(limit, 500))]
    return SpectrumListResponse(
        technique=normalized,
        spectra=[r.as_list_item() for r in records],
        total=len(records),
    )


@router.post("/{technique}/upload", response_model=SpectrumUploadResponse)
async def upload_spectrum(
    technique: str,
    file: UploadFile = File(...),
    sample_id: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
):
    """Upload a spectrum file for the given technique.

    Supported text formats: CSV, TXT, DAT (two numeric columns). Header lines
    such as ``# key: value`` are parsed into the metadata panel. If a
    ``sample_id`` is supplied the spectrum is mirrored into the measurements
    store so it appears on the sample page.
    """
    normalized = _require_technique(technique)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")

    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 25 MB limit")

    parsed = parse_spectrum_data(content)
    x = parsed["x"]
    y = parsed["y"]
    if len(x) < 5 or len(y) < 5:
        raise HTTPException(
            status_code=422,
            detail=(
                "Could not parse numeric spectrum data. Expected two numeric "
                "columns (x, y) per row in CSV/TXT/DAT format."
            ),
        )
    if len(x) > MAX_POINTS:
        raise HTTPException(
            status_code=413,
            detail=f"Spectrum exceeds {MAX_POINTS} points after decimation",
        )

    record = create_spectrum(
        technique=normalized,
        filename=file.filename or "spectrum",
        x=x,
        y=y,
        metadata=parsed["metadata"],
        sample_id=sample_id,
        name=name or "",
        description=description or "",
    )

    warnings = []
    if "axis_direction" in parsed["metadata"]:
        warnings.append("X-axis values are decreasing; data was kept as-is.")

    return SpectrumUploadResponse(
        spectrum=record.as_list_item(),
        data_points=len(x),
        message=f"{TECHNIQUE_CONFIGS[normalized].display_name} spectrum uploaded",
        warnings=warnings,
    )


@router.get("/{technique}/{spectrum_id}", response_model=SpectrumDetail)
async def get_spectrum(technique: str, spectrum_id: str):
    normalized = _require_technique(technique)
    record = _require_spectrum(normalized, spectrum_id)
    return SpectrumDetail(**record.as_detail())


@router.delete("/{technique}/{spectrum_id}")
async def delete_spectrum(technique: str, spectrum_id: str):
    normalized = _require_technique(technique)
    store = get_spectra_store()[normalized]
    record = _require_spectrum(normalized, spectrum_id)
    del store[spectrum_id]
    try:
        from backend.api.routers.measurements import _measurements
        _measurements.pop(spectrum_id, None)
    except Exception:
        pass
    return {"success": True, "message": f"Spectrum {spectrum_id} deleted"}


@router.post("/{technique}/{spectrum_id}/analyze", response_model=AnalyzeResponse)
async def analyze_spectrum_endpoint(
    technique: str,
    spectrum_id: str,
    request: AnalyzeRequest,
):
    """Run smoothing, baseline correction and peak detection on a spectrum."""
    normalized = _require_technique(technique)
    record = _require_spectrum(normalized, spectrum_id)

    try:
        results = analyze_spectrum(
            record.x,
            record.y,
            technique=normalized,
            window=request.window,
            baseline_order=request.baseline_order,
            prominence=request.prominence,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    record.processed_y = results["corrected"]
    record.baseline = results["baseline"]
    record.peaks = results["peaks"]
    record.results = results
    now = record.updated_at
    record.history.append({
        "action": "ANALYSIS_RUN",
        "timestamp": now,
        "details": results["parameters"],
    })

    _sync_measurement_status(record)

    return AnalyzeResponse(
        spectrum_id=record.id,
        success=True,
        message=f"Analysis complete: {len(results['peaks'])} peaks detected",
        results=results,
        history=record.history,
    )


@router.post("/{technique}/{spectrum_id}/report", response_model=ReportResponse)
async def spectrum_report(technique: str, spectrum_id: str):
    """Generate a scientific summary report for a spectrum."""
    normalized = _require_technique(technique)
    record = _require_spectrum(normalized, spectrum_id)
    if record.results is None:
        raise HTTPException(
            status_code=422,
            detail="Run analysis before generating a report",
        )
    return ReportResponse(**generate_report(record, {}))


@router.post("/by-sample/{sample_id}", response_model=BySampleResponse)
async def spectra_by_sample(sample_id: str):
    """Return every spectrum (across techniques) belonging to a sample."""
    store = get_spectra_store()
    results = []
    for technique in TECHNIQUES:
        for record in store[technique].values():
            if record.sample_id == sample_id:
                results.append(record.as_list_item())
    results.sort(key=lambda r: r["created_at"], reverse=True)
    return BySampleResponse(sample_id=sample_id, spectra=results, total=len(results))


def _sync_measurement_status(record) -> None:
    try:
        from backend.api.routers.measurements import _measurements
        entry = _measurements.get(record.id)
        if entry:
            entry["status"] = "COMPLETED"
    except Exception:
        pass
