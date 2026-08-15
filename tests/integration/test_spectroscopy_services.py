"""Integration tests for FTIR, Raman, and UV-Vis spectroscopy services and API endpoints."""

import pytest
import numpy as np
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.ftir_service import FTIRService
from backend.services.raman_service import RamanService
from backend.services.uv_vis_service import UVVisService


@pytest.mark.asyncio
async def test_ftir_service_process_and_report():
    service = FTIRService()
    wavenumbers = [400.0, 1050.0, 1720.0, 2950.0, 3400.0, 4000.0]
    intensities = [0.1, 0.8, 0.95, 0.7, 0.85, 0.05]

    res = await service.process_spectrum(wavenumbers, intensities, baseline_method="linear", min_peak_prominence=0.1)
    assert "wavenumbers" in res
    assert "peaks" in res
    assert len(res["peaks"]) > 0
    # Verify carbonyl (C=O around 1720) or alcohol/OH around 3400 detected
    group_names = [p["functional_group"] for p in res["peaks"]]
    assert any("C=O" in g or "O-H" in g or "C-O" in g for g in group_names)

    report = await service.generate_ftir_report("Polystyrene Standard", wavenumbers, intensities, res)
    assert report["sample_name"] == "Polystyrene Standard"
    assert "summary_text" in report


@pytest.mark.asyncio
async def test_raman_service_process_and_ratios():
    service = RamanService()
    # Simulate carbon D and G peaks around 1350 and 1580 cm^-1 separated by valleys
    shifts = [1000.0, 1200.0, 1350.0, 1450.0, 1580.0, 1800.0, 2700.0]
    intensities = [10.0, 20.0, 80.0, 25.0, 100.0, 15.0, 50.0]

    res = await service.process_spectrum(shifts, intensities, baseline_method="none", min_peak_prominence=10.0)
    assert "raman_shifts" in res
    assert "peaks" in res
    assert len(res["peaks"]) >= 2
    # Check that D band and G band were recognized
    modes = [p["assigned_mode"] for p in res["peaks"]]
    assert any("D Band" in m for m in modes)
    assert any("G Band" in m for m in modes)
    # Check ID/IG ratio calculated
    assert "ID_IG" in res["ratios"]
    assert res["ratios"]["ID_IG"]["ratio_value"] == 0.8


@pytest.mark.asyncio
async def test_uvvis_service_tauc_plot():
    service = UVVisService()
    # Simulate absorption edge around 380 nm (E ~ 3.26 eV, typical for ZnO / TiO2)
    wavelengths = list(np.linspace(300.0, 800.0, 50))
    # High absorbance below 380 nm, dropping above 380 nm
    intensities = [1.5 if w < 380 else 0.05 for w in wavelengths]

    res = await service.analyze_spectrum(
        wavelengths=wavelengths,
        intensities=intensities,
        spectrum_type="absorbance",
        transition_type="direct_allowed",
    )
    assert "band_gap_ev" in res
    assert "energy_ev" in res
    assert "tauc_values" in res
    assert res["band_gap_ev"] > 0.0


def test_spectroscopy_api_endpoints():
    client = TestClient(app)

    # 1. Test FTIR library endpoint
    r_ftir_lib = client.get("/ftir/library")
    assert r_ftir_lib.status_code == 200
    assert "groups" in r_ftir_lib.json()

    # 2. Test Raman library endpoint
    r_raman_lib = client.get("/raman/library")
    assert r_raman_lib.status_code == 200
    assert "modes" in r_raman_lib.json()

    # 3. Test FTIR process endpoint
    r_ftir = client.post(
        "/ftir/process",
        json={
            "wavenumbers": [500.0, 1720.0, 3400.0],
            "intensities": [0.1, 0.9, 0.8],
            "min_peak_prominence": 0.1,
        },
    )
    assert r_ftir.status_code == 200
    assert r_ftir.json()["status"] == "success"

    # 4. Test Raman process endpoint
    r_raman = client.post(
        "/raman/process",
        json={
            "raman_shifts": [400.0, 520.0, 800.0, 1350.0, 1450.0, 1580.0, 1700.0],
            "intensities": [10.0, 30.0, 15.0, 50.0, 20.0, 100.0, 15.0],
            "min_peak_prominence": 5.0,
        },
    )
    assert r_raman.status_code == 200
    assert r_raman.json()["status"] == "success"

    # 5. Test UV-Vis analyze endpoint
    r_uvvis = client.post(
        "/uv_vis/analyze",
        json={
            "wavelengths": [300.0, 350.0, 400.0, 500.0],
            "intensities": [1.2, 1.1, 0.2, 0.05],
            "spectrum_type": "absorbance",
            "transition_type": "direct_allowed",
        },
    )
    assert r_uvvis.status_code == 200
    assert r_uvvis.json()["status"] == "success"
    assert "band_gap_ev" in r_uvvis.json()["data"]
