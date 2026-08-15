from abc import ABC, abstractmethod
from typing import Dict, Any, List

class ValidationResult:
    def __init__(self, is_valid: bool, confidence_score: float, flags: List[str], metrics: Dict[str, float]):
        self.is_valid = is_valid
        self.confidence_score = confidence_score
        self.flags = flags
        self.metrics = metrics

    def to_dict(self) -> Dict[str, Any]:
        return {
            "validation_status": "PASS" if self.is_valid else "FAIL",
            "confidence_score": self.confidence_score,
            "flags": self.flags,
            "uncertainty_metrics": self.metrics
        }

class IScientificValidator(ABC):
    """
    Interface for the Scientific Validation Layer.
    Ensures numerical results are physically viable before reaching the AI.
    """
    
    @abstractmethod
    def validate(self, raw_data: Dict[str, Any], computed_results: Dict[str, Any]) -> ValidationResult:
        """
        Validates the results against the raw data.
        Returns a ValidationResult containing flags and confidence scores.
        """
        pass
