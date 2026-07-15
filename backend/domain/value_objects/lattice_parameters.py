
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class LatticeParameters:
    """Value object representing unit cell dimensions."""
    a: float
    b: float
    c: float
    alpha: float = 90.0
    beta: float = 90.0
    gamma: float = 90.0

    @property
    def volume(self) -> float:
        """Calculate unit cell volume in Å³."""
        import math
        alpha_rad = math.radians(self.alpha)
        beta_rad = math.radians(self.beta)
        gamma_rad = math.radians(self.gamma)

        vol = (self.a * self.b * self.c * 
               math.sqrt(1 - math.cos(alpha_rad)**2 - math.cos(beta_rad)**2 - 
                        math.cos(gamma_rad)**2 + 
                        2 * math.cos(alpha_rad) * math.cos(beta_rad) * math.cos(gamma_rad)))
        return vol

    def is_cubic(self, tolerance: float = 0.01) -> bool:
        return (abs(self.a - self.b) < tolerance and 
                abs(self.b - self.c) < tolerance and
                abs(self.alpha - 90.0) < tolerance and
                abs(self.beta - 90.0) < tolerance and
                abs(self.gamma - 90.0) < tolerance)
