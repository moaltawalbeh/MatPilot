"""Sample domain entity.

A Sample represents a physical material specimen prepared for XRD analysis.
Samples belong to Users and can have multiple Measurements.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


class SampleStatus(Enum):
    DRAFT = auto()
    ACTIVE = auto()
    ARCHIVED = auto()


class CrystalSystem(Enum):
    CUBIC = "cubic"
    HEXAGONAL = "hexagonal"
    TETRAGONAL = "tetragonal"
    ORTHORHOMBIC = "orthorhombic"
    MONOCLINIC = "monoclinic"
    TRICLINIC = "triclinic"
    RHOMBOHEDRAL = "rhombohedral"


@dataclass
class Sample:
    """Physical material specimen for XRD analysis."""

    id: UUID = field(default_factory=uuid4)
    name: str = ""
    formula: str = ""
    description: str = ""
    owner_id: Optional[UUID] = None
    status: SampleStatus = SampleStatus.DRAFT

    # Material properties
    crystal_system: Optional[CrystalSystem] = None
    space_group: Optional[str] = None
    lattice_params: Optional[Dict[str, float]] = None
    composition: Optional[Dict[str, Any]] = None

    # Source information
    source: str = ""  # e.g., "synthesized", "commercial", "natural"
    supplier: Optional[str] = None
    purity: Optional[float] = None
    batch_number: Optional[str] = None

    # Measurements
    measurement_ids: List[UUID] = field(default_factory=list)

    # Tags and metadata
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def touch(self):
        self.updated_at = datetime.utcnow()

    @property
    def measurement_count(self) -> int:
        return len(self.measurement_ids)
