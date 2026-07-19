
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass(frozen=True)
class DiffractionPattern:
    two_theta: List[float] = field(default_factory=list)
    intensity: List[float] = field(default_factory=list)
    d_spacings: List[float] = field(default_factory=list)
    hkl_indices: List[Tuple[int, int, int]] = field(default_factory=list)
