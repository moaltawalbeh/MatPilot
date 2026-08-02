
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

    # Actually computed figure-of-merit components
    f_n: Optional[float] = None  # Smith-Snyder F_N (higher is better)
    m20: Optional[float] = None  # de Wolff M20 (higher is better)
    mae_2theta: Optional[float] = None
    n_unexplained_exp: Optional[int] = None
    n_missing_ref: Optional[int] = None
    quality_mark: Optional[str] = None  # ICDD quality mark (star/G/I/C/P/M/B/O/H)
    quality_prior: Optional[float] = None


@dataclass(frozen=True)
class SimulatedPattern:
    material: str = ""
    formula: str = ""
    source_id: str = ""
    peaks: List[TheoreticalPeak] = field(default_factory=list)
    match_score: float = 0.0
