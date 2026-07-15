
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ReferenceMatch:
    """
    Value object representing a match between an experimental peak
    and a reference database entry.
    """
    material_name: str
    material_formula: str
    source_provider: str
    source_id: str

    # Match quality
    match_score: float  # 0.0 to 1.0
    matched_peaks: int
    total_peaks: int

    # Peak correspondence
    experimental_peak_2theta: float
    reference_peak_2theta: float
    d_spacing_experimental: Optional[float] = None
    d_spacing_reference: Optional[float] = None
    hkl: Optional[tuple] = None

    # Additional metadata
    confidence: Optional[str] = None  # e.g., "High", "Medium", "Low"
