"""Tests for the technique-scoped instrument workspace API."""

import math

import pytest

from backend.main import create_app


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    return TestClient(create_app())


def _project(client, name="Instruments Test"):
    r = client.post("/projects", json={"name": name, "description": "test", "material": "Si"})
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


def _gaussian(centers, x_range=(400, 4000), n=1800, amplitude=0.8, width=15):
    xs = []
    ys = []
    for i in range(n):
        x = x_range[0] + (x_range[1] - x_range[0]) * i / (n - 1)
        y = sum(amplitude * math.exp(-0.5 * ((x - c) / width) ** 2) for c in centers)
        xs.append(round(x, 4))
        ys.append(round(y, 6))
    return xs, ys


def test_instruments_require_project(client):
    r = client.get("/projects/00000000-0000-0000-0000-000000000000/instruments")
    assert r.status_code == 404


def test_instruments_overview_counts(client):
    pid = _project(client)
    r = client.get(f"/projects/{pid}/instruments")
    assert r.status_code == 200
    body = r.json()
    assert {s["technique"] for s in body} == {"xrd", "ftir", "raman", "uvvis"}
    assert all(s["experiment_count"] == 0 for s in body)


def test_create_ftir_experiment_runs_auto_analysis(client):
    pid = _project(client)
    x, y = _gaussian([1740.0, 2925.0, 1455.0])
    r = client.post(
        f"/projects/{pid}/instruments/ftir/experiments",
        json={"name": "PET film", "material": "PET", "x": x, "y": y},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["technique"] == "ftir"
    assert body["status"] == "Analyzed"
    assert body["data_points"] == 1800
    assert body["has_results"] is True
    assert body["summary"]["peak_count"] >= 3
    assert body["x_range"] == [400.0, 4000.0]


def test_create_experiment_without_data(client):
    pid = _project(client)
    r = client.post(
        f"/projects/{pid}/instruments/raman/experiments",
        json={"name": "no data yet"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "Created"
    assert body["data_points"] == 0
    assert body["has_results"] is False


def test_list_experiments_is_technique_scoped(client):
    pid = _project(client)
    x, y = _gaussian([1740.0])
    client.post(f"/projects/{pid}/instruments/ftir/experiments",
                json={"name": "ftir one", "x": x, "y": y})
    client.post(f"/projects/{pid}/instruments/uvvis/experiments",
                json={"name": "uvvis one", "x": x, "y": y})

    r_ftir = client.get(f"/projects/{pid}/instruments/ftir/experiments")
    r_uvvis = client.get(f"/projects/{pid}/instruments/uvvis/experiments")
    assert [e["name"] for e in r_ftir.json()] == ["ftir one"]
    assert [e["name"] for e in r_uvvis.json()] == ["uvvis one"]


def _raman_si():
    x = [round(400 + i, 4) for i in range(200)]
    y = [round(10.0 * math.exp(-0.5 * ((v - 520.7) / 3.0) ** 2), 6) for v in x]
    return x, y


def test_set_data_then_analyze(client):
    pid = _project(client)
    r = client.post(f"/projects/{pid}/instruments/raman/experiments",
                    json={"name": "Si chip"})
    eid = r.json()["id"]

    x, y = _raman_si()
    r = client.post(f"/projects/{pid}/instruments/raman/experiments/{eid}/data",
                    json={"x": x, "y": y})
    assert r.status_code == 200
    assert r.json()["data_points"] == 200

    r = client.post(f"/projects/{pid}/instruments/raman/experiments/{eid}/analyze",
                    json={})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["results"]["matching"]["matches"][0]["material"] == "Silicon"


def test_analyze_without_data_returns_422(client):
    pid = _project(client)
    r = client.post(f"/projects/{pid}/instruments/uvvis/experiments",
                    json={"name": "empty"})
    eid = r.json()["id"]
    r = client.post(f"/projects/{pid}/instruments/uvvis/experiments/{eid}/analyze",
                    json={})
    assert r.status_code == 422


def test_data_validation_requires_equal_lengths(client):
    pid = _project(client)
    r = client.post(f"/projects/{pid}/instruments/ftir/experiments",
                    json={"name": "bad"})
    eid = r.json()["id"]
    r = client.post(f"/projects/{pid}/instruments/ftir/experiments/{eid}/data",
                    json={"x": [1, 2, 3], "y": [1, 2]})
    assert r.status_code == 422


def test_xrd_blocks_analyze_and_reference(client):
    pid = _project(client)
    r = client.post(f"/projects/{pid}/instruments/xrd/experiments",
                    json={"name": "xrd run"})
    eid = r.json()["id"]
    r = client.post(f"/projects/{pid}/instruments/xrd/experiments/{eid}/analyze",
                    json={})
    assert r.status_code == 422
    r = client.get(f"/projects/{pid}/instruments/xrd/reference/search")
    assert r.status_code == 404


def test_unknown_technique_returns_404(client):
    pid = _project(client)
    r = client.get(f"/projects/{pid}/instruments/edx/experiments")
    assert r.status_code == 404


def test_get_experiment_rejects_wrong_technique(client):
    pid = _project(client)
    r = client.post(f"/projects/{pid}/instruments/ftir/experiments",
                    json={"name": "ftir thing"})
    eid = r.json()["id"]
    r = client.get(f"/projects/{pid}/instruments/raman/experiments/{eid}")
    assert r.status_code == 404


def test_uvvis_summary_reports_band_gap(client):
    pid = _project(client)
    x = [round(250 + i, 4) for i in range(200)]
    y = [round(0.9 * math.exp(-0.5 * ((v - 350.0) / 20.0) ** 2), 6) for v in x]
    r = client.post(f"/projects/{pid}/instruments/uvvis/experiments",
                    json={"name": "absorbing film", "x": x, "y": y})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "Analyzed"
    assert isinstance(body["summary"]["direct_gap_eV"], float)
    assert isinstance(body["summary"]["indirect_gap_eV"], float)


def test_reference_providers_per_technique(client):
    pid = _project(client)
    r = client.get(f"/projects/{pid}/instruments/ftir/reference/providers")
    assert r.status_code == 200
    names = [p["name"] for p in r.json()["providers"]]
    assert "LocalSpectralLibrary" in names


def test_reference_search(client):
    pid = _project(client)
    r = client.get(f"/projects/{pid}/instruments/ftir/reference/search",
                   params={"query": "poly"})
    assert r.status_code == 200
    titles = [res["title"] for res in r.json()["results"]]
    assert "Polystyrene" in titles


def test_reference_match_uses_experiment_data(client):
    pid = _project(client)
    x, y = _raman_si()
    r = client.post(f"/projects/{pid}/instruments/raman/experiments",
                    json={"name": "Si chip", "x": x, "y": y})
    eid = r.json()["id"]
    r = client.post(f"/projects/{pid}/instruments/raman/reference/match",
                    json={"experiment_id": eid})
    assert r.status_code == 200
    matches = r.json()["matches"]
    assert matches[0]["reference"]["title"] == "Silicon"
    assert matches[0]["score"] == 100.0


def test_delete_experiment(client):
    pid = _project(client)
    r = client.post(f"/projects/{pid}/instruments/uvvis/experiments",
                    json={"name": "doomed"})
    eid = r.json()["id"]
    r = client.delete(f"/projects/{pid}/instruments/uvvis/experiments/{eid}")
    assert r.status_code == 200
    r = client.get(f"/projects/{pid}/instruments/uvvis/experiments/{eid}")
    assert r.status_code == 404


def test_workspace_report_aggregates_techniques(client):
    pid = _project(client, name="PET Study")
    x, y = _gaussian([1740.0, 2925.0])
    client.post(f"/projects/{pid}/instruments/ftir/experiments",
                json={"name": "PET film", "material": "PET", "x": x, "y": y})
    x2, y2 = _raman_si()
    client.post(f"/projects/{pid}/instruments/raman/experiments",
                json={"name": "Si wafer", "x": x2, "y": y2})

    r = client.get(f"/projects/{pid}/instruments/report")
    assert r.status_code == 200
    body = r.json()
    assert body["project"]["name"] == "PET Study"
    assert body["summary"]["experiment_count"] == 2
    assert body["summary"]["analyzed_count"] == 2
    techniques = {t["technique"] for t in body["techniques"]}
    assert techniques == {"ftir", "raman"}

    ftir = next(t for t in body["techniques"] if t["technique"] == "ftir")
    assert ftir["experiments"][0]["summary"]["peak_count"] >= 2
    assert any("C=O stretch" in f for f in ftir["experiments"][0]["findings"])

    raman = next(t for t in body["techniques"] if t["technique"] == "raman")
    assert raman["experiments"][0]["summary"]["top_match"]["material"] == "Silicon"
    assert any("Silicon" in f for f in raman["experiments"][0]["findings"])


def test_workspace_report_empty_project(client):
    pid = _project(client)
    r = client.get(f"/projects/{pid}/instruments/report")
    assert r.status_code == 200
    body = r.json()
    assert body["summary"] == {"experiment_count": 0, "analyzed_count": 0, "technique_count": 0}
    assert body["techniques"] == []


def test_workspace_report_download_txt(client):
    pid = _project(client)
    x, y = _gaussian([1740.0])
    client.post(f"/projects/{pid}/instruments/ftir/experiments",
                json={"name": "one", "x": x, "y": y})
    r = client.get(f"/projects/{pid}/instruments/report/download")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/plain")
    assert "attachment" in r.headers["content-disposition"]
    assert "MatPilot Workspace Report" in r.text
    assert "FTIR" in r.text
    assert "CONCLUSIONS" in r.text
    assert "REFERENCES" in r.text


def test_workspace_report_requires_project(client):
    r = client.get("/projects/00000000-0000-0000-0000-000000000000/instruments/report")
    assert r.status_code == 404


def test_interpret_returns_technique_interpretation(client):
    pid = _project(client)
    x, y = _gaussian([1740.0, 2925.0])
    r = client.post(f"/projects/{pid}/instruments/ftir/experiments",
                    json={"name": "PET film", "x": x, "y": y})
    eid = r.json()["id"]

    r = client.post(f"/projects/{pid}/instruments/ftir/experiments/{eid}/interpret",
                    json={})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["technique"] == "ftir"
    assert "FTIR" in body["interpretation"] or "functional" in body["interpretation"].lower()
    assert body["experiment_id"] == eid


def test_interpret_accepts_custom_question(client):
    pid = _project(client)
    x, y = _gaussian([1740.0])
    r = client.post(f"/projects/{pid}/instruments/ftir/experiments",
                    json={"name": "PET", "x": x, "y": y})
    eid = r.json()["id"]
    r = client.post(f"/projects/{pid}/instruments/ftir/experiments/{eid}/interpret",
                    json={"question": "Is carbonyl present?"})
    assert r.status_code == 200
    assert "carbonyl" in r.json()["interpretation"].lower() or r.json()["model"] == "none"


def test_interpret_rejects_wrong_technique(client):
    pid = _project(client)
    x, y = _raman_si()
    r = client.post(f"/projects/{pid}/instruments/raman/experiments",
                    json={"name": "Si", "x": x, "y": y})
    eid = r.json()["id"]
    r = client.post(f"/projects/{pid}/instruments/ftir/experiments/{eid}/interpret",
                    json={})
    assert r.status_code == 404


def test_interpret_without_analysis_uses_raw_data(client):
    pid = _project(client)
    x, y = _raman_si()
    r = client.post(f"/projects/{pid}/instruments/raman/experiments",
                    json={"name": "Si", "x": x, "y": y, "run_analysis": False})
    eid = r.json()["id"]
    r = client.post(f"/projects/{pid}/instruments/raman/experiments/{eid}/interpret",
                    json={})
    assert r.status_code == 200
    assert r.json()["technique"] == "raman"


def test_workspace_report_has_conclusions_references(client):
    pid = _project(client)
    x, y = _gaussian([1740.0])
    client.post(f"/projects/{pid}/instruments/ftir/experiments",
                json={"name": "one", "x": x, "y": y})
    r = client.get(f"/projects/{pid}/instruments/report")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["conclusions"], str)
    assert len(body["conclusions"]) > 0
    assert isinstance(body["references"], list)
    assert len(body["references"]) > 0
    assert body["ai_summary"] is None


def test_workspace_report_ai_summary_endpoint(client):
    pid = _project(client)
    x, y = _gaussian([1740.0])
    client.post(f"/projects/{pid}/instruments/ftir/experiments",
                json={"name": "one", "x": x, "y": y})
    r = client.post(f"/projects/{pid}/instruments/report/ai-summary")
    assert r.status_code == 200
    body = r.json()
    assert body["project_id"] == pid
    assert isinstance(body["ai_summary"], str)
    assert body["model"] == "none"  # no GROQ_API_KEY in test env


def test_workspace_report_ai_summary_empty_project(client):
    pid = _project(client)
    r = client.post(f"/projects/{pid}/instruments/report/ai-summary")
    assert r.status_code == 200
    assert isinstance(r.json()["ai_summary"], str)
