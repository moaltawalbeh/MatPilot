
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class ReferenceSearchRequest:
    """DTO for reference database searches."""
    query: str
    providers: List[str] = field(default_factory=list)
    filters: Dict[str, Any] = field(default_factory=dict)
    limit: int = 50
    offset: int = 0


@dataclass
class ReferenceSearchResponse:
    """DTO for reference search responses."""
    results: List[Dict[str, Any]] = field(default_factory=list)
    total_count: int = 0
    providers_searched: List[str] = field(default_factory=list)
    query_time_ms: float = 0.0


@dataclass
class ProviderInfoDTO:
    """DTO for provider information."""
    name: str
    display_name: str
    description: str
    is_available: bool
    supported_features: List[str] = field(default_factory=list)
    version: Optional[str] = None
