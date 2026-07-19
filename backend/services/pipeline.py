
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

        if len(two_theta) > 10000:
            context.warnings.append("Large dataset; peak detection may be slow")

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

            wavelength = exp_data.get("wavelength")

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
    """
    Search reference databases for matching patterns using ReferenceEngine.

    Sprint 6: Full pipeline integration:
    1. Try real COD API search → download CIF → generate theoretical pattern → compare
    2. Fall back to local 50-material database if COD is unreachable
    """

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

            wavelength = context.metadata.get("wavelength", 1.5406)

            # ── Strategy 1: Use ReferenceEngine.identify_phases (real COD API) ──
            if self._reference_engine and hasattr(self._reference_engine, "identify_phases"):
                try:
                    # Build search query from metadata or filename
                    filename = context.metadata.get("filename", "")
                    query = filename.replace(".xy", "").replace(".raw", "").replace(".xrdml", "").replace(".csv", "").replace(".txt", "")
                    if not query:
                        query = context.metadata.get("formula", "")

                    logger.info(f"Attempting COD API search with query: {query}")

                    sim_results = await self._reference_engine.identify_phases(
                        experimental_peaks=peaks_data,
                        query=query,
                        limit=30,
                        max_two_theta=120.0,
                    )

                    if sim_results:
                        reference_results = []
                        for sr in sim_results:
                            if sr.match_score > 0.1:
                                reference_results.append({
                                    "material": sr.material_name,
                                    "formula": sr.material_formula,
                                    "provider": sr.source_provider,
                                    "source_id": sr.source_id,
                                    "match_score": sr.match_score,
                                    "matched_peaks": sr.matched_peaks,
                                    "total_peaks": sr.total_reference_peaks,
                                    "fom": sr.fom,
                                    "rmse_2theta": sr.rmse_2theta,
                                    "cosine_similarity": sr.cosine_similarity,
                                    "confidence": sr.confidence,
                                    "theoretical_peaks": sr.theoretical_peaks,
                                    "correspondences": sr.correspondences,
                                })

                        context.results["reference_matches"] = reference_results

                        # Store theoretical patterns for overlay display
                        top_patterns = []
                        for sr in sim_results[:5]:
                            if sr.theoretical_peaks:
                                top_patterns.append({
                                    "material": sr.material_name,
                                    "formula": sr.material_formula,
                                    "source_id": sr.source_id,
                                    "peaks": sr.theoretical_peaks,
                                    "match_score": sr.match_score,
                                })
                        context.results["theoretical_patterns"] = top_patterns

                        return StepResult(
                            step_name=self.name,
                            success=True,
                            output={
                                "matches_found": len(reference_results),
                                "top_match": reference_results[0] if reference_results else None,
                                "all_matches": reference_results[:10],
                                "source": "cod_api",
                            },
                            message=f"Found {len(reference_results)} reference matches via COD API"
                        )
                except Exception as cod_exc:
                    logger.warning(f"COD API search failed, falling back to local: {cod_exc}")

            # ── Strategy 2: Fallback to local database ──
            logger.info("Using local COD database for reference search")

            from backend.services.phase_identifier import calculate_match_score

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
                    "source": "local_database",
                },
                message=f"Found {len(reference_results)} reference matches from {len(reference_entries)} local candidates"
            )

        except Exception as exc:
            logger.error("Reference search failed", job_id=context.job_id, error=str(exc))
            return StepResult(
                step_name=self.name,
                success=False,
                message=f"Reference search failed: {str(exc)}"
            )


