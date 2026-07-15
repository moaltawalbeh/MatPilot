
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


class ReportFormat(Enum):
    PDF = auto()
    HTML = auto()
    JSON = auto()
    CSV = auto()
    CIF = auto()


@dataclass(frozen=True)
class Report:
    """
    Domain entity representing a generated report.

    Reports aggregate multiple analysis results into
    publication-ready documents.
    """
    id: UUID = field(default_factory=uuid4)
    title: str = ""
    description: str = ""

    # Source data
    experiment_ids: List[UUID] = field(default_factory=list)
    result_ids: List[UUID] = field(default_factory=list)

    # Content
    sections: List['ReportSection'] = field(default_factory=list)
    figures: List['ReportFigure'] = field(default_factory=list)
    tables: List['ReportTable'] = field(default_factory=list)

    # Formatting
    format: ReportFormat = ReportFormat.PDF
    template_id: Optional[str] = None

    # Metadata
    generated_at: datetime = field(default_factory=datetime.utcnow)
    generated_by: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
