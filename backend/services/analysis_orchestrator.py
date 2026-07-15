
"""Analysis Orchestrator.

Central coordination service for all scientific workflows.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio

from backend.services.upload_service import UploadService, UploadResult
from backend.services.job_manager import JobManager, JobRecord, JobStatus
from backend.services.pipeline import AnalysisPipeline, PipelineContext
from backend.services.storage_service import StorageService
from backend.infrastructure.storage.storage_provider import IStorageProvider
from backend.infrastructure.logging.structured_logger import get_logger
from backend.infrastructure.config.settings import MatPilotConfig

logger = get_logger("analysis_orchestrator")


class AnalysisResultStore:
    """In-memory store for analysis results."""

    def __init__(self):
        self._results: Dict[str, Dict[str, Any]] = {}

    def store(self, job_id: str, result: Dict[str, Any]):
        self._results[job_id] = result

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self._results.get(job_id)

    def list_by_project(self, project_id: str) -> List[Dict[str, Any]]:
        return [r for r in self._results.values() if r.get("project_id") == project_id]


class AnalysisOrchestrator:
    """
    Central orchestration service.

    Coordinates: Upload → Validation → Parser → Job → Pipeline → Result → Store
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
        self._result_store = AnalysisResultStore()
        self._logger = get_logger("analysis_orchestrator")

    async def process_upload_and_analyze(
        self,
        filename: str,
        content_type: str,
        file_data: bytes,
        user_metadata: Optional[Dict[str, Any]] = None,
        project_id: Optional[str] = None,
        experiment_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process upload AND immediately start analysis pipeline.

        This is the main entry point for the scientific workflow:
        Upload → Parse → Create Job → Execute Pipeline → Return Results
        """
        upload_result = await self.process_upload(
            filename=filename,
            content_type=content_type,
            file_data=file_data,
            user_metadata=user_metadata,
            project_id=project_id,
        )

        if not upload_result["success"]:
            return upload_result

        job_id = upload_result["job_id"]
        file_id = upload_result["file_id"]

        asyncio.create_task(self._execute_pipeline_background(job_id, file_id))

        upload_result["analysis_started"] = True
        upload_result["analysis_job_id"] = job_id
        return upload_result

    async def _execute_pipeline_background(self, job_id: str, file_id: str):
        """Execute the analysis pipeline in background."""
        try:
            self._job_manager.update_progress(job_id, "parsing", 0.1, "Validating data...")
            await asyncio.sleep(0.05)

            self._job_manager.update_progress(job_id, "peak_detection", 0.3, "Detecting peaks...")
            await asyncio.sleep(0.05)

            self._job_manager.update_progress(job_id, "reference_search", 0.5, "Searching reference database...")
            result = await self.execute_analysis(job_id)

            if result["success"]:
                self._job_manager.update_progress(job_id, "report", 0.9, "Generating report...")
                await asyncio.sleep(0.05)

            self._job_manager.complete_job(job_id, result_id=f"result_{job_id}")
        except Exception as exc:
            self._logger.error("Background pipeline failed", job_id=job_id, error=str(exc))
            self._job_manager.fail_job(job_id, str(exc))

    async def process_upload(
        self,
        filename: str,
        content_type: str,
        file_data: bytes,
        user_metadata: Optional[Dict[str, Any]] = None,
        project_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process a file upload through the complete workflow."""
        self._logger.info("Processing upload", filename=filename, size=len(file_data))

        upload_result = await self._upload_service.upload_file(
            filename=filename,
            content_type=content_type,
            file_data=file_data,
            user_metadata=user_metadata
        )

        if not upload_result.is_valid:
            return {
                "success": False,
                "stage": "upload",
                "file_id": upload_result.file_id,
                "errors": upload_result.validation.errors,
                "warnings": upload_result.validation.warnings
            }

        storage_uri = await self._storage.store_upload(
            file_id=upload_result.file_id,
            data=file_data
        )

        job = self._job_manager.create_job(
            experiment_id=upload_result.experiment.id if upload_result.experiment else None,
            job_type="analysis",
            parameters={
                "file_id": upload_result.file_id,
                "filename": filename,
                "detected_format": upload_result.detected_format,
                "storage_uri": storage_uri,
                "project_id": project_id,
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
        """Execute the analysis pipeline for a job."""
        job = self._job_manager.get_job(job_id)
        if not job:
            return {"success": False, "error": f"Job {job_id} not found"}

        self._job_manager.start_job(job_id)

        context = PipelineContext(
            job_id=job_id,
            experiment_id=job.experiment_id,
            file_id=job.parameters.get("file_id"),
            metadata=job.parameters
        )

        try:
            upload_result = self._upload_service.get_upload(job.parameters.get("file_id"))
            if upload_result and upload_result.experiment:
                context.data["experiment"] = {
                    "two_theta": upload_result.experiment.two_theta,
                    "intensity": upload_result.experiment.intensity,
                    "wavelength": upload_result.experiment.wavelength.value_angstrom if upload_result.experiment.wavelength else None,
                }
        except Exception as exc:
            self._logger.warning("Could not load experiment data", job_id=job_id, error=str(exc))

        def progress_callback(step: str, progress: float, message: str):
            self._job_manager.update_progress(job_id, step, progress, message)

        pipeline_result = await self._pipeline.execute(context, progress_callback=progress_callback)

        if pipeline_result["success"]:
            self._result_store.store(job_id, {
                "job_id": job_id,
                "project_id": job.parameters.get("project_id"),
                "results": pipeline_result["results"],
                "completed_at": datetime.utcnow().isoformat(),
            })
            self._job_manager.complete_job(job_id, result_id=f"result_{job_id}")
        else:
            error_msg = "; ".join(pipeline_result.get("errors", ["Unknown error"]))
            self._job_manager.fail_job(job_id, error_msg)

        return pipeline_result

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = self._job_manager.get_job(job_id)
        if not job:
            return None
        d = job.to_dict()
        d["progress"] = round(job.progress.current_progress * 100, 1)
        d["current_step"] = job.progress.current_step
        d["error"] = job.progress.errors[-1] if job.progress.errors else None
        return d

    def list_jobs(
        self,
        status: Optional[str] = None,
        project_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        job_status = None
        if status:
            try:
                job_status = JobStatus[status.upper()]
            except KeyError:
                pass

        jobs = self._job_manager.list_jobs(status=job_status, limit=1000, offset=0)

        if project_id:
            jobs = [j for j in jobs if j.parameters.get("project_id") == project_id]

        result = []
        for j in jobs[offset:offset + limit]:
            d = j.to_dict()
            d["progress"] = round(j.progress.current_progress * 100, 1)
            d["current_step"] = j.progress.current_step
            d["error"] = j.progress.errors[-1] if j.progress.errors else None
            result.append(d)

        return result

    def get_result(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self._result_store.get(job_id)

    async def cancel_job(self, job_id: str) -> Dict[str, Any]:
        try:
            job = self._job_manager.cancel_job(job_id)
            return {"success": True, "job_id": job_id, "status": job.status.name}
        except ValueError as exc:
            return {"success": False, "error": str(exc)}

    def get_system_status(self) -> Dict[str, Any]:
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
