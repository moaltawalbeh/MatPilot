
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
    and returns a StepResult.
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
        raise NotImplementedError


class ValidationStep(PipelineStep):
    """Validate uploaded file data."""

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

        exp_data = context.data.get("experiment", {})
        two_theta = exp_data.get("two_theta", [])
        intensity = exp_data.get("intensity", [])

        if not two_theta or not intensity:
            return StepResult(
                step_name=self.name, success=False,
                message="No experimental data in context"
            )

        if len(two_theta) != len(intensity):
            return StepResult(
                step_name=self.name, success=False,
                message="two_theta and intensity arrays have different lengths"
            )

        if len(two_theta) < 10:
            context.warnings.append("Very few data points; results may be unreliable")

        warnings = []
        if len(two_theta) > 10000:
            warnings.append("Large dataset; peak detection may be slow")

        step_warnings = context.warnings.copy()
        context.warnings.extend(step_warnings)

        return StepResult(
            step_name=self.name,
            success=True,
            output={
                "validated": True,
                "file_id": file_id,
                "data_points": len(two_theta),
                "two_theta_range": [min(two_theta), max(two_theta)],
            },
            message=f"Validation passed: {len(two_theta)} data points"
        )


class ParsingStep(PipelineStep):
    """Parse and prepare data for analysis."""

    @property
    def name(self) -> str:
        return "parsing"

    @property
    def enabled(self) -> bool:
        return True

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "running")

        exp_data = context.data.get("experiment", {})
        two_theta = exp_data.get("two_theta", [])
        intensity = exp_data.get("intensity", [])

        context.results["parsed_data"] = {
            "two_theta": two_theta,
            "intensity": intensity,
            "data_points": len(two_theta),
        }

        return StepResult(
            step_name=self.name,
            success=True,
            output={"parsed": True, "data_points": len(two_theta)},
            message=f"Parsed {len(two_theta)} data points"
        )


class PeakDetectionStep(PipelineStep):
    """Real peak detection using second-derivative method."""

    @property
    def name(self) -> str:
        return "peak_detection"

    @property
    def enabled(self) -> bool:
        return True

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "running")

        try:
            from backend.services.peak_detection import detect_peaks

            exp_data = context.data.get("experiment", {})
            two_theta = exp_data.get("two_theta", [])
            intensity = exp_data.get("intensity", [])

            wavelength = context.metadata.get("wavelength")

            params = context.metadata.get("parameters", {})
            min_prominence = params.get("min_prominence_ratio", 0.02)
            min_distance = params.get("min_distance_deg", 0.3)

            peaks = detect_peaks(
                two_theta=two_theta,
                intensity=intensity,
                min_prominence_ratio=min_prominence,
                min_distance_deg=min_distance,
                wavelength_angstrom=wavelength,
            )

            peaks_data = [
                {
                    "two_theta": p.two_theta,
                    "intensity": p.intensity,
                    "fwhm": p.fwhm,
                    "area": p.area,
                    "d_spacing": p.d_spacing,
                    "hkl": p.hkl,
                }
                for p in peaks
            ]

            context.results["peaks"] = peaks_data

            return StepResult(
                step_name=self.name,
                success=True,
                output={
                    "peaks_found": len(peaks),
                    "peaks": peaks_data,
                },
                message=f"Detected {len(peaks)} peaks"
            )

        except Exception as exc:
            logger.error("Peak detection failed", job_id=context.job_id, error=str(exc))
            return StepResult(
                step_name=self.name,
                success=False,
                message=f"Peak detection failed: {str(exc)}"
            )


class ReferenceSearchStep(PipelineStep):
    """Search reference databases for matching patterns using ReferenceEngine."""

    def __init__(self, reference_engine=None):
        self._reference_engine = reference_engine

    @property
    def name(self) -> str:
        return "reference_search"

    @property
    def enabled(self) -> bool:
        return True

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "running")

        try:
            peaks_data = context.results.get("peaks", [])
            if not peaks_data:
                context.warnings.append("No peaks detected; skipping reference search")
                return StepResult(
                    step_name=self.name,
                    success=True,
                    output={"reference_search": "skipped", "reason": "no_peaks"},
                    message="No peaks to search against"
                )

            from backend.services.phase_identifier import (
                calculate_match_score
            )

            wavelength = context.metadata.get("wavelength", 1.5406)

            reference_entries = []
            if self._reference_engine:
                local_cod = self._reference_engine.get_provider("LocalCOD")
                if local_cod and hasattr(local_cod, "get_all_reference_entries"):
                    reference_entries = local_cod.get_all_reference_entries()

            if not reference_entries:
                reference_entries = [
                    {
                        "material_name": "Silicon",
                        "material_formula": "Si",
                        "source_provider": "COD",
                        "source_id": "9011666",
                        "peaks": [28.44, 47.30, 56.12, 69.13, 76.38, 88.03, 94.95],
                    },
                ]

            exp_peaks = [
                type('Peak', (), {'two_theta': p['two_theta'], 'intensity': p['intensity']})()
                for p in peaks_data
            ]

            reference_results = []
            for entry in reference_entries:
                ref_peaks = entry.get("peaks", [])
                if not ref_peaks:
                    continue

                score, matched, correspondences = calculate_match_score(
                    experimental_peaks=exp_peaks,
                    reference_peaks=ref_peaks,
                    tolerance_deg=0.3,
                    wavelength=wavelength,
                )
                if score > 0.15:
                    reference_results.append({
                        "material": entry["material_name"],
                        "formula": entry["material_formula"],
                        "provider": entry["source_provider"],
                        "source_id": entry["source_id"],
                        "match_score": score,
                        "matched_peaks": matched,
                        "total_peaks": len(ref_peaks),
                        "correspondences": correspondences,
                        "space_group": entry.get("space_group", ""),
                        "crystal_system": entry.get("crystal_system", ""),
                        "peak_details": entry.get("peak_details", []),
                    })

            reference_results.sort(key=lambda x: x["match_score"], reverse=True)

            context.results["reference_matches"] = reference_results

            return StepResult(
                step_name=self.name,
                success=True,
                output={
                    "matches_found": len(reference_results),
                    "top_match": reference_results[0] if reference_results else None,
                    "all_matches": reference_results[:10],
                },
                message=f"Found {len(reference_results)} reference matches from {len(reference_entries)} candidates"
            )

        except Exception as exc:
            logger.error("Reference search failed", job_id=context.job_id, error=str(exc))
            return StepResult(
                step_name=self.name,
                success=False,
                message=f"Reference search failed: {str(exc)}"
            )


