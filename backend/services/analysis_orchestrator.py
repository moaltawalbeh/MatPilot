
"""Analysis Orchestrator.

Central coordination service for all scientific workflows.
Does NOT perform scientific calculations.
Only coordinates: Upload → Validation → Parser → XRDExperiment → Job → Pipeline → Result → Report → Store
"""

from typing import Dict, Any, Optional, List
from datetime import datetime

from backend.services.upload_service import UploadService, UploadResult
from backend.services.job_manager import JobManager, JobRecord, JobStatus
from backend.services.pipeline import AnalysisPipeline, PipelineContext
from backend.services.storage_service import StorageService
from backend.infrastructure.storage.storage_provider import IStorageProvider
from backend.infrastructure.logging.structured_logger import get_logger
from backend.infrastructure.config.settings import MatPilotConfig

logger = get_logger("analysis_orchestrator")


class AnalysisOrchestrator:
    """
    Central orchestration service.

    Workflow:
        Upload
        ↓
        Validation
        ↓
        Parser
        ↓
        Create XRDExperiment
        ↓
        Create Analysis Job
        ↓
        Execute Analysis Pipeline
        ↓
        Generate Analysis Result
        ↓
        Generate Report
        ↓
        Store Results

    Every future scientific algorithm becomes one pipeline step.
    """

    def __init__(
        self,
        upload_service: UploadService,
        job_manager: JobManager,
        pipeline: AnalysisPipeline,
        storage_provider: IStorageProvider,
        config: MatPilotConfig
    ):
        self._upload_service = upload_service
        self._job_manager = job_manager
        self._pipeline = pipeline
        self._storage = StorageService(storage_provider)
        self._config = config
        self._logger = get_logger("analysis_orchestrator")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def process_upload(
        self,
        filename: str,
        content_type: str,
        file_data: bytes,
        user_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a file upload through the complete workflow.

        Steps:
        1. Upload & validate file
        2. Parse to XRDExperiment
        3. Store file
        4. Create analysis job
        5. Return upload result + job info
        """
        self._logger.info("Processing upload", filename=filename, size=len(file_data))

        # Step 1: Upload & validate
        upload_result = await self._upload_service.upload_file(
            filename=filename,
            content_type=content_type,
            file_data=file_data,
            user_metadata=user_metadata
        )

        if not upload_result.is_valid:
            self._logger.error(
                "Upload validation failed",
                filename=filename,
                errors=upload_result.validation.errors
            )
            return {
                "success": False,
                "stage": "upload",
                "file_id": upload_result.file_id,
                "errors": upload_result.validation.errors,
                "warnings": upload_result.validation.warnings
            }

        # Step 2: Store file
        storage_uri = await self._storage.store_upload(
            file_id=upload_result.file_id,
            data=file_data
        )

        # Step 3: Create analysis job
        job = self._job_manager.create_job(
            experiment_id=upload_result.experiment.id if upload_result.experiment else None,
            job_type="analysis",
            parameters={
                "file_id": upload_result.file_id,
                "filename": filename,
                "detected_format": upload_result.detected_format,
                "storage_uri": storage_uri
            },
            provider_preferences=user_metadata.get("provider_preferences", []) if user_metadata else []
        )

        self._logger.info(
            "Job created",
            job_id=job.job_id,
            file_id=upload_result.file_id,
            format=upload_result.detected_format
        )

        return {
            "success": True,
            "stage": "upload_complete",
            "file_id": upload_result.file_id,
            "job_id": job.job_id,
            "detected_format": upload_result.detected_format,
            "data_points": upload_result.experiment.data_points if upload_result.experiment else 0,
            "storage_uri": storage_uri,
            "metadata": upload_result.metadata,
            "validation": {
                "errors": upload_result.validation.errors,
                "warnings": upload_result.validation.warnings
            }
        }

    async def execute_analysis(self, job_id: str) -> Dict[str, Any]:
        """
        Execute the analysis pipeline for a job.

        This is the core orchestration method.
        It runs the pipeline steps and manages the job lifecycle.
        """
        job = self._job_manager.get_job(job_id)
        if not job:
            return {"success": False, "error": f"Job {job_id} not found"}

        self._job_manager.start_job(job_id)

        # Build pipeline context
        context = PipelineContext(
            job_id=job_id,
            experiment_id=job.experiment_id,
            file_id=job.parameters.get("file_id"),
            metadata=job.parameters
        )

        self._logger.info("Starting analysis pipeline", job_id=job_id)

        try:
            # Execute pipeline
            pipeline_result = await self._pipeline.execute(context)

            if pipeline_result["success"]:
                self._job_manager.complete_job(job_id, result_id=f"result_{job_id}")
                self._logger.info("Analysis completed", job_id=job_id)
            else:
                error_msg = "; ".join(pipeline_result.get("errors", ["Unknown pipeline error"]))
                self._job_manager.fail_job(job_id, error_msg)
                self._logger.error("Analysis failed", job_id=job_id, error=error_msg)

            return pipeline_result

        except Exception as exc:
            self._job_manager.fail_job(job_id, str(exc))
            self._logger.error("Analysis exception", job_id=job_id, error=str(exc))
            return {"success": False, "error": str(exc)}

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get complete job status including progress."""
        job = self._job_manager.get_job(job_id)
        if not job:
            return None
        return job.to_dict()

    def list_jobs(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List all jobs."""
        job_status = None
        if status:
            try:
                job_status = JobStatus[status.upper()]
            except KeyError:
                pass

        jobs = self._job_manager.list_jobs(status=job_status, limit=limit, offset=offset)
        return [j.to_dict() for j in jobs]

    async def cancel_job(self, job_id: str) -> Dict[str, Any]:
        """Cancel a running or queued job."""
        try:
            job = self._job_manager.cancel_job(job_id)
            return {"success": True, "job_id": job_id, "status": job.status.name}
        except ValueError as exc:
            return {"success": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # System status
    # ------------------------------------------------------------------

    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status."""
        all_jobs = self._job_manager.list_jobs()

        status_counts = {}
        for status in JobStatus:
            status_counts[status.name.lower()] = len(
                [j for j in all_jobs if j.status == status]
            )

        return {
            "system": "MatPilot",
            "version": self._config.version,
            "environment": self._config.environment,
            "timestamp": datetime.utcnow().isoformat(),
            "jobs": {
                "total": len(all_jobs),
                "by_status": status_counts
            },
            "pipeline": {
                "steps": [s.name for s in self._pipeline.steps],
                "enabled_steps": [s.name for s in self._pipeline.steps if s.enabled]
            },
            "storage": {
                "backend": self._config.storage.backend,
                "provider": self._storage.provider_name
            },
            "config": {
                "max_file_size_mb": self._config.upload.max_file_size_bytes / (1024 * 1024),
                "max_concurrent_jobs": self._config.analysis.max_concurrent_jobs,
                "supported_formats": self._config.upload.supported_extensions
            }
        }
