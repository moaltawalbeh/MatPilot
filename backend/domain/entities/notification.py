"""Notification domain entity.

In-app notifications for job completions, errors, collaboration events, etc.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Optional, Dict, Any
from uuid import UUID, uuid4


class NotificationType(Enum):
    JOB_COMPLETED = auto()
    JOB_FAILED = auto()
    REFINEMENT_COMPLETE = auto()
    PHASE_IDENTIFICATION_COMPLETE = auto()
    DOWNLOAD_READY = auto()
    COLLABORATION_INVITE = auto()
    SYSTEM_ALERT = auto()
    COMMENT = auto()


class NotificationPriority(Enum):
    LOW = auto()
    NORMAL = auto()
    HIGH = auto()
    URGENT = auto()


@dataclass
class Notification:
    """An in-app notification for a user."""

    id: UUID = field(default_factory=uuid4)
    user_id: Optional[UUID] = None
    notification_type: NotificationType = NotificationType.SYSTEM_ALERT
    priority: NotificationPriority = NotificationPriority.NORMAL

    title: str = ""
    message: str = ""

    # Context reference
    source_type: str = ""  # "experiment", "job", "measurement", "collection"
    source_id: Optional[UUID] = None
    experiment_id: Optional[UUID] = None

    # Read state
    is_read: bool = False
    is_dismissed: bool = False

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None

    def mark_read(self):
        self.is_read = True
        self.read_at = datetime.utcnow()

    def dismiss(self):
        self.is_dismissed = True
