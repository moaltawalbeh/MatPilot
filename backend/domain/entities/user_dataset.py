
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


@dataclass
class UserDataset:
    """Collection of experiments belonging to a user."""
    id: UUID = field(default_factory=uuid4)
    name: str = ""
    description: str = ""
    experiment_ids: List[UUID] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Workspace:
    """Isolated workspace for collaboration."""
    id: UUID = field(default_factory=uuid4)
    name: str = ""
    owner_id: str = ""  # External auth system ID
    member_ids: List[str] = field(default_factory=list)
    dataset_ids: List[UUID] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
