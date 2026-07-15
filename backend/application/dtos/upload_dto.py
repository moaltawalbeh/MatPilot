
from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class UploadFileRequest:
    """DTO for file upload requests."""
    filename: str
    content_type: str
    file_data: bytes
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    dataset_id: Optional[str] = None


@dataclass
class UploadFileResponse:
    """DTO for file upload responses."""
    experiment_id: str
    filename: str
    format_detected: str
    data_points: int
    two_theta_range: tuple
    wavelength: Optional[float] = None
    success: bool = True
    message: str = ""