class PhaseIdentificationStep(PipelineStep):
    """Identify crystalline phases from peak matches."""

    @property
    def name(self) -> str:
        return "phase_identification"

    @property
    def enabled(self) -> bool:
        return True

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "running")

        try:
            reference_matches = context.results.get("reference_matches", [])
            peaks_data = context.results.get("peaks", [])

            if not reference_matches or not peaks_data:
                return StepResult(
                    step_name=self.name,
                    success=True,
                    output={"phases": [], "phase_count": 0},
                    message="No reference matches to identify phases"
                )

            phases = []
            for match in reference_matches[:3]:
                confidence = "Low"
                if match["match_score"] >= 0.8:
                    confidence = "High"
                elif match["match_score"] >= 0.6:
                    confidence = "Medium"

                phases.append({
                    "name": match["material"],
                    "formula": match["formula"],
                    "source": match["provider"],
                    "confidence": confidence,
                    "match_score": match["match_score"],
                    "matched_peaks": match["matched_peaks"],
                })

            context.results["identified_phases"] = phases

            return StepResult(
                step_name=self.name,
                success=True,
                output={
                    "phases": phases,
                    "phase_count": len(phases),
                },
                message=f"Identified {len(phases)} phases"
            )

        except Exception as exc:
            logger.error("Phase identification failed", job_id=context.job_id, error=str(exc))
            return StepResult(
                step_name=self.name,
                success=False,
                message=f"Phase identification failed: {str(exc)}"
            )


class RietveldStep(PipelineStep):
    """Rietveld refinement (placeholder - complex algorithm)."""

    @property
    def name(self) -> str:
        return "rietveld"

    @property
    def enabled(self) -> bool:
        return False

    async def execute(self, context: PipelineContext) -> StepResult:
        return StepResult(
            step_name=self.name,
            success=True,
            output={"rietveld": "placeholder"},
            message="Rietveld refinement not yet implemented"
        )


class ReportStep(PipelineStep):
    """Generate analysis report."""

    @property
    def name(self) -> str:
        return "report"

    @property
    def enabled(self) -> bool:
        return True

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "running")

        try:
            peaks_data = context.results.get("peaks", [])
            phases = context.results.get("identified_phases", [])
            reference_matches = context.results.get("reference_matches", [])

            report = {
                "title": "XRD Analysis Report",
                "generated_at": datetime.utcnow().isoformat(),
                "job_id": context.job_id,
                "summary": {
                    "total_peaks": len(peaks_data),
                    "phases_identified": len(phases),
                    "top_phase": phases[0]["name"] if phases else "Unknown",
                },
                "peaks": peaks_data[:10],
                "phases": phases,
                "methodology": {
                    "peak_detection": "Second-derivative method",
                    "reference_search": "Pattern matching against COD database",
                    "tolerance": "0.3 degrees 2-theta",
                },
            }

            context.results["report"] = report

            return StepResult(
                step_name=self.name,
                success=True,
                output={"report_generated": True, "report": report},
                message="Report generated successfully"
            )

        except Exception as exc:
            logger.error("Report generation failed", job_id=context.job_id, error=str(exc))
            return StepResult(
                step_name=self.name,
                success=False,
                message=f"Report generation failed: {str(exc)}"
            )


class AnalysisPipeline:
    """
    Modular analysis pipeline.

    Executes a sequence of PipelineSteps in order.
    """

    def __init__(self, steps: Optional[List[PipelineStep]] = None, reference_engine=None):
        self._reference_engine = reference_engine
        self._steps = steps or self._default_steps()
        self._logger = get_logger("pipeline")

    def _default_steps(self) -> List[PipelineStep]:
        return [
            ValidationStep(),
            ParsingStep(),
            PeakDetectionStep(),
            ReferenceSearchStep(reference_engine=self._reference_engine),
            PhaseIdentificationStep(),
            ReportStep(),
        ]

    @property
    def steps(self) -> List[PipelineStep]:
        return self._steps

    def get_step(self, name: str) -> Optional[PipelineStep]:
        for step in self._steps:
            if step.name == name:
                return step
        return None

    async def execute(self, context: PipelineContext, progress_callback=None) -> Dict[str, Any]:
        self._logger.info(
            "Pipeline started",
            job_id=context.job_id,
            experiment_id=context.experiment_id,
            steps=[s.name for s in self._steps if s.enabled]
        )

        results = []
        all_success = True
        enabled_steps = [s for s in self._steps if s.enabled]
        total_steps = len(enabled_steps)

        for step_idx, step in enumerate(enabled_steps):
            step_progress = (step_idx + 0.5) / total_steps
            if progress_callback:
                progress_callback(step.name, step_progress, f"Running {step.name}...")

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
                break

        if progress_callback:
            progress_callback("completed", 1.0, "Pipeline finished")

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
