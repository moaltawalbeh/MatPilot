from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4

@dataclass
class BaseInstrumentExperiment:
    """
    Polymorphic Base class for all V2 scientific experiments.
    Contains ONLY metadata shared across ALL instruments.
    No XRD-specific or FTIR-specific fields belong here.
    """
    id: UUID = field(default_factory=uuid4)
    workspace_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    
    instrument_type: str = "" # "XRD", "FTIR", "RAMAN", "UVVIS"
    name: str = ""
    description: str = ""
    material: str = ""
    status: str = "Created"
    
    # Files linked to this specific experiment
    file_ids: List[str] = field(default_factory=list)
    primary_file_id: Optional[str] = None
    
    # Generic execution history
    pipeline_stages: List[Dict[str, Any]] = field(default_factory=list)
    analysis_history: List[Dict[str, Any]] = field(default_factory=list)
    
    # AI Interpretation Storage
    ai_interpretation_id: Optional[UUID] = None
    
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def touch(self):
        self.updated_at = datetime.utcnow()

    def add_history(self, action: str, details: Optional[Dict[str, Any]] = None):
        from datetime import datetime as dt
        entry = {
            "action": action,
            "timestamp": dt.utcnow().isoformat(),
            "details": details or {},
        }
        self.analysis_history.append(entry)
        self.touch()
