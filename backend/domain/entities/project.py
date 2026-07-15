"""Project domain entity."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4


@dataclass
class ProjectMetadata:
    """Strong-typed metadata for a project."""
    instrument: str = ""
    radiation_type: str = ""
    wavelength_angstrom: Optional[float] = None
    temperature_k: Optional[float] = None
    notes: str = ""
    custom: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Project:
    """Scientific project grouping experiments, analyses, and reports."""

    id: UUID = field(default_factory=uuid4)
    name: str = ""
    description: str = ""
    material: str = ""
    owner_id: str = "default"
    experiment_ids: List[UUID] = field(default_factory=list)
    file_ids: List[str] = field(default_factory=list)
    job_ids: List[str] = field(default_factory=list)
    status: str = "Active"
    tags: List[str] = field(default_factory=list)
    metadata: ProjectMetadata = field(default_factory=ProjectMetadata)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def touch(self):
        self.updated_at = datetime.utcnow()
