"""Crystal Structure domain entity.

Stores crystallographic information from CIF files — unit cell, space group,
atom positions, and computed theoretical diffraction peaks.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


@dataclass
class AtomSite:
    """Single atom position in the unit cell."""
    label: str = ""
    element: str = ""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    occupancy: float = 1.0
    u_iso: Optional[float] = None
    wyckoff: Optional[str] = None


@dataclass
class TheoreticalPeak:
    """Computed theoretical diffraction peak."""
    hkl: str = ""
    h: int = 0
    k: int = 0
    l: int = 0
    two_theta: float = 0.0
    d_spacing: float = 0.0
    intensity: float = 0.0
    f_squared: float = 0.0
    multiplicity: int = 1


@dataclass
class CrystalStructure:
    """Crystallographic structure from CIF data."""

    id: UUID = field(default_factory=uuid4)
    name: str = ""
    formula: str = ""
    source: str = ""  # "cod", "icsd", "user_upload", "manual"
    source_id: Optional[str] = None  # e.g., COD ID

    # Unit cell parameters
    a: Optional[float] = None
    b: Optional[float] = None
    c: Optional[float] = None
    alpha: Optional[float] = None
    beta: Optional[float] = None
    gamma: Optional[float] = None

    # Symmetry
    space_group: Optional[str] = None
    crystal_system: Optional[str] = None
    z_number: Optional[int] = None

    # Atoms
    atom_sites: List[AtomSite] = field(default_factory=list)

    # Computed theoretical peaks
    theoretical_peaks: List[TheoreticalPeak] = field(default_factory=list)

    # CIF content (raw)
    cif_text: Optional[str] = None

    # Metadata
    publication: Optional[str] = None
    doi: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def touch(self):
        self.updated_at = datetime.utcnow()

    @property
    def atom_count(self) -> int:
        return len(self.atom_sites)

    @property
    def peak_count(self) -> int:
        return len(self.theoretical_peaks)

    @property
    def lattice_params_dict(self) -> Dict[str, float]:
        params = {}
        if self.a is not None: params["a"] = self.a
        if self.b is not None: params["b"] = self.b
        if self.c is not None: params["c"] = self.c
        if self.alpha is not None: params["alpha"] = self.alpha
        if self.beta is not None: params["beta"] = self.beta
        if self.gamma is not None: params["gamma"] = self.gamma
        return params
