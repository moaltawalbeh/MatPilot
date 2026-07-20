"""User domain entity.

Represents a platform user — researcher, analyst, or administrator.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4


class UserRole(Enum):
    RESEARCHER = auto()
    ANALYST = auto()
    ADMIN = auto()
    VIEWER = auto()


class UserStatus(Enum):
    ACTIVE = auto()
    INACTIVE = auto()
    SUSPENDED = auto()


@dataclass
class User:
    """A platform user."""

    id: UUID = field(default_factory=uuid4)
    username: str = ""
    email: str = ""
    full_name: str = ""
    role: UserRole = UserRole.RESEARCHER
    status: UserStatus = UserStatus.ACTIVE

    # Auth
    hashed_password: Optional[str] = None

    # Organization
    organization_id: Optional[UUID] = None
    team_ids: List[UUID] = field(default_factory=list)

    # Preferences
    default_wavelength: Optional[float] = None
    preferred_providers: List[str] = field(default_factory=list)
    language: str = "en"
    timezone: str = "UTC"

    # Activity
    last_login_at: Optional[datetime] = None
    login_count: int = 0

    # Metadata
    avatar_url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def touch(self):
        self.updated_at = datetime.utcnow()

    def record_login(self):
        self.last_login_at = datetime.utcnow()
        self.login_count += 1
        self.touch()
