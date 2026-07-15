
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass
class AnalysisRequest:
    """DTO for analysis requests."""
    experiment_id: str
    analysis_type: str  # e.g., "peak_detection", "phase_identification"
    parameters: Dict[str, Any] = field(default_factory=dict)
    provider_preferences: List[str] = field(default_factory=list)
    user_id: Optional[str] = None


@dataclass
class AnalysisResponse:
    """DTO for analysis responses."""
    job_id: str
    status: str
    analysis_type: str
    experiment_id: str
    created_at: str
    estimated_duration_seconds: Optional[int] = None
    message: str = "Analysis queued successfully"


@dataclass
class AnalysisResultDTO:
    """DTO for analysis results."""
    result_id: str
    job_id: str
    analysis_type: str
    status: str
    peaks: List[Dict[str, Any]] = field(default_factory=list)
    matches: List[Dict[str, Any]] = field(default_factory=list)
    phases: List[Dict[str, Any]] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    confidence: Dict[str, float] = field(default_factory=dict)
    created_at: str = ""
