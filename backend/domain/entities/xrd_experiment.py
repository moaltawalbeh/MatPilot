
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4

from backend.domain.value_objects.peak import Peak
from backend.domain.value_objects.material import Material
from backend.domain.value_objects.wavelength import Wavelength


@dataclass(frozen=True)
class XRDExperiment:
    """
    Domain entity representing an XRD experiment.

    This is the canonical internal model. All parsers must convert
    their native formats to this structure. The application layer
    never sees raw file formats.
    """
    id: UUID = field(default_factory=uuid4)
    name: str = ""
    description: str = ""
    two_theta: List[float] = field(default_factory=list)
    intensity: List[float] = field(default_factory=list)
    wavelength: Optional[Wavelength] = None
    material: Optional[Material] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        if len(self.two_theta) != len(self.intensity):
            raise ValueError("two_theta and intensity must have equal length")

    @property
    def data_points(self) -> int:
        return len(self.two_theta)

    def get_peak_region(self, start_2theta: float, end_2theta: float) -> 'XRDExperiment':
        """Extract a subset of the pattern by 2θ range."""
        indices = [i for i, t in enumerate(self.two_theta) 
                   if start_2theta <= t <= end_2theta]
        return XRDExperiment(
            id=self.id,
            name=f"{self.name}_subset",
            two_theta=[self.two_theta[i] for i in indices],
            intensity=[self.intensity[i] for i in indices],
            wavelength=self.wavelength,
            material=self.material,
            metadata=self.metadata
        )
