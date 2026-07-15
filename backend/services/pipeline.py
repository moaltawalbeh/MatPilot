
"""Modular Pipeline System.

Every scientific workflow step implements PipelineStep.
Steps can be enabled, disabled, or replaced.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.infrastructure.logging.structured_logger import get_logger

logger = get_logger("pipeline")


@dataclass
class PipelineContext:
    """Shared context passed between pipeline steps."""
    job_id: str
    experiment_id: Optional[str] = None
    file_id: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    results: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class StepResult:
    """Result of a single pipeline step."""
    step_name: str
    success: bool
    output: Dict[str, Any] = field(default_factory=dict)
    message: str = ""
    duration_seconds: float = 0.0


class PipelineStep(ABC):
    """
    Interface for every pipeline step.

    Each step receives the shared context, performs its work,
    and returns a StepResult. The step never modifies the
    context directly; it returns output that the pipeline
    merges into the context.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def enabled(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def execute(self, context: PipelineContext) -> StepResult:
        """
        Execute the step.

        Args:
            context: Shared pipeline context

        Returns:
            StepResult with success flag and output data
        """
        raise NotImplementedError


class ValidationStep(PipelineStep):
    """Validate uploaded file."""

    @property
    def name(self) -> str:
        return "validation"

    @property
    def enabled(self) -> bool:
        return True

    async def execute(self, context: PipelineContext) -> StepResult:
        file_id = context.file_id
        if not file_id:
            return StepResult(step_name=self.name, success=False, message="No file_id in context")

        logger.log_pipeline(context.job_id, self.name, "running")

        # Validation logic would go here
        # For now, placeholder
        return StepResult(
            step_name=self.name,
            success=True,
            output={"validated": True, "file_id": file_id},
            message="File validation passed (placeholder)"
        )


class ParsingStep(PipelineStep):
    """Parse file to XRDExperiment."""

    @property
    def name(self) -> str:
        return "parsing"

    @property
    def enabled(self) -> bool:
        return True

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "running")

        # Parsing logic would go here
        # For now, placeholder
        return StepResult(
            step_name=self.name,
            success=True,
            output={"parsed": True, "experiment_id": context.experiment_id},
            message="File parsed to XRDExperiment (placeholder)"
        )


class ReferenceSearchStep(PipelineStep):
    """Search reference databases (placeholder)."""

    @property
    def name(self) -> str:
        return "reference_search"

    @property
    def enabled(self) -> bool:
        return False  # Disabled by default until implemented

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "skipped")
        return StepResult(
            step_name=self.name,
            success=True,
            output={"reference_search": "skipped"},
            message="Reference search step (placeholder - skipped)"
        )


class PeakDetectionStep(PipelineStep):
    """Peak detection (placeholder)."""

    @property
    def name(self) -> str:
        return "peak_detection"

    @property
    def enabled(self) -> bool:
        return False

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "skipped")
        return StepResult(
            step_name=self.name,
            success=True,
            output={"peak_detection": "skipped"},
            message="Peak detection step (placeholder - skipped)"
        )


class PhaseIdentificationStep(PipelineStep):
    """Phase identification (placeholder)."""

    @property
    def name(self) -> str:
        return "phase_identification"

    @property
    def enabled(self) -> bool:
        return False

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "skipped")
        return StepResult(
            step_name=self.name,
            success=True,
            output={"phase_identification": "skipped"},
            message="Phase identification step (placeholder - skipped)"
        )


class RietveldStep(PipelineStep):
    """Rietveld refinement (placeholder)."""

    @property
    def name(self) -> str:
        return "rietveld"

    @property
    def enabled(self) -> bool:
        return False

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "skipped")
        return StepResult(
            step_name=self.name,
            success=True,
            output={"rietveld": "skipped"},
            message="Rietveld refinement step (placeholder - skipped)"
        )


class ReportStep(PipelineStep):
    """Report generation (placeholder)."""

    @property
    def name(self) -> str:
        return "report"

    @property
    def enabled(self) -> bool:
        return False

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "skipped")
        return StepResult(
            step_name=self.name,
            success=True,
            output={"report": "skipped"},
            message="Report generation step (placeholder - skipped)"
        )


class AnalysisPipeline:
    """
    Modular analysis pipeline.

    Executes a sequence of PipelineSteps in order.
    Each step can be enabled or disabled via configuration.
    """

    def __init__(self, steps: Optional[List[PipelineStep]] = None):
        self._steps = steps or self._default_steps()
        self._logger = get_logger("pipeline")

    def _default_steps(self) -> List[PipelineStep]:
        return [
            ValidationStep(),
            ParsingStep(),
            ReferenceSearchStep(),
            PeakDetectionStep(),
            PhaseIdentificationStep(),
            RietveldStep(),
            ReportStep()
        ]

    @property
    def steps(self) -> List[PipelineStep]:
        return self._steps

    def get_step(self, name: str) -> Optional[PipelineStep]:
        """Get a step by name."""
        for step in self._steps:
            if step.name == name:
                return step
        return None

    def enable_step(self, name: str) -> bool:
        """Enable a step by name."""
        step = self.get_step(name)
        if step:
            # Note: enabled is a property, we'd need to redesign for mutable
            # For now, this is a placeholder
            return True
        return False

    def disable_step(self, name: str) -> bool:
        """Disable a step by name."""
        step = self.get_step(name)
        if step:
            return True
        return False

    async def execute(self, context: PipelineContext) -> Dict[str, Any]:
        """
        Execute the full pipeline.

        Args:
            context: Shared pipeline context

        Returns:
            Final results dictionary
        """
        self._logger.info(
            "Pipeline started",
            job_id=context.job_id,
            experiment_id=context.experiment_id,
            steps=[s.name for s in self._steps if s.enabled]
        )

        results = []
        all_success = True

        for step in self._steps:
            if not step.enabled:
                self._logger.info("Step skipped", job_id=context.job_id, step=step.name)
                continue

            try:
                result = await step.execute(context)
                results.append(result)
                context.results[step.name] = result.output

                if not result.success:
                    all_success = False
                    context.errors.append(f"Step {step.name} failed: {result.message}")
                    break

            except Exception as exc:
                all_success = False
                context.errors.append(f"Step {step.name} exception: {str(exc)}")
                self._logger.error(
                    "Pipeline step failed",
                    job_id=context.job_id,
                    step=step.name,
                    error=str(exc)
                )
                break

        self._logger.info(
            "Pipeline finished",
            job_id=context.job_id,
            success=all_success,
            steps_executed=len(results)
        )

        return {
            "success": all_success,
            "job_id": context.job_id,
            "results": context.results,
            "errors": context.errors,
            "warnings": context.warnings,
            "step_results": [
                {
                    "step": r.step_name,
                    "success": r.success,
                    "message": r.message,
                    "duration_seconds": r.duration_seconds
                }
                for r in results
            ]
        }