class PhaseIdentificationStep(PipelineStep):
    """Identify crystalline phases from peak matches, including theoretical patterns."""

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
            for match in reference_matches[:5]:
                confidence = match.get("confidence", "Low")
                if confidence == "Low" and not match.get("confidence"):
                    if match["match_score"] >= 0.8:
                        confidence = "High"
                    elif match["match_score"] >= 0.6:
                        confidence = "Medium"

                phase = {
                    "name": match["material"],
                    "formula": match["formula"],
                    "source": match["provider"],
                    "source_id": match.get("source_id", ""),
                    "confidence": confidence,
                    "match_score": match["match_score"],
                    "matched_peaks": match["matched_peaks"],
                    "total_peaks": match.get("total_peaks", 0),
                }

                # Include similarity metrics if available (Sprint 6)
                if "fom" in match:
                    phase["fom"] = match["fom"]
                if "rmse_2theta" in match:
                    phase["rmse_2theta"] = match["rmse_2theta"]
                if "cosine_similarity" in match:
                    phase["cosine_similarity"] = match["cosine_similarity"]
                if "theoretical_peaks" in match:
                    phase["theoretical_peaks"] = match["theoretical_peaks"]
                if "space_group" in match:
                    phase["space_group"] = match["space_group"]
                if "crystal_system" in match:
                    phase["crystal_system"] = match["crystal_system"]

                phases.append(phase)

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
    """Rietveld refinement using scipy least-squares."""

    @property
    def name(self) -> str:
        return "rietveld"

    @property
    def enabled(self) -> bool:
        return True

    async def execute(self, context: PipelineContext) -> StepResult:
        logger.log_pipeline(context.job_id, self.name, "running")

        try:
            import numpy as np
            from backend.services.rietveld_service import RietveldService

            two_theta = context.results.get("parsed_data", {}).get("two_theta", [])
            intensity = context.results.get("parsed_data", {}).get("intensity", [])

            if not two_theta or len(two_theta) < 10:
                return StepResult(
                    step_name=self.name,
                    success=False,
                    message="Insufficient data points for Rietveld refinement",
                )

            identified_phases = context.results.get("identified_phases", [])
            reference_matches = context.results.get("reference_matches", [])

            phase_cifs = []
            for phase in identified_phases[:5]:
                parsed_data = phase.get("parsed_data")
                if parsed_data:
                    phase_dict = dict(parsed_data)
                    cif_content = phase.get("_cif_content")
                    if cif_content:
                        phase_dict["_cif_content"] = cif_content
                    theoretical = phase.get("theoretical_peaks") or phase.get("_theoretical_peaks")
                    if theoretical:
                        phase_dict["_theoretical_peaks"] = theoretical
                    phase_cifs.append(phase_dict)

            if not phase_cifs and reference_matches:
                for match in reference_matches[:5]:
                    parsed_data = match.get("parsed_data")
                    if parsed_data:
                        phase_cifs.append(dict(parsed_data))

            if not phase_cifs:
                return StepResult(
                    step_name=self.name,
                    success=False,
                    message="No phase CIF data available for refinement",
                )

            wavelength = context.metadata.get("wavelength", 1.5406)
            rietveld = RietveldService(wavelength=wavelength)

            result = rietveld.refine(
                two_theta_obs=np.array(two_theta),
                intensity_obs=np.array(intensity),
                phase_cifs=phase_cifs,
                wavelength=wavelength,
            )

            if not result.success:
                return StepResult(
                    step_name=self.name,
                    success=False,
                    message=result.message,
                )

            context.results["rietveld"] = {
                "r_wp": result.r_wp,
                "r_p": result.r_p,
                "r_exp": result.r_exp,
                "chi_squared": result.chi_squared,
                "gof": result.gof,
                "iterations": result.iterations,
                "phases_used": result.phases_used,
                "patterns": {
                    "two_theta": result.two_theta,
                    "observed": result.observed,
                    "calculated": result.calculated,
                    "difference": result.difference,
                    "background": result.background,
                },
            }

            return StepResult(
                step_name=self.name,
                success=True,
                output=context.results["rietveld"],
                message=f"Rietveld completed: Rwp={result.r_wp:.2f}%, GoF={result.gof:.4f}",
            )

        except Exception as exc:
            logger.error("Rietveld step failed: %s", exc, exc_info=True)
            return StepResult(
                step_name=self.name,
                success=False,
                message=f"Rietveld failed: {str(exc)}",
            )


class ReportStep(PipelineStep):
    """Generate analysis report with theoretical patterns and CIF metadata."""

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
            theoretical_patterns = context.results.get("theoretical_patterns", [])

            report = {
                "title": "XRD Analysis Report",
                "generated_at": datetime.utcnow().isoformat(),
                "job_id": context.job_id,
                "summary": {
                    "total_peaks": len(peaks_data),
                    "phases_identified": len(phases),
                    "top_phase": phases[0]["name"] if phases else "Unknown",
                    "top_formula": phases[0].get("formula", "") if phases else "",
                    "top_match_score": phases[0].get("match_score", 0) if phases else 0,
                    "top_confidence": phases[0].get("confidence", "Unknown") if phases else "Unknown",
                    "reference_source": reference_matches[0].get("provider", "unknown") if reference_matches else "unknown",
                },
                "peaks": peaks_data[:20],
                "phases": phases,
                "theoretical_patterns": theoretical_patterns,
                "methodology": {
                    "peak_detection": "Second-derivative method",
                    "reference_search": "Pattern matching against COD database (API + local)",
                    "tolerance": "0.3 degrees 2-theta",
                    "wavelength": "Cu K-alpha (1.5406 A)",
                    "similarity_metrics": "FOM, RMSE, cosine similarity, combined score",
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
