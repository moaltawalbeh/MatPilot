
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class TheoreticalPeak:
    two_theta: float = 0.0
    intensity: float = 0.0
    d_spacing: float = 0.0
    hkl: str = ""
    h: int = 0
    k: int = 0
    l: int = 0
    f_squared: float = 0.0


@dataclass(frozen=True)
class IdentifiedPhase:
    name: str = ""
    formula: str = ""
    source: str = ""
    source_id: Optional[str] = None
    confidence: str = ""
    match_score: float = 0.0
    matched_peaks: int = 0
    total_peaks: Optional[int] = None
    fom: Optional[float] = None
    rmse_2theta: Optional[float] = None
    cosine_similarity: Optional[float] = None
    space_group: Optional[str] = None
    crystal_system: Optional[str] = None
    theoretical_peaks: List[TheoreticalPeak] = field(default_factory=list)


@dataclass(frozen=True)
class SimulatedPattern:
    material: str = ""
    formula: str = ""
    source_id: str = ""
    peaks: List[TheoreticalPeak] = field(default_factory=list)
    match_score: float = 0.0
