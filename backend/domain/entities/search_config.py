"""Search Config domain entity.

Stores saved search configurations for phase identification, peak matching,
and reference database queries.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


@dataclass
class SearchConfig:
    """A saved search configuration for repeatable analyses."""

    id: UUID = field(default_factory=uuid4)
    name: str = ""
    description: str = ""
    owner_id: Optional[UUID] = None

    # Search parameters
    search_type: str = "phase_identification"  # phase_identification, peak_matching, reference_search
    query: str = ""
    elements: List[str] = field(default_factory=list)
    space_group: Optional[str] = None
    crystal_system: Optional[str] = None

    # Provider configuration
    providers: List[str] = field(default_factory=list)  # e.g., ["cod", "icsd"]
    max_results: int = 50
    min_match_score: float = 0.0

    # Filters
    filters: Dict[str, Any] = field(default_factory=dict)

    # Usage tracking
    use_count: int = 0
    last_used_at: Optional[datetime] = None

    # Tags and metadata
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def touch(self):
        self.updated_at = datetime.utcnow()

    def record_use(self):
        self.use_count += 1
        self.last_used_at = datetime.utcnow()
        self.touch()
