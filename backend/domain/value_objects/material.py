
from dataclasses import dataclass, field
from typing import Optional, List

from backend.domain.value_objects.crystal_system import CrystalSystem
from backend.domain.value_objects.lattice_parameters import LatticeParameters


@dataclass(frozen=True)
class Material:
    """Value object representing material composition and structure."""
    name: str = ""
    formula: str = ""
    cas_number: Optional[str] = None
    crystal_system: Optional[CrystalSystem] = None
    space_group: Optional[str] = None
    lattice_parameters: Optional[LatticeParameters] = None
    elements: List[str] = field(default_factory=list)
    density: Optional[float] = None  # g/cm³
