"""Tests for the spectroscopy module (FTIR / Raman / UV-Vis)."""

import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, ".")
from backend.main import create_app

FTIR_CSV = """# Wavenumber (cm-1): Absorbance
# instrument: PerkinElmer Spectrum Two
# resolution: 4
4000 0.02
3600 0.03
3500 0.08
3400 0.05
3200 0.04
2950 0.25
2920 0.35
2850 0.28
1750 0.12
1650 0.55
1600 0.6
1550 0.4
1200 0.3
1100 0.5
1000 0.35
900 0.2
800 0.15
"""


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app())


def _upload(client, technique="ftir", sample_id=None, content=FTIR_CSV):
    data = {}
    if sample_id:
        data["sample_id"] = sample_id
    return client.post(
        f"/spectroscopy/{technique}/upload",
        files={"file": ("sample.csv", content.encode(), "text/csv")},
        data=data,
    )


def test_spectroscopy_summary_returns_all_techniques(client):
    r = client.get("/spectroscopy/summary")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 0
    assert {t["technique"] for t in body["techniques"]} == {"ftir", "raman", "uvvis"}


def test_upload_ftir_spectrum(client):
    r = _upload(client)
    assert r.status_code == 200
    body = r.json()
    assert body["data_points"] == 17
    assert body["spectrum"]["technique"] == "ftir"
    assert body["spectrum"]["name"] == "sample.csv"
    assert body["spectrum"]["data_points"] == 17


def test_upload_parses_header_metadata(client):
    r = _upload(client)
    spectrum_id = r.json()["spectrum"]["id"]
    detail = client.get(f"/spectroscopy/ftir/{spectrum_id}").json()
    assert detail["metadata"]["instrument"] == "PerkinElmer Spectrum Two"
    assert detail["x_unit"] == "cm⁻¹"
    assert len(detail["x"]) == len(detail["y"]) == 17


def test_upload_raman_and_uvvis(client):
    r_raman = _upload(client, "raman", content=FTIR_CSV)
    assert r_raman.status_code == 200
    assert r_raman.json()["spectrum"]["technique"] == "raman"
    r_uv = _upload(client, "uvvis", content=FTIR_CSV)
    assert r_uv.status_code == 200
    assert r_uv.json()["spectrum"]["technique"] == "uvvis"


def test_upload_invalid_technique(client):
    r = client.post(
        "/spectroscopy/sem/upload",
        files={"file": ("a.csv", b"1 2\n3 4", "text/csv")},
    )
    assert r.status_code == 404


def test_upload_garbage_file_rejected(client):
    r = client.post(
        "/spectroscopy/ftir/upload",
        files={"file": ("bad.txt", b"hello world not numeric", "text/plain")},
    )
    assert r.status_code == 422


def test_analyze_spectrum_detects_peaks_and_assignments(client):
    r = _upload(client)
    spectrum_id = r.json()["spectrum"]["id"]
    a = client.post(f"/spectroscopy/ftir/{spectrum_id}/analyze", json={"window": 5})
    assert a.status_code == 200
    body = a.json()
    assert body["success"] is True
    assert body["results"]["stats"]["peak_count"] >= 1
    assert body["results"]["peaks"][0]["position"] > 0
    assert len(body["history"]) == 1


def test_analyze_links_results_to_spectrum(client):
    r = _upload(client)
    spectrum_id = r.json()["spectrum"]["id"]
    client.post(f"/spectroscopy/ftir/{spectrum_id}/analyze", json={})
    detail = client.get(f"/spectroscopy/ftir/{spectrum_id}").json()
    assert detail["has_results"] is True
    assert detail["peaks"]
    assert detail["processed_y"] is not None
    assert detail["baseline"] is not None


def test_report_requires_analysis(client):
    r = _upload(client)
    spectrum_id = r.json()["spectrum"]["id"]
    rep = client.post(f"/spectroscopy/ftir/{spectrum_id}/report")
    assert rep.status_code == 422
    client.post(f"/spectroscopy/ftir/{spectrum_id}/analyze", json={})
    rep = client.post(f"/spectroscopy/ftir/{spectrum_id}/report")
    assert rep.status_code == 200
    assert "Detected Peaks" in rep.json()["markdown"]


def test_spectra_linked_to_sample_and_dashboard(client):
    s = client.post("/samples", json={"name": "TiO2", "material": "TiO2"})
    sample_id = s.json()["id"]
    r = _upload(client, sample_id=sample_id)
    spectrum_id = r.json()["spectrum"]["id"]

    by_sample = client.post(f"/spectroscopy/by-sample/{sample_id}")
    assert by_sample.status_code == 200
    assert by_sample.json()["total"] == 1

    # Mirrored into the measurements store for sample-centric aggregation.
    measurements = client.get(f"/measurements?sample_id={sample_id}").json()
    assert any(m["id"] == spectrum_id for m in measurements)

    dash = client.get("/dashboard/characterization").json()
    assert dash["total_spectra"] >= 1
    assert any(t["technique"] == "ftir" and t["count"] >= 1 for t in dash["techniques"])


def test_delete_spectrum(client):
    r = _upload(client)
    spectrum_id = r.json()["spectrum"]["id"]
    d = client.delete(f"/spectroscopy/ftir/{spectrum_id}")
    assert d.status_code == 200
    assert client.get(f"/spectroscopy/ftir/{spectrum_id}").status_code == 404


def test_list_spectra_filter_by_sample(client):
    s = client.post("/samples", json={"name": "ZnO", "material": "ZnO"})
    sample_id = s.json()["id"]
    _upload(client, sample_id=sample_id)
    listed = client.get(f"/spectroscopy/ftir?sample_id={sample_id}").json()
    assert listed["total"] == 1
    empty = client.get("/spectroscopy/raman?sample_id=does-not-exist").json()
    assert empty["total"] == 0
