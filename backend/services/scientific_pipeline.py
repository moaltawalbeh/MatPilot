"""Scientific Processing Pipeline.

Orchestrates the complete scientific workflow for an experiment:

  Upload → Background Correction → Ka2 Stripping → Noise Reduction →
  Intensity Normalization → Peak Detection → Phase Identification →
  Reference Search → CIF Download → Candidate Selection → Rietveld Refinement

Every stage consumes the output of the previous stage.
All stages are tracked on the Experiment entity as processing history.
"""

import logging
import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger("scientific_pipeline")


@dataclass
class PipelineStage:
    """A single completed processing stage."""
    stage_id: str
    name: str
    status: str  # "pending", "running", "completed", "failed", "skipped"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_seconds: Optional[float] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


# Ordered list of all pipeline stages
PIPELINE_STAGES = [
    "background_correction",
    "ka2_stripping",
    "noise_reduction",
    "intensity_normalization",
    "peak_detection",
    "phase_identification",
    "candidate_selection",
    "rietveld_refinement",
]


class ScientificPipeline:
    """Orchestrates the complete scientific processing workflow.

    Each stage takes the output of the previous stage as input.
    The pipeline tracks all completed stages for display in the UI.
    """

    def __init__(
        self,
        reference_engine=None,
        upload_service=None,
    ):
        self._ref_engine = reference_engine
        self._upload_service = upload_service

    def get_stage_definitions(self) -> List[Dict[str, Any]]:
        """Return the ordered list of pipeline stages with display info."""
        stage_info = {
            "background_correction": {
                "name": "Background Correction",
                "description": "Estimate and subtract diffraction background",
                "icon": "Layers",
            },
            "ka2_stripping": {
                "name": "Ka2 Stripping",
                "description": "Remove Ka2 contribution from X-ray source",
                "icon": "Zap",
            },
            "noise_reduction": {
                "name": "Noise Reduction",
                "description": "Smooth noise while preserving peak shapes",
                "icon": "Activity",
            },
            "intensity_normalization": {
                "name": "Intensity Normalization",
                "description": "Normalize intensities to standard scale",
                "icon": "BarChart2",
            },
            "peak_detection": {
                "name": "Peak Detection",
                "description": "Identify diffraction peaks in the pattern",
                "icon": "Search",
            },
            "phase_identification": {
                "name": "Phase Identification",
                "description": "Search COD database for matching crystal phases",
                "icon": "Database",
            },
            "candidate_selection": {
                "name": "Candidate Selection",
                "description": "Select candidate phases for refinement",
                "icon": "CheckSquare",
            },
            "rietveld_refinement": {
                "name": "Rietveld Refinement",
                "description": "Full-profile least-squares refinement",
                "icon": "Target",
            },
        }

        return [
            {
                "id": stage_id,
                **stage_info.get(stage_id, {"name": stage_id, "description": "", "icon": "Circle"}),
            }
            for stage_id in PIPELINE_STAGES
        ]

    async def run_stage(
        self,
        stage_id: str,
        experiment,
        stage_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Run a single pipeline stage.

        Args:
            stage_id: The stage identifier (e.g., "background_correction").
            experiment: The Experiment entity.
            stage_params: Optional parameters for this stage.

        Returns:
            Dict with keys: success, outputs, message.
        """
        params = stage_params or {}
        start_time = datetime.utcnow()

        logger.info("Running pipeline stage: %s for experiment %s", stage_id, experiment.id)

        try:
            if stage_id == "background_correction":
                result = await self._run_background_correction(experiment, params)
            elif stage_id == "ka2_stripping":
                result = await self._run_ka2_stripping(experiment, params)
            elif stage_id == "noise_reduction":
                result = await self._run_noise_reduction(experiment, params)
            elif stage_id == "intensity_normalization":
                result = await self._run_normalization(experiment, params)
            elif stage_id == "peak_detection":
                result = await self._run_peak_detection(experiment, params)
            elif stage_id == "phase_identification":
                result = await self._run_phase_identification(experiment, params)
            elif stage_id == "candidate_selection":
                result = await self._run_candidate_selection(experiment, params)
            elif stage_id == "rietveld_refinement":
                result = await self._run_rietveld(experiment, params)
            else:
                result = {"success": False, "message": f"Unknown stage: {stage_id}"}

            elapsed = (datetime.utcnow() - start_time).total_seconds()

            # Record in experiment history
            stage_record = {
                "id": stage_id,
                "stage_id": stage_id,
                "name": stage_id.replace("_", " ").title(),
                "description": "",
                "icon": "",
                "status": "completed" if result["success"] else "failed",
                "started_at": start_time.isoformat(),
                "completed_at": datetime.utcnow().isoformat(),
                "duration_seconds": round(elapsed, 2),
                "parameters": params,
                "outputs": {k: v for k, v in result.items() if k != "message"},
                "error": result.get("message") if not result["success"] else None,
            }
            experiment.analysis_history.append(stage_record)
            experiment.touch()

            return result

        except Exception as e:
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            logger.error("Pipeline stage %s failed: %s", stage_id, e)

            stage_record = {
                "stage_id": stage_id,
                "name": stage_id.replace("_", " ").title(),
                "status": "failed",
                "started_at": start_time.isoformat(),
                "completed_at": datetime.utcnow().isoformat(),
                "duration_seconds": round(elapsed, 2),
                "parameters": params,
                "outputs": {},
                "error": str(e),
            }
            experiment.analysis_history.append(stage_record)
            experiment.touch()

            return {"success": False, "message": str(e)}

    STAGES_THAT_STOP_PIPELINE = set()  # Empty = never stop early, always run all requested stages

    async def run_full_pipeline(
        self,
        experiment,
        stages_to_run: Optional[List[str]] = None,
        stage_params: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Run the complete pipeline (or selected stages).

        Non-critical failures (phase_identification, candidate_selection, rietveld_refinement)
        are recorded but do not stop the pipeline. Critical signal-processing failures DO stop it.

        Args:
            experiment: The Experiment entity.
            stages_to_run: Optional list of stages to run. If None, run all.
            stage_params: Optional per-stage parameters.

        Returns:
            Dict with success, completed_stages, results.
        """
        if stages_to_run is None:
            stages_to_run = PIPELINE_STAGES.copy()

        params_map = stage_params or {}
        completed = []
        results = {}

        for stage_id in stages_to_run:
            result = await self.run_stage(
                stage_id=stage_id,
                experiment=experiment,
                stage_params=params_map.get(stage_id, {}),
            )
            results[stage_id] = result
            completed.append(stage_id)

            if not result["success"] and stage_id in self.STAGES_THAT_STOP_PIPELINE:
                logger.warning(
                    "Pipeline stopped at critical stage %s: %s",
                    stage_id, result.get("message", "Unknown error"),
                )
                break
            elif not result["success"]:
                logger.info(
                    "Pipeline stage %s failed (non-critical, continuing): %s",
                    stage_id, result.get("message", "Unknown error"),
                )

        n_ok = sum(1 for r in results.values() if r["success"])
        return {
            "success": n_ok > 0,
            "completed_stages": completed,
            "results": results,
        }

    def _get_current_pattern(self, experiment):
        """Get the current processed pattern from the experiment.

        Returns (two_theta, intensity) arrays from the most recent
        processing step, or from the original upload.
        """
        # Check if there's a processed pattern stored
        processed = getattr(experiment, "_processed_pattern", None)
        if processed:
            return (
                np.array(processed["two_theta"]),
                np.array(processed["intensity"]),
            )

        # Fall back to original upload (in-memory registry)
        if self._upload_service and experiment.primary_file_id:
            record = self._upload_service.get_upload(experiment.primary_file_id)
            if record and record.experiment:
                return (
                    np.array(record.experiment.two_theta),
                    np.array(record.experiment.intensity),
                )

        # Fall back to raw data stored on the experiment entity
        raw_tt = getattr(experiment, "raw_two_theta", None)
        raw_int = getattr(experiment, "raw_intensity", None)
        if raw_tt and raw_int:
            return (
                np.array(raw_tt),
                np.array(raw_int),
            )

        return np.array([]), np.array([])

    def _store_processed_pattern(self, experiment, two_theta, intensity):
        """Store the current processed pattern on the experiment."""
        experiment._processed_pattern = {
            "two_theta": two_theta.tolist(),
            "intensity": intensity.tolist(),
        }

    def _get_wavelength(self, experiment):
        """Get the X-ray wavelength from the experiment."""
        if self._upload_service and experiment.primary_file_id:
            record = self._upload_service.get_upload(experiment.primary_file_id)
            if record and record.experiment and record.experiment.wavelength:
                return record.experiment.wavelength.value_angstrom
        return experiment.wavelength_angstrom or 1.5406

    # ─── Stage Implementations ─────────────────────────────────────

    async def _run_background_correction(self, experiment, params):
        from backend.services.background_correction import correct_background

        tt, ii = self._get_current_pattern(experiment)
        if len(tt) == 0:
            return {
                "success": False,
                "message": "No pattern data available for background correction. "
                           "Ensure the experiment has uploaded diffraction data.",
            }

        try:
            result = correct_background(
                two_theta=tt.tolist(),
                intensity=ii.tolist(),
                polynomial_order=params.get("polynomial_order", 6),
                max_iterations=params.get("max_iterations", 50),
            )

            self._store_processed_pattern(
                experiment,
                np.array(result.two_theta),
                np.array(result.intensity_corrected),
            )

            return {
                "success": True,
                "message": f"Background correction completed in {result.iterations} iterations",
                "background": result.background,
                "polynomial_coeffs": result.polynomial_coeffs,
                "iterations_used": result.iterations,
            }
        except Exception as e:
            logger.error("Background correction failed: %s", e)
            return {
                "success": False,
                "message": f"Background correction failed: {e}. "
                           "Check that the input data has sufficient points for polynomial fitting.",
            }

    async def _run_ka2_stripping(self, experiment, params):
        from backend.services.ka2_stripping import strip_ka2

        tt, ii = self._get_current_pattern(experiment)
        if len(tt) == 0:
            return {"success": False, "message": "No pattern data available"}

        wavelength = self._get_wavelength(experiment)
        # Determine element from wavelength
        element = params.get("element", "Cu")
        if wavelength > 1.7 and wavelength < 1.8:
            element = "Co"
        elif wavelength > 1.9 and wavelength < 2.0:
            element = "Fe"
        elif wavelength > 2.2 and wavelength < 2.4:
            element = "Cr"

        result = strip_ka2(
            two_theta=tt.tolist(),
            intensity=ii.tolist(),
            element=element,
            wavelength=wavelength,
        )

        self._store_processed_pattern(
            experiment,
            np.array(result.two_theta),
            np.array(result.intensity_stripped),
        )

        return {
            "success": True,
            "message": f"Ka2 stripping completed (element={element})",
            "delta_2theta": result.delta_2theta,
            "ka2_component": result.ka2_component,
        }

    async def _run_noise_reduction(self, experiment, params):
        from backend.services.noise_reduction import reduce_noise

        tt, ii = self._get_current_pattern(experiment)
        if len(tt) == 0:
            return {"success": False, "message": "No pattern data available"}

        result = reduce_noise(
            two_theta=tt.tolist(),
            intensity=ii.tolist(),
            window_size=params.get("window_size", 11),
            polynomial_order=params.get("polynomial_order", 3),
        )

        self._store_processed_pattern(
            experiment,
            np.array(result.two_theta),
            np.array(result.intensity_smoothed),
        )

        return {
            "success": True,
            "message": f"Noise reduction completed (window={result.window_size})",
        }

    async def _run_normalization(self, experiment, params):
        from backend.services.intensity_normalization import normalize_max

        tt, ii = self._get_current_pattern(experiment)
        if len(tt) == 0:
            return {"success": False, "message": "No pattern data available"}

        method = params.get("method", "max")
        if method == "area":
            from backend.services.intensity_normalization import normalize_area
            result = normalize_area(tt.tolist(), ii.tolist())
        elif method == "reference_peak":
            from backend.services.intensity_normalization import normalize_to_peak
            result = normalize_to_peak(
                tt.tolist(), ii.tolist(),
                reference_2theta=params.get("reference_2theta", 28.44),
            )
        else:
            result = normalize_max(tt.tolist(), ii.tolist())

        self._store_processed_pattern(
            experiment,
            np.array(result.two_theta),
            np.array(result.intensity_normalized),
        )

        return {
            "success": True,
            "message": f"Intensity normalization completed (method={result.method})",
            "scale_factor": result.scale_factor,
        }

    async def _run_peak_detection(self, experiment, params):
        from backend.services.peak_detection import detect_peaks

        tt, ii = self._get_current_pattern(experiment)
        if len(tt) == 0:
            return {
                "success": False,
                "message": "No pattern data available for peak detection. "
                           "Ensure previous processing stages completed successfully.",
            }

        wavelength = self._get_wavelength(experiment)

        try:
            peaks = detect_peaks(
                two_theta=tt.tolist(),
                intensity=ii.tolist(),
                wavelength_angstrom=wavelength,
                min_prominence_ratio=params.get("min_prominence_ratio", 0.02),
                min_distance_deg=params.get("min_distance_deg", 0.3),
            )

            peak_dicts = [
                {
                    "two_theta": p.two_theta,
                    "intensity": p.intensity,
                    "d_spacing": p.d_spacing,
                    "fwhm": p.fwhm if hasattr(p, "fwhm") else None,
                    "area": p.area if hasattr(p, "area") else None,
                }
                for p in peaks
            ]

            # Store detected peaks on experiment
            experiment.detected_peaks = peak_dicts

            return {
                "success": True,
                "message": f"Detected {len(peak_dicts)} peaks (wavelength={wavelength:.4f} A)",
                "peaks": peak_dicts,
                "peak_count": len(peak_dicts),
            }
        except Exception as e:
            logger.error("Peak detection failed: %s", e)
            return {
                "success": False,
                "message": f"Peak detection failed: {e}. "
                           "Try adjusting min_prominence_ratio or min_distance_deg parameters.",
            }

    async def _run_phase_identification(self, experiment, params):
        if not self._ref_engine:
            return {"success": False, "message": "Reference engine not available — skipping phase identification"}

        try:
            from backend.services.phase_identification_service import PhaseIdentificationService
            service = PhaseIdentificationService(
                reference_engine=self._ref_engine,
                upload_service=self._upload_service,
            )

            result = await service.run_phase_identification(
                experiment=experiment,
                query=params.get("query", ""),
                elements=params.get("elements"),
                limit=params.get("limit", 20),
            )

            if result.get("success"):
                experiment.candidate_phases = result["candidate_phases"]
                existing_cif_ids = {c["cod_id"] for c in experiment.cif_files}
                for cif in result["cif_files"]:
                    if cif["cod_id"] not in existing_cif_ids:
                        experiment.cif_files.append(cif)
                return result
            else:
                return result
        except Exception as e:
            logger.warning("Phase identification failed (non-critical): %s", e)
            return {"success": False, "message": f"Phase identification unavailable: {e}"}

    async def _run_candidate_selection(self, experiment, params):
        """Auto-select top candidates based on match score."""
        candidates = experiment.candidate_phases
        if not candidates:
            return {"success": False, "message": "No candidate phases available"}

        # Select candidates above a threshold
        threshold = params.get("score_threshold", 0.3)
        min_candidates = params.get("min_candidates", 1)
        max_candidates = params.get("max_candidates", 5)

        selected = [
            c for c in candidates
            if c.get("match_score", 0) >= threshold
        ]

        if len(selected) < min_candidates:
            selected = candidates[:min_candidates]

        selected = selected[:max_candidates]

        experiment.selected_refinement_phases = selected

        return {
            "success": True,
            "message": f"Selected {len(selected)} candidate phases for refinement",
            "selected_phases": selected,
        }

    async def _run_rietveld(self, experiment, params):
        """Run Rietveld refinement using selected phases.

        Uses the ORIGINAL raw diffraction data (not the processed pattern)
        because Rietveld refinement works best with raw counts.
        """
        import numpy as np
        from backend.services.rietveld_service import RietveldService

        raw_tt = getattr(experiment, "raw_two_theta", None)
        raw_int = getattr(experiment, "raw_intensity", None)
        if raw_tt and raw_int and len(raw_tt) > 10:
            tt = np.array(raw_tt)
            ii = np.array(raw_int)
        else:
            tt, ii = self._get_current_pattern(experiment)

        if len(tt) == 0:
            return {
                "success": False,
                "message": "No pattern data available for Rietveld. "
                           "Ensure previous processing stages completed successfully.",
            }

        if len(tt) < 10:
            return {
                "success": False,
                "message": f"Insufficient data points ({len(tt)}) for refinement. "
                           "At least 10 data points are required.",
            }

        wavelength = self._get_wavelength(experiment)

        selected = experiment.selected_refinement_phases
        if not selected:
            selected = (experiment.candidate_phases or [])[:3]

        if not selected:
            return {
                "success": False,
                "message": "No phases available for refinement. "
                           "Run phase identification first to identify candidate phases.",
            }

        cif_lookup = {c["cod_id"]: c for c in (experiment.cif_files or [])}

        phase_cifs = []
        for phase_entry in selected:
            cod_id = phase_entry.get("source_id") or phase_entry.get("cod_id", "")

            parsed_data = phase_entry.get("parsed_data")

            if not parsed_data and cod_id and cod_id in cif_lookup:
                parsed_data = cif_lookup[cod_id].get("parsed_data")

            if not parsed_data and cod_id and self._ref_engine:
                try:
                    parsed_data = await self._ref_engine.get_parsed_cif_async(cod_id)
                except Exception:
                    pass

            if not parsed_data:
                continue

            phase_dict = dict(parsed_data)

            cif_content = phase_entry.get("_cif_content")
            if not cif_content and cod_id and cod_id in cif_lookup:
                cif_content = cif_lookup[cod_id].get("_cif_content")
            if not cif_content and cod_id:
                provider = phase_entry.get("source_provider", "")
                if provider != "LocalCOD" and self._ref_engine:
                    try:
                        cif_content = await self._ref_engine.get_or_download_cif_async(cod_id)
                    except Exception:
                        pass

            if cif_content:
                phase_dict["_cif_content"] = cif_content

            phase_cifs.append(phase_dict)

        if not phase_cifs:
            return {
                "success": False,
                "message": f"Could not load CIF data for any of the {len(selected)} selected phases. "
                           "Phases may not have parsed crystal structure data. "
                           "Try uploading CIF files manually or selecting different phases.",
            }

        rietveld_svc = RietveldService(wavelength=wavelength)
        try:
            refinement_result = rietveld_svc.refine(
                two_theta_obs=tt,
                intensity_obs=ii,
                phase_cifs=phase_cifs,
                wavelength=wavelength,
            )
        except Exception as e:
            logger.error("Rietveld refinement failed with exception: %s", e, exc_info=True)
            return {
                "success": False,
                "message": f"Rietveld refinement crashed: {e}. "
                           "This may indicate incompatible CIF data or insufficient pattern coverage.",
            }

        if not refinement_result.success:
            return {
                "success": False,
                "message": f"Rietveld refinement failed: {refinement_result.message}",
            }

        params_r = refinement_result.parameters
        rietveld_result = {
            "status": "completed",
            "message": refinement_result.message,
            "r_wp": refinement_result.r_wp,
            "r_p": refinement_result.r_p,
            "r_exp": refinement_result.r_exp,
            "chi_squared": refinement_result.chi_squared,
            "gof": refinement_result.gof,
            "iterations": refinement_result.iterations,
            "parameters": {
                "scale": params_r.scale if params_r else None,
                "zero_shift": params_r.zero_shift if params_r else None,
                "background_coeffs": params_r.background_coeffs if params_r else [],
                "U": params_r.U if params_r else None,
                "V": params_r.V if params_r else None,
                "W": params_r.W if params_r else None,
                "phase_fractions": params_r.phase_fractions if params_r else [],
            },
            "patterns": {
                "two_theta": refinement_result.two_theta,
                "observed": refinement_result.observed,
                "calculated": refinement_result.calculated,
                "difference": refinement_result.difference,
                "background": refinement_result.background,
            },
            "phases_used": refinement_result.phases_used,
            "bragg_markers": refinement_result.bragg_markers,
            "refinement_history": refinement_result.refinement_history,
        }

        experiment.rietveld_results = rietveld_result
        experiment.status = "Refined"

        return {
            "success": True,
            "message": refinement_result.message,
            "rietveld_results": rietveld_result,
        }
