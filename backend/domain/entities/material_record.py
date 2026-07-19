
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4

from backend.domain.value_objects.crystal_system import CrystalSystem
from backend.domain.value_objects.lattice_parameters import LatticeParameters
from backend.domain.value_objects.diffraction_pattern import DiffractionPattern


@dataclass(frozen=True)
class MaterialRecord:
    """
    Provider-independent representation of a crystalline material.

    This model decouples the domain from any specific database schema.
    All reference providers must map their native schemas to this model.
    """
    id: UUID = field(default_factory=uuid4)

    # Identification
    name: str = ""
    formula: str = ""
    cas_number: Optional[str] = None

    # Crystallographic data
    crystal_system: Optional[CrystalSystem] = None
    space_group: Optional[str] = None
    lattice_parameters: Optional[LatticeParameters] = None

    # Reference data
    diffraction_pattern: Optional[DiffractionPattern] = None
    reference_intensities: List[float] = field(default_factory=list)
    d_spacings: List[float] = field(default_factory=list)
    hkl_indices: List[tuple] = field(default_factory=list)

    # Provenance
    source_provider: str = ""  # e.g., "COD", "MaterialsProject", "OQMD"
    source_id: str = ""        # Provider's native identifier
    source_url: Optional[str] = None

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)

    @property
    def is_valid_crystal(self) -> bool:
        return self.crystal_system is not None and self.lattice_parameters is not None
