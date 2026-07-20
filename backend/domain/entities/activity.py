"""Activity domain entity.

Audit log / activity feed tracking all significant actions
across the platform — uploads, analyses, refinements, etc.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Optional, Dict, Any
from uuid import UUID, uuid4


class ActivityType(Enum):
    FILE_UPLOADED = auto()
    PROJECT_CREATED = auto()
    PROJECT_UPDATED = auto()
    MEASUREMENT_STARTED = auto()
    MEASUREMENT_COMPLETED = auto()
    PHASE_IDENTIFICATION_RUN = auto()
    RIETVELD_REFINEMENT_RUN = auto()
    REPORT_GENERATED = auto()
    SAMPLE_CREATED = auto()
    SAMPLE_UPDATED = auto()
    STRUCTURE_IMPORTED = auto()
    COLLECTION_CREATED = auto()
    SEARCH_PERFORMED = auto()
    DOWNLOAD_COMPLETED = auto()
    USER_LOGIN = auto()


@dataclass
class Activity:
    """An activity log entry for the audit trail."""

    id: UUID = field(default_factory=uuid4)
    user_id: Optional[UUID] = None
    activity_type: ActivityType = ActivityType.FILE_UPLOADED

    # Human-readable description
    title: str = ""
    description: str = ""

    # Context reference
    source_type: str = ""  # "experiment", "project", "sample", "measurement"
    source_id: Optional[UUID] = None
    project_id: Optional[UUID] = None

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Timestamp
    created_at: datetime = field(default_factory=datetime.utcnow)
