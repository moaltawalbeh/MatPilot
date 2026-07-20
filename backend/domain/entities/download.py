"""Download domain entity.

Tracks file downloads — generated reports, exported data, CIF files, etc.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Optional, Dict, Any
from uuid import UUID, uuid4


class DownloadType(Enum):
    REPORT_PDF = auto()
    REPORT_HTML = auto()
    CIF_FILE = auto()
    PATTERN_DATA = auto()
    PEAK_LIST = auto()
    REFINEMENT_RESULT = auto()
    BATCH_EXPORT = auto()


class DownloadStatus(Enum):
    PENDING = auto()
    PROCESSING = auto()
    READY = auto()
    EXPIRED = auto()
    FAILED = auto()


@dataclass
class Download:
    """A generated downloadable file."""

    id: UUID = field(default_factory=uuid4)
    user_id: Optional[UUID] = None
    download_type: DownloadType = DownloadType.REPORT_PDF
    status: DownloadStatus = DownloadStatus.PENDING

    # Source reference
    source_type: str = ""  # "experiment", "measurement", "collection"
    source_id: Optional[UUID] = None

    # File details
    filename: str = ""
    file_path: str = ""
    file_size_bytes: int = 0
    mime_type: str = ""

    # Link to experiment for context
    experiment_id: Optional[UUID] = None

    # Error tracking
    error_message: Optional[str] = None

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    downloaded_at: Optional[datetime] = None

    def mark_ready(self, file_path: str, file_size: int, mime_type: str = ""):
        self.status = DownloadStatus.READY
        self.file_path = file_path
        self.file_size_bytes = file_size
        self.mime_type = mime_type

    def mark_downloaded(self):
        self.downloaded_at = datetime.utcnow()
