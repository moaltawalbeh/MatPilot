"""Phase Identification Service.

Orchestrates the complete phase identification workflow:
1. Retrieve experimental pattern from the upload registry
2. Run peak detection
3. Search reference engine (COD + local DB)
4. Auto-download candidate CIF files
5. Generate theoretical patterns
6. Compute similarity scores
7. Rank candidates
8. Store all results on the Experiment entity
"""

import logging
from typing import Dict, Any, List, Optional
from uuid import UUID

from backend.reference.engine.reference_engine import ReferenceEngine
from backend.services.peak_detection import detect_peaks
from backend.services.upload_service import UploadService

logger = logging.getLogger("phase_identification_service")


class PhaseIdentificationService:
    """Runs the full phase identification pipeline for an experiment."""

    def __init__(
        self,
        reference_engine: ReferenceEngine,
        upload_service: UploadService,
    ):
        self._ref_engine = reference_engine
        self._upload_service = upload_service

    async def run_phase_identification(
        self,
        experiment,
        query: str = "",
        elements: Optional[List[str]] = None,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Execute the full phase identification workflow.

        Args:
            experiment: The Experiment entity (must have primary_file_id).
            query: Optional search formula or text (e.g. "LaB6").
            elements: Optional element filter (e.g. ["La", "B"]).
            limit: Max candidates to process.

        Returns:
            dict with keys: success, candidate_phases, cif_files, message
        """
        file_id = experiment.primary_file_id
        two_theta = None
        intensity = None
        wavelength = experiment.wavelength_angstrom or 1.5406

        # Try upload registry first
        if file_id:
            upload_record = self._upload_service.get_upload(file_id)
            if upload_record and upload_record.experiment:
                parsed = upload_record.experiment
                two_theta = list(parsed.two_theta)
                intensity = list(parsed.intensity)
                wavelength = parsed.wavelength.value_angstrom if parsed.wavelength else wavelength

        # Fallback: use raw data stored on the experiment entity
        if not two_theta or not intensity:
            raw_tt = getattr(experiment, "raw_two_theta", None)
            raw_int = getattr(experiment, "raw_intensity", None)
            if raw_tt and raw_int:
                two_theta = list(raw_tt)
                intensity = list(raw_int)

        if not two_theta or not intensity:
            return {"success": False, "message": "No parsed data available for this experiment"}

        logger.info(
            "Phase ID started: %d points, wavelength=%.4f, query=%r",
            len(two_theta), wavelength, query,
        )

        # Step 1: Peak detection
        peaks = detect_peaks(
            two_theta=two_theta,
            intensity=intensity,
            wavelength_angstrom=wavelength,
        )
        peak_dicts = [
            {"two_theta": p.two_theta, "intensity": p.intensity, "d_spacing": p.d_spacing}
            for p in peaks
        ]
        logger.info("Detected %d peaks", len(peak_dicts))

        if not peak_dicts:
            return {
                "success": False,
                "message": "No peaks detected in experimental pattern",
                "candidate_phases": [],
                "cif_files": [],
            }

        # Step 2: Search + download + compare via reference engine
        similarity_results = await self._ref_engine.identify_phases(
            experimental_peaks=peak_dicts,
            query=query,
            elements=elements,
            limit=limit,
        )

        # Step 3: Build candidate list and CIF file list
        candidate_phases = []
        cif_files = []

        for rank, sim in enumerate(similarity_results, 1):
            candidate = {
                "rank": rank,
                "material_name": sim.material_name,
                "material_formula": sim.material_formula,
                "source_id": sim.source_id,
                "source_provider": sim.source_provider,
                "match_score": round(sim.match_score, 4),
                "fom": round(sim.fom, 4) if sim.fom else None,
                "rmse_2theta": round(sim.rmse_2theta, 4) if sim.rmse_2theta else None,
                "cosine_similarity": round(sim.cosine_similarity, 4) if sim.cosine_similarity else None,
                "confidence": sim.confidence,
                "matched_peaks": sim.matched_peaks,
                "total_experimental_peaks": sim.total_experimental_peaks,
                "total_reference_peaks": sim.total_reference_peaks,
                "peak_fraction": round(sim.peak_fraction, 4) if sim.peak_fraction else None,
                "theoretical_peaks": sim.theoretical_peaks[:50] if sim.theoretical_peaks else [],
            }
            candidate_phases.append(candidate)

            # Track CIF file with parsed data for Rietveld
            if sim.source_id:
                if sim.source_provider == "LocalCOD":
                    local_entry = None
                    local_provider = self._ref_engine._providers.get("LocalCOD")
                    if local_provider and hasattr(local_provider, "get_all_reference_entries"):
                        for e in local_provider.get_all_reference_entries():
                            if e.get("source_id") == sim.source_id:
                                local_entry = e
                                break
                    cif_entry = {
                        "cod_id": sim.source_id,
                        "material_name": sim.material_name,
                        "material_formula": sim.material_formula,
                        "source_provider": "LocalCOD",
                        "downloaded": True,
                        "used_for_phase_id": True,
                        "parsed_data": {
                            "formula": sim.material_formula,
                            "name": sim.material_name,
                            "space_group": local_entry.get("space_group", "") if local_entry else "",
                            "_theoretical_peaks": sim.theoretical_peaks if sim.theoretical_peaks else [],
                        },
                        "_cif_content": None,
                    }
                    existing_ids = {c["cod_id"] for c in cif_files}
                    if sim.source_id not in existing_ids:
                        cif_files.append(cif_entry)
                else:
                    # Retrieve parsed CIF data and raw content from cache (async to avoid blocking)
                    parsed_cif = await self._ref_engine.get_parsed_cif_async(sim.source_id)
                    cif_content = await self._ref_engine.get_or_download_cif_async(sim.source_id)
                    cif_entry = {
                        "cod_id": sim.source_id,
                        "material_name": sim.material_name,
                        "material_formula": sim.material_formula,
                        "source_provider": sim.source_provider,
                        "downloaded": True,
                        "used_for_phase_id": True,
                        "parsed_data": parsed_cif,
                        "_cif_content": cif_content,
                    }
                    # Check if already in list
                    existing_ids = {c["cod_id"] for c in cif_files}
                    if sim.source_id not in existing_ids:
                        cif_files.append(cif_entry)

        result = {
            "success": True,
            "candidate_phases": candidate_phases,
            "cif_files": cif_files,
            "peaks_detected": len(peak_dicts),
            "peaks": peak_dicts,
            "candidates_searched": len(similarity_results),
            "query": query,
            "elements": elements,
            "message": f"Phase identification complete: {len(candidate_phases)} candidates from {len(similarity_results)} sources",
        }

        logger.info(
            "Phase ID complete: %d candidates, %d CIF files",
            len(candidate_phases), len(cif_files),
        )

        return result
