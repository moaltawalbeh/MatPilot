"""Organization domain entity.

Represents an organization or institution — groups users and manages
shared resources, teams, and billing.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


class OrgPlan(Enum):
    FREE = auto()
    PRO = auto()
    ENTERPRISE = auto()


class OrgStatus(Enum):
    ACTIVE = auto()
    SUSPENDED = auto()
    CANCELLED = auto()


@dataclass
class Organization:
    """An organization or institution."""

    id: UUID = field(default_factory=uuid4)
    name: str = ""
    slug: str = ""
    description: str = ""
    owner_id: Optional[UUID] = None

    # Plan and status
    plan: OrgPlan = OrgPlan.FREE
    status: OrgStatus = OrgStatus.ACTIVE

    # Team management
    team_ids: List[UUID] = field(default_factory=list)
    member_ids: List[UUID] = field(default_factory=list)
    max_members: int = 5

    # Usage limits
    max_projects: int = 10
    max_measurements: int = 100
    storage_limit_gb: float = 5.0
    storage_used_gb: float = 0.0

    # Settings
    settings: Dict[str, Any] = field(default_factory=dict)

    # Branding
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def touch(self):
        self.updated_at = datetime.utcnow()

    @property
    def member_count(self) -> int:
        return len(self.member_ids)

    @property
    def is_within_limits(self) -> bool:
        return self.storage_used_gb < self.storage_limit_gb
