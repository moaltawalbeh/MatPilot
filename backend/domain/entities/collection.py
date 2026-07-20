"""Collection domain entity.

A Collection groups related Samples, Measurements, and Structures
for batch analysis, reporting, or organizational purposes.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


class CollectionType(Enum):
    PROJECT = auto()
    RESEARCH_GROUP = auto()
    PUBLICATION = auto()
    CUSTOM = auto()


@dataclass
class Collection:
    """A named grouping of scientific entities."""

    id: UUID = field(default_factory=uuid4)
    name: str = ""
    description: str = ""
    owner_id: Optional[UUID] = None
    collection_type: CollectionType = CollectionType.CUSTOM

    # References to grouped entities
    sample_ids: List[UUID] = field(default_factory=list)
    measurement_ids: List[UUID] = field(default_factory=list)
    structure_ids: List[UUID] = field(default_factory=list)
    experiment_ids: List[UUID] = field(default_factory=list)

    # Metadata
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Visibility
    is_public: bool = False

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def touch(self):
        self.updated_at = datetime.utcnow()

    @property
    def item_count(self) -> int:
        return (len(self.sample_ids) + len(self.measurement_ids) +
                len(self.structure_ids) + len(self.experiment_ids))
