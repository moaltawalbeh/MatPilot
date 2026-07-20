"""Measurement domain entity.

A Measurement represents a single XRD scan performed on a Sample.
Contains the raw diffraction pattern data and instrument settings.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


class MeasurementStatus(Enum):
    QUEUED = auto()
    RUNNING = auto()
    COMPLETED = auto()
    FAILED = auto()
    CANCELLED = auto()


@dataclass
class InstrumentConfig:
    """Instrument settings for a measurement."""
    instrument_name: str = ""
    radiation_type: str = "Cu"  # Cu, Mo, Co, Fe, Cr, Synchrotron
    wavelength_angstrom: Optional[float] = 1.5406
    tube_voltage_kv: Optional[float] = None
    tube_current_ma: Optional[float] = None
    optics: Optional[str] = None  # e.g., "Bragg-Brentano", "parallel beam"


@dataclass
class ScanConfig:
    """Scan parameters for a measurement."""
    scan_type: str = "continuous"  # continuous, step, oscillation
    two_theta_start: Optional[float] = None
    two_theta_end: Optional[float] = None
    step_size_2theta: Optional[float] = None
    scan_speed_deg_per_min: Optional[float] = None
    total_time_seconds: Optional[float] = None


@dataclass
class Measurement:
    """A single XRD scan on a sample."""

    id: UUID = field(default_factory=uuid4)
    sample_id: Optional[UUID] = None
    experiment_id: Optional[UUID] = None
    name: str = ""
    description: str = ""
    status: MeasurementStatus = MeasurementStatus.QUEUED

    # Instrument and scan configuration
    instrument: InstrumentConfig = field(default_factory=InstrumentConfig)
    scan: ScanConfig = field(default_factory=ScanConfig)

    # Diffraction data
    data_points: int = 0
    two_theta: List[float] = field(default_factory=list)
    intensity: List[float] = field(default_factory=list)

    # Derived data
    processed_two_theta: Optional[List[float]] = None
    processed_intensity: Optional[List[float]] = None
    peaks: List[Dict[str, Any]] = field(default_factory=list)

    # Results summary
    has_results: bool = False
    results_summary: Optional[Dict[str, Any]] = None

    # File references
    file_id: Optional[str] = None
    raw_file_path: Optional[str] = None

    # Tags and metadata
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    def touch(self):
        self.updated_at = datetime.utcnow()

    def mark_completed(self):
        self.status = MeasurementStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.touch()

    def mark_failed(self, error: str = ""):
        self.status = MeasurementStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.metadata["error"] = error
        self.touch()

    @property
    def two_theta_range(self) -> Optional[List[float]]:
        if self.two_theta:
            return [min(self.two_theta), max(self.two_theta)]
        if self.scan.two_theta_start and self.scan.two_theta_end:
            return [self.scan.two_theta_start, self.scan.two_theta_end]
        return None
