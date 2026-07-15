"""Experiment domain entity.

An Experiment belongs to a Project and contains files, metadata, and results.
Files are never attached directly to Projects.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


@dataclass
class ExperimentMetadata:
    """Strong-typed metadata for an experiment."""
    instrument: str = ""
    radiation_type: str = ""  # Cu, Mo, Co, Fe, Cr, Synchrotron
    wavelength_angstrom: Optional[float] = None
    temperature_k: Optional[float] = None
    scan_range_2theta: Optional[List[float]] = None  # [min, max]
    step_size_2theta: Optional[float] = None
    scan_time_seconds: Optional[float] = None
    notes: str = ""
    custom: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Experiment:
    """
    Domain entity representing a single experiment within a project.

    Hierarchy: Project → Experiment → Files
    Each experiment contains:
    - Experimental pattern data
    - Crystal structure (CIF)
    - Metadata
    - Results from analysis
    """
    id: UUID = field(default_factory=uuid4)
    project_id: Optional[UUID] = None
    name: str = ""
    description: str = ""
    material: str = ""
    status: str = "Created"  # Created, Uploaded, Analyzed, Complete

    # File associations
    file_ids: List[str] = field(default_factory=list)
    primary_file_id: Optional[str] = None  # The main data file

    # Experiment data (stored as references)
    has_pattern_data: bool = False
    has_crystal_structure: bool = False
    data_points: int = 0
    two_theta_range: Optional[List[float]] = None
    wavelength_angstrom: Optional[float] = None

    # Analysis tracking
    job_ids: List[str] = field(default_factory=list)
    has_results: bool = False

    # Metadata
    metadata: ExperimentMetadata = field(default_factory=ExperimentMetadata)

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def touch(self):
        self.updated_at = datetime.utcnow()

    @property
    def file_count(self) -> int:
        return len(self.file_ids)

    @property
    def job_count(self) -> int:
        return len(self.job_ids)
