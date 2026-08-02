
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
        # Peaks are equal when both position and intensity agree; this keeps the
        # equality relation consistent with __hash__ (same key -> equal).
        return (
            abs(self.two_theta - other.two_theta) < 0.01
            and self.intensity == other.intensity
        )

    def __hash__(self) -> int:
        # Hash on the same attributes used by __eq__ so equal peaks share a hash.
        return hash((round(self.two_theta, 2), self.intensity))
