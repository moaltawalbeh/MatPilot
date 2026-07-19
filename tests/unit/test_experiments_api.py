"""Tests for the experiments API endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import create_app
from uuid import uuid4


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_get_experiment_not_found(client):
    resp = await client.get(f"/experiments/{uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_phase_identification_no_experiment(client):
    resp = await client.post(
        f"/experiments/{uuid4()}/phase-identification",
        json={"query": "LaB6"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_rietveld_no_experiment(client):
    resp = await client.post(
        f"/experiments/{uuid4()}/rietveld",
        json={"workflow": "auto", "selected_cif_ids": []},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cif_upload_no_experiment(client):
    resp = await client.post(
        f"/experiments/{uuid4()}/cifs",
        files=[("files", ("test.cif", b"data", "chemical/x-cif"))],
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_cifs_no_experiment(client):
    resp = await client.get(f"/experiments/{uuid4()}/cifs")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_phase_identification_on_real_experiment(client):
    """Create a project + upload a file, then run phase identification.

    Mocks external COD network calls to avoid hangs.
    """
    from unittest.mock import AsyncMock, patch

    # Create a real project first
    proj_resp = await client.post(
        "/projects",
        json={"name": "Test Project", "description": "test", "material": "Si"},
    )
    assert proj_resp.status_code in (200, 201)
    project_id = proj_resp.json()["id"]

    # Upload a real XRD file with enough points and a clear peak for detection
    import math
    lines = []
    for i in range(200):
        angle = 10.0 + i * 0.1
        # Gaussian peak at 25 degrees
        intensity = 100 + 2000 * math.exp(-0.5 * ((angle - 25.0) / 0.3) ** 2)
        lines.append(f"{angle:.4f} {intensity:.1f}")
    xy_data = "\n".join(lines).encode("utf-8")

    upload_resp = await client.post(
        "/upload",
        files=[("file", ("test.xy", xy_data, "text/plain"))],
        data={"project_id": project_id},
    )
    assert upload_resp.status_code == 200
    upload_result = upload_resp.json()
    experiment_id = upload_result.get("experiment_id")
    assert experiment_id is not None

    # Mock external COD search to avoid network calls; local DB fallback will run
    with patch(
        "backend.reference.engine.reference_engine.ReferenceEngine.search",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.post(
            f"/experiments/{experiment_id}/phase-identification",
            json={"query": "Si", "limit": 5},
        )
    assert resp.status_code == 200
    result = resp.json()
    assert result["success"] is True
    assert "candidate_phases" in result
    assert "cif_files" in result
    assert isinstance(result["candidate_phases"], list)


@pytest.mark.asyncio
async def test_experiment_detail_after_upload(client):
    """Upload creates experiment, then GET returns full details."""
    proj_resp = await client.post(
        "/projects",
        json={"name": "Test Project", "description": "test", "material": "Si"},
    )
    project_id = proj_resp.json()["id"]

    xy_data = b"20.0 50\n20.5 100\n21.0 200\n"

    upload_resp = await client.post(
        "/upload",
        files=[("file", ("si.xy", xy_data, "text/plain"))],
        data={"project_id": project_id},
    )
    assert upload_resp.status_code == 200
    experiment_id = upload_resp.json().get("experiment_id")

    resp = await client.get(f"/experiments/{experiment_id}")
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["id"] == experiment_id
    assert detail["has_pattern_data"] is True
    assert detail["data_points"] == 3
    assert detail["candidate_phases"] == []
    assert detail["cif_files"] == []
    assert detail["analysis_history"] == []
    assert detail["rietveld_results"] is None


@pytest.mark.asyncio
async def test_rietveld_validates_workflow(client, app):
    """Rietveld requires valid workflow and selected phases."""
    proj_resp = await client.post(
        "/projects",
        json={"name": "Test Project", "description": "test", "material": "Si"},
    )
    project_id = proj_resp.json()["id"]

    xy_data = b"20.0 50\n20.5 100\n21.0 200\n"

    upload_resp = await client.post(
        "/upload",
        files=[("file", ("test.xy", xy_data, "text/plain"))],
        data={"project_id": project_id},
    )
    experiment_id = upload_resp.json().get("experiment_id")

    # Invalid workflow
    resp = await client.post(
        f"/experiments/{experiment_id}/rietveld",
        json={"workflow": "invalid"},
    )
    assert resp.status_code == 400

    # Auto workflow without selected_cif_ids
    resp = await client.post(
        f"/experiments/{experiment_id}/rietveld",
        json={"workflow": "auto", "selected_cif_ids": []},
    )
    assert resp.status_code == 400
