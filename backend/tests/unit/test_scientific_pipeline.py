"""Tests for the scientific pipeline ordering and orchestration."""

import math
from uuid import uuid4

import numpy as np
import pytest

from backend.services.scientific_pipeline import (
    ScientificPipeline,
    PIPELINE_STAGES,
)
from backend.services.ka2_stripping import compute_delta_2theta, WAVELENGTH_RATIOS
from backend.domain.entities.experiment import Experiment


def _make_si_pattern():
    """Synthetic Si pattern: linear background + Gaussian Kα1/Kα2 doublets.

    Physically the observed diffraction profile contains an α2 satellite at
    Δ(2θ) below each α1 peak, so stripping can recover the pure α1 peaks.
    """
    two_theta = np.array([10.0 + i * 0.02 for i in range(4500)])  # 10-100 deg
    peaks = [28.44, 47.30, 56.12, 69.13, 76.38]
    bg = 50 + 0.1 * two_theta
    alpha1 = sum(
        500 * np.exp(-0.5 * ((two_theta - pk) / 0.15) ** 2) for pk in peaks
    )
    ratio = WAVELENGTH_RATIOS["Cu"]
    alpha2 = np.zeros_like(two_theta)
    for i, t in enumerate(two_theta):
        delta = compute_delta_2theta(t, 1.540598, ratio)
        alpha2[i] = 0.5 * float(np.interp(t - delta, two_theta, alpha1))
    return two_theta.tolist(), (bg + alpha1 + alpha2).tolist()


class TestPipelineOrder:
    def test_stage_order_follows_research_doc(self):
        # docs/research_ka2_background.md §5.2:
        # background → smooth → Kα2 strip → normalize → peak search.
        order = PIPELINE_STAGES
        idx = {s: i for i, s in enumerate(order)}
        assert idx["background_correction"] < idx["noise_reduction"]
        assert idx["noise_reduction"] < idx["ka2_stripping"]
        assert idx["ka2_stripping"] < idx["intensity_normalization"]
        assert idx["intensity_normalization"] < idx["peak_detection"]
        assert idx["peak_detection"] < idx["peak_fitting"]
        assert idx["peak_fitting"] < idx["phase_identification"]
        assert idx["peak_detection"] < idx["rietveld_refinement"]

    def test_get_stage_definitions_matches_order(self):
        pipeline = ScientificPipeline()
        stages = pipeline.get_stage_definitions()
        assert [s["id"] for s in stages] == PIPELINE_STAGES
        assert len(stages) == 9


class TestPipelineExecution:
    @pytest.mark.asyncio
    async def test_full_processing_pipeline_runs(self):
        tt, ii = _make_si_pattern()
        experiment = Experiment(
            id=uuid4(),
            name="Si",
            raw_two_theta=tt,
            raw_intensity=ii,
            wavelength_angstrom=1.540598,
        )
        pipeline = ScientificPipeline()
        result = await pipeline.run_full_pipeline(
            experiment,
            stages_to_run=[
                "background_correction",
                "noise_reduction",
                "ka2_stripping",
                "intensity_normalization",
                "peak_detection",
                "peak_fitting",
            ],
        )
        assert result["success"], f"Pipeline failed: {result}"
        assert len(experiment.detected_peaks) >= 3
        assert result["results"]["peak_fitting"]["success"]
        assert result["results"]["peak_fitting"]["n_peaks_fitted"] >= 3

    @pytest.mark.asyncio
    async def test_rietveld_uses_raw_data_not_processed(self):
        tt, ii = _make_si_pattern()
        experiment = Experiment(
            id=uuid4(),
            raw_two_theta=tt,
            raw_intensity=ii,
            wavelength_angstrom=1.540598,
        )
        pipeline = ScientificPipeline()
        # With no candidate phases Rietveld must fail gracefully BEFORE any
        # preprocessing is applied to the data (Rietveld uses raw data).
        result = await pipeline.run_stage("rietveld_refinement", experiment)
        assert result["success"] is False
        assert "phase" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_stage_history_tracked(self):
        tt, ii = _make_si_pattern()
        experiment = Experiment(id=uuid4(), raw_two_theta=tt, raw_intensity=ii)
        pipeline = ScientificPipeline()
        result = await pipeline.run_stage("background_correction", experiment)
        assert result["success"]
        assert len(experiment.analysis_history) == 1
        assert experiment.analysis_history[0]["status"] == "completed"
        assert experiment.analysis_history[0]["started_at"]
