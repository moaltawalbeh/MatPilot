
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4


class AnalysisStatus(Enum):
    PENDING = auto()
    QUEUED = auto()
    RUNNING = auto()
    COMPLETED = auto()
    FAILED = auto()
    CANCELLED = auto()


class AnalysisType(Enum):
    PEAK_DETECTION = auto()
    PEAK_MATCHING = auto()
    REFERENCE_SEARCH = auto()
    PHASE_IDENTIFICATION = auto()
    RIETVELD_REFINEMENT = auto()
    LATTICE_PARAMETERS = auto()
    CRYSTALLITE_SIZE = auto()
    MICROSTRAIN = auto()
    PATTERN_SIMULATION = auto()


@dataclass
class AnalysisJob:
    """
    Domain entity representing an analysis request.

    The Analysis Engine processes jobs asynchronously.
    This entity tracks the lifecycle of an analysis task.
    """
    id: UUID = field(default_factory=uuid4)
    experiment_id: Optional[UUID] = None
    analysis_type: AnalysisType = AnalysisType.PEAK_DETECTION
    status: AnalysisStatus = AnalysisStatus.PENDING

    # Configuration
    parameters: Dict[str, Any] = field(default_factory=dict)
    provider_preferences: List[str] = field(default_factory=list)

    # Lifecycle
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Results
    result_id: Optional[UUID] = None
    error_message: Optional[str] = None

    # Progress tracking
    progress_percent: float = 0.0
    current_step: str = ""

    def mark_running(self):
        self.status = AnalysisStatus.RUNNING
        self.started_at = datetime.utcnow()

    def mark_completed(self, result_id: UUID):
        self.status = AnalysisStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.result_id = result_id
        self.progress_percent = 100.0

    def mark_failed(self, error: str):
        self.status = AnalysisStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error_message = error
