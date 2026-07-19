
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True, eq=False)
class Peak:
    """
    Value object representing a detected diffraction peak.

    Immutable and comparable by value. Peaks are identified by
    their position, not by identity.
    """
    two_theta: float
    intensity: float
    fwhm: Optional[float] = None  # Full Width at Half Maximum
    area: Optional[float] = None
    d_spacing: Optional[float] = None
    hkl: Optional[tuple] = None   # (h, k, l) Miller indices

    def __lt__(self, other: 'Peak') -> bool:
        return self.two_theta < other.two_theta

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Peak):
            return NotImplemented
        return abs(self.two_theta - other.two_theta) < 0.01

    def __hash__(self) -> int:
        # Round to 0.01 precision to match __eq__ tolerance
        return hash((round(self.two_theta, 2), round(self.intensity, 2)))
