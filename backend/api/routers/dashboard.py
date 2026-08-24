"""Dashboard API endpoints."""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.api.dependencies import get_container

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStatsResponse(BaseModel):
    project_count: int
    experiment_count: int
    sample_count: int
    measurement_count: int
    structure_count: int
    collection_count: int
    pending_jobs: int
    completed_jobs: int
    recent_activities_count: int


class TechniqueStat(BaseModel):
    technique: str
    display_name: str
    count: int
    completed: int
    pending: int


class RecentSpectrumItem(BaseModel):
    id: str
    technique: str
    name: str
    filename: str
    sample_id: Optional[str]
    data_points: int
    has_results: bool
    created_at: str


class CharacterizationDashboardResponse(BaseModel):
    techniques: List[TechniqueStat]
    total_spectra: int
    completed_spectra: int
    pending_spectra: int
    samples_covered: int
    recent_spectra: List[RecentSpectrumItem]


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(container=Depends(get_container)):
    from backend.api.routers.samples import _samples
    from backend.api.routers.measurements import _measurements
    from backend.api.routers.structures import _structures
    from backend.api.routers.collections import _collections
    from backend.api.routers.activities import _activities

    project_count = 0
    experiment_count = 0
    try:
        project_count = len(await container.uow.projects.get_all())
        experiment_count = len(await container.uow.experiments.get_all())
    except Exception:
        pass

    jobs = container.analysis_orchestrator.list_jobs()
    pending_jobs = sum(
        1 for j in jobs if j.get("status") in ("queued", "running")
    )
    completed_jobs = sum(
        1 for j in jobs if j.get("status") == "completed"
    )

    return DashboardStatsResponse(
        project_count=project_count,
        experiment_count=experiment_count,
        sample_count=len(_samples),
        measurement_count=len(_measurements),
        structure_count=len(_structures),
        collection_count=len(_collections),
        pending_jobs=pending_jobs,
        completed_jobs=completed_jobs,
        recent_activities_count=len(_activities),
    )


@router.get("/characterization", response_model=CharacterizationDashboardResponse)
async def get_characterization_dashboard():
    """Aggregate spectroscopy activity for the Materials Characterization
    dashboard: per-technique counts plus a recent-activity feed."""
    from backend.services.spectroscopy_service import (
        TECHNIQUE_CONFIGS,
        TECHNIQUES,
        get_spectra_store,
    )

    store = get_spectra_store()
    techniques: List[TechniqueStat] = []
    recent: List[RecentSpectrumItem] = []
    total = completed = pending = 0
    samples = set()

    for technique in TECHNIQUES:
        records = list(store[technique].values())
        done = sum(1 for r in records if r.results is not None)
        total += len(records)
        completed += done
        pending += len(records) - done
        samples.update(r.sample_id for r in records if r.sample_id)
        techniques.append(
            TechniqueStat(
                technique=technique,
                display_name=TECHNIQUE_CONFIGS[technique].display_name,
                count=len(records),
                completed=done,
                pending=len(records) - done,
            )
        )
        for r in records:
            recent.append(
                RecentSpectrumItem(
                    id=r.id,
                    technique=r.technique,
                    name=r.name,
                    filename=r.filename,
                    sample_id=r.sample_id,
                    data_points=len(r.x),
                    has_results=r.results is not None,
                    created_at=r.created_at,
                )
            )

    recent.sort(key=lambda r: r.created_at, reverse=True)

    return CharacterizationDashboardResponse(
        techniques=techniques,
        total_spectra=total,
        completed_spectra=completed,
        pending_spectra=pending,
        samples_covered=len(samples),
        recent_spectra=recent[:25],
    )
