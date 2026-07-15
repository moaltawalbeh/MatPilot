
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4

from backend.domain.entities.analysis_job import AnalysisType
from backend.domain.value_objects.peak import Peak
from backend.domain.value_objects.reference_match import ReferenceMatch


@dataclass(frozen=True)
class AnalysisResult:
    """
    Domain entity representing the output of an analysis.

    Results are immutable once created. The application layer
    composes results from multiple analysis types into reports.
    """
    id: UUID = field(default_factory=uuid4)
    job_id: UUID = field(default_factory=uuid4)
    analysis_type: AnalysisType = AnalysisType.PEAK_DETECTION

    # Core outputs
    peaks: List[Peak] = field(default_factory=list)
    matches: List[ReferenceMatch] = field(default_factory=list)
    identified_phases: List['IdentifiedPhase'] = field(default_factory=list)

    # Quantitative results
    lattice_parameters: Optional['LatticeParameters'] = None
    crystallite_size_nm: Optional[float] = None
    microstrain_percent: Optional[float] = None

    # Simulation output
    simulated_pattern: Optional['SimulatedPattern'] = None

    # Metadata
    parameters_used: Dict[str, Any] = field(default_factory=dict)
    confidence_scores: Dict[str, float] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def has_peaks(self) -> bool:
        return len(self.peaks) > 0

    @property
    def has_matches(self) -> bool:
        return len(self.matches) > 0

    @property
    def has_phases(self) -> bool:
        return len(self.identified_phases) > 0
