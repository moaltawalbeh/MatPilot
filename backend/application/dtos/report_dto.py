
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class ReportRequest:
    """DTO for report generation requests."""
    title: str
    experiment_ids: List[str] = field(default_factory=list)
    result_ids: List[str] = field(default_factory=list)
    format: str = "pdf"
    template_id: Optional[str] = None
    include_figures: bool = True
    include_tables: bool = True
    user_id: Optional[str] = None


@dataclass
class ReportResponse:
    """DTO for report generation responses."""
    report_id: str
    status: str
    download_url: Optional[str] = None
    format: str = "pdf"
    generated_at: Optional[str] = None
    message: str = ""
