
"""Job Management System.

Tracks every analysis job through its lifecycle:
Queued → Running → Completed / Failed / Cancelled
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Dict, List, Optional, Any
from uuid import uuid4

from backend.infrastructure.logging.structured_logger import get_logger

logger = get_logger("job_manager")


class JobStatus(Enum):
    QUEUED = auto()
    RUNNING = auto()
    COMPLETED = auto()
    FAILED = auto()
    CANCELLED = auto()


@dataclass
class JobProgress:
    """Progress tracking for a job."""
    current_step: str = ""
    current_progress: float = 0.0  # 0.0 to 1.0
    estimated_completion_seconds: Optional[int] = None
    messages: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


@dataclass
class JobRecord:
    """Complete job record."""
    job_id: str = field(default_factory=lambda: str(uuid4()))
    experiment_id: Optional[str] = None
    job_type: str = "analysis"
    status: JobStatus = JobStatus.QUEUED

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    # Progress
    progress: JobProgress = field(default_factory=JobProgress)

    # Results
    result_id: Optional[str] = None
    result_uri: Optional[str] = None

    # Configuration
    parameters: Dict[str, Any] = field(default_factory=dict)
    provider_preferences: List[str] = field(default_factory=list)

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration_seconds(self) -> Optional[float]:
        if self.started_at and self.finished_at:
            return (self.finished_at - self.started_at).total_seconds()
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "experiment_id": self.experiment_id,
            "job_type": self.job_type,
            "status": self.status.name.lower(),
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_seconds": self.duration_seconds,
            "progress": {
                "current_step": self.progress.current_step,
                "current_progress": round(self.progress.current_progress, 2),
                "estimated_completion_seconds": self.progress.estimated_completion_seconds,
                "messages": self.progress.messages,
                "errors": self.progress.errors
            },
            "result_id": self.result_id,
            "parameters": self.parameters,
            "provider_preferences": self.provider_preferences
        }


class JobManager:
    """
    Central job management system.

    Responsibilities:
    - Create and track jobs
    - Manage state transitions
    - Provide progress reporting
    - Support job cancellation
    """

    def __init__(self):
        self._jobs: Dict[str, JobRecord] = {}
        self._logger = get_logger("job_manager")

    def create_job(
        self,
        experiment_id: Optional[str] = None,
        job_type: str = "analysis",
        parameters: Optional[Dict[str, Any]] = None,
        provider_preferences: Optional[List[str]] = None
    ) -> JobRecord:
        """Create a new job and return its record."""
        job = JobRecord(
            experiment_id=experiment_id,
            job_type=job_type,
            parameters=parameters or {},
            provider_preferences=provider_preferences or []
        )
        self._jobs[job.job_id] = job
        self._logger.log_job(
            job_id=job.job_id,
            status=job.status.name,
            step="created",
            progress=0.0,
            experiment_id=experiment_id
        )
        return job

    def start_job(self, job_id: str) -> JobRecord:
        """Mark a job as running."""
        job = self._get_job(job_id)
        job.status = JobStatus.RUNNING
        job.started_at = datetime.utcnow()
        job.progress.current_step = "running"
        self._logger.log_job(
            job_id=job.job_id,
            status=job.status.name,
            step="started",
            progress=0.0
        )
        return job

    def update_progress(
        self,
        job_id: str,
        step: str,
        progress: float,
        message: str = "",
        estimated_seconds: Optional[int] = None
    ) -> JobRecord:
        """Update job progress."""
        job = self._get_job(job_id)
        job.progress.current_step = step
        job.progress.current_progress = max(0.0, min(1.0, progress))
        if estimated_seconds:
            job.progress.estimated_completion_seconds = estimated_seconds
        if message:
            job.progress.messages.append(f"{datetime.utcnow().isoformat()}: {message}")

        self._logger.log_job(
            job_id=job.job_id,
            status=job.status.name,
            step=step,
            progress=progress,
            msg=message
        )
        return job

    def complete_job(self, job_id: str, result_id: Optional[str] = None) -> JobRecord:
        """Mark a job as completed."""
        job = self._get_job(job_id)
        job.status = JobStatus.COMPLETED
        job.finished_at = datetime.utcnow()
        job.result_id = result_id
        job.progress.current_step = "completed"
        job.progress.current_progress = 1.0
        self._logger.log_job(
            job_id=job.job_id,
            status=job.status.name,
            step="completed",
            progress=1.0
        )
        return job

    def fail_job(self, job_id: str, error: str) -> JobRecord:
        """Mark a job as failed."""
        job = self._get_job(job_id)
        job.status = JobStatus.FAILED
        job.finished_at = datetime.utcnow()
        job.progress.errors.append(error)
        job.progress.current_step = "failed"
        self._logger.log_job(
            job_id=job.job_id,
            status=job.status.name,
            step="failed",
            progress=job.progress.current_progress,
            error=error
        )
        return job

    def cancel_job(self, job_id: str) -> JobRecord:
        """Cancel a job."""
        job = self._get_job(job_id)
        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
            raise ValueError(f"Cannot cancel job in {job.status.name} state")
        job.status = JobStatus.CANCELLED
        job.finished_at = datetime.utcnow()
        job.progress.current_step = "cancelled"
        self._logger.log_job(
            job_id=job.job_id,
            status=job.status.name,
            step="cancelled",
            progress=job.progress.current_progress
        )
        return job

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        """Get a job by ID."""
        return self._jobs.get(job_id)

    def list_jobs(
        self,
        status: Optional[JobStatus] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[JobRecord]:
        """List jobs, optionally filtered by status."""
        jobs = list(self._jobs.values())
        if status:
            jobs = [j for j in jobs if j.status == status]
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return jobs[offset:offset + limit]

    def delete_job(self, job_id: str) -> bool:
        """Delete a job record."""
        if job_id in self._jobs:
            del self._jobs[job_id]
            return True
        return False

    def _get_job(self, job_id: str) -> JobRecord:
        if job_id not in self._jobs:
            raise KeyError(f"Job {job_id} not found")
        return self._jobs[job_id]
