import pytest
import numpy as np

from backend.scientific_engine.xrd.engine import XRDComputationEngine
from backend.scientific_engine.ftir.engine import FTIRComputationEngine
from backend.scientific_engine.raman.engine import RamanComputationEngine
from backend.scientific_engine.uvvis.engine import UVVisComputationEngine

from backend.parsers.ftir_parser import FTIRParser
from backend.parsers.raman_parser import RamanParser
from backend.parsers.uvvis_parser import UVVisParser

from backend.services.pipelines.xrd_pipeline import XRDProcessingPipeline
from backend.services.pipelines.ftir_pipeline import FTIRProcessingPipeline
from backend.services.pipelines.raman_pipeline import RamanProcessingPipeline
from backend.services.pipelines.uvvis_pipeline import UVVisProcessingPipeline

from backend.domain.entities.instruments.xrd_experiment import XRDExperiment
from backend.domain.entities.instruments.ftir_experiment import FTIRExperiment
from backend.domain.entities.instruments.raman_experiment import RamanExperiment
from backend.domain.entities.instruments.uvvis_experiment import UVVisExperiment


# ============================================================================
# 1. XRD SCIENTIFIC ENGINE TESTS
# ============================================================================

def test_xrd_bragg_d_spacing():
    engine = XRDComputationEngine()
    # At 2theta = 25.3 deg and Cu K-alpha = 1.5406 A:
    # d = 1.5406 / (2 * sin(12.65 deg)) ~ 3.517 A (Anatase TiO2 (101))
    d_spacing = engine.calculate_d_spacing(25.3, wavelength=1.5406)
    assert 3.45 <= d_spacing <= 3.58

def test_xrd_scherrer_crystallite_size():
    engine = XRDComputationEngine()
    # At 2theta = 25.3 deg, FWHM = 0.3 deg
    size_nm = engine.calculate_scherrer_size(25.3, fwhm_deg=0.3)
    assert size_nm > 0.0

def test_xrd_peak_detection():
    engine = XRDComputationEngine()
    two_theta = np.linspace(10, 80, 500).tolist()
    intensity = np.random.normal(20, 2, 500)
    # Peak at 25.3 deg
    idx = np.abs(np.array(two_theta) - 25.3).argmin()
    intensity[idx-2:idx+2] += 200.0

    peaks = engine.detect_bragg_peaks(two_theta, intensity.tolist(), prominence=10.0)
    assert len(peaks) >= 1
    assert peaks[0]["analysis_level"] == "Level 1 (Peak Detection)"
    assert "d_spacing_angstrom" in peaks[0]

def test_xrd_does_not_simulate_rietveld_refinement():
    result = XRDComputationEngine().execute_rietveld_refinement([20.0, 21.0], [10.0, 11.0], [])
    assert result["refinement_performed"] is False
    assert result["status"] == "NOT_PERFORMED"
    assert "R_wp" not in result


# ============================================================================
# 2. FTIR SCIENTIFIC ENGINE TESTS
# ============================================================================

def test_ftir_absorbance_transmittance_conversion():
    engine = FTIRComputationEngine()
    t_pct = [100.0, 50.0, 10.0, 1.0]
    absorbance = engine.transmittance_to_absorbance(t_pct)
    assert absorbance[0] == pytest.approx(0.0, abs=1e-2)   # log10(1) = 0
    assert absorbance[1] == pytest.approx(0.301, abs=1e-2) # 2 - log10(50) = 0.301
    assert absorbance[2] == pytest.approx(1.0, abs=1e-2)   # 2 - log10(10) = 1.0
    assert absorbance[3] == pytest.approx(2.0, abs=1e-2)   # 2 - log10(1) = 2.0

def test_ftir_fingerprint_region_detection():
    engine = FTIRComputationEngine()
    wavenumbers = np.linspace(4000, 400, 500).tolist()
    t_pct = np.full(500, 95.0)
    # O-H band at 3400 cm-1
    idx_oh = np.abs(np.array(wavenumbers) - 3400).argmin()
    t_pct[idx_oh-5:idx_oh+5] -= 50
    # Fingerprint band at 1050 cm-1
    idx_fp = np.abs(np.array(wavenumbers) - 1050).argmin()
    t_pct[idx_fp-5:idx_fp+5] -= 40

    peaks = engine.detect_absorption_bands(wavenumbers, t_pct.tolist(), prominence=5.0)
    assigned = engine.assign_functional_groups(peaks)
    
    assert len(assigned) >= 2
    fp_peaks = [p for p in assigned if p["is_fingerprint_region"]]
    assert len(fp_peaks) >= 1


# ============================================================================
# 3. RAMAN SCIENTIFIC ENGINE TESTS
# ============================================================================

def test_raman_cosmic_ray_despiking():
    engine = RamanComputationEngine()
    shift = np.linspace(100, 3000, 500).tolist()
    intensity = np.full(500, 100.0)
    # Add a single-pixel cosmic ray spike at index 200
    intensity[200] = 5000.0

    despiked = engine.remove_cosmic_rays(shift, intensity.tolist(), threshold=6.0)
    assert despiked[200] < 1000.0

def test_raman_phonon_mode_detection():
    engine = RamanComputationEngine()
    shift = np.linspace(100, 3200, 500).tolist()
    intensity = np.full(500, 20.0)
    # G-band at 1580 cm-1
    idx = np.abs(np.array(shift) - 1580).argmin()
    intensity[idx-3:idx+3] += 300.0

    peaks = engine.detect_phonons(shift, intensity.tolist(), prominence=10.0)
    assert len(peaks) >= 1
    assert "G-band" in peaks[0]["phonon_assignment"]


# ============================================================================
# 4. UV-VIS SCIENTIFIC ENGINE TESTS
# ============================================================================

def test_uvvis_kubelka_munk_transform():
    engine = UVVisComputationEngine()
    r_pct = [50.0, 10.0, 1.0] # 50%, 10%, 1% reflectance
    f_r = engine.kubelka_munk_transform(r_pct)
    # F(R) = (1 - R)^2 / 2R
    # R=0.5 -> (0.5)^2 / (1.0) = 0.25
    assert f_r[0] == pytest.approx(0.25, abs=1e-2)
    assert f_r[1] > f_r[0]

def test_uvvis_tauc_band_gap():
    engine = UVVisComputationEngine()
    wavelength = np.linspace(250, 800, 300).tolist()
    ev = 1239.8 / np.array(wavelength)
    
    # Generate linear Tauc absorption edge at Eg = 3.20 eV
    tauc_y = np.maximum(0.0, 50.0 * (ev - 3.20)).tolist()

    res = engine.estimate_band_gap(ev.tolist(), tauc_y)
    
    assert res["band_gap_ev"] is not None
    assert 3.10 <= res["band_gap_ev"] <= 3.30
    assert res["r_squared"] > 0.85


# ============================================================================
# 5. PARSER TESTS
# ============================================================================

def test_ftir_parser():
    parser = FTIRParser()
    csv_content = b"Wavenumber,Transmittance\n4000,98.2\n3400,45.1\n1700,32.0\n400,90.5\n"
    res = parser.parse(csv_content, "sample_ftir.csv")
    assert res["data_points"] == 4
    assert len(res["wavenumbers"]) == 4

def test_raman_parser():
    parser = RamanParser()
    txt_content = b"Shift\tIntensity\n100\t10.0\n1350\t450.0\n1580\t900.0\n3000\t15.0\n"
    res = parser.parse(txt_content, "sample_raman.txt")
    assert res["data_points"] == 4

def test_uvvis_parser():
    parser = UVVisParser()
    csv_content = b"Wavelength,Absorbance\n200,1.2\n300,1.1\n400,0.2\n800,0.01\n"
    res = parser.parse(csv_content, "sample_uvvis.csv")
    assert res["data_points"] == 4


# ============================================================================
# 6. PIPELINE TESTS
# ============================================================================

def test_ftir_pipeline_execution():
    pipeline = FTIRProcessingPipeline()
    exp = FTIRExperiment(name="Test FTIR Spectrum")
    exp.raw_wavenumbers = np.linspace(4000, 400, 200).tolist()
    exp.raw_transmittance = np.random.normal(90, 2, 200).tolist()

    res_exp = pipeline.process_experiment(exp)
    assert res_exp.status == "Analyzed"
    assert len(res_exp.detected_peaks) >= 0

def test_uvvis_pipeline_execution():
    pipeline = UVVisProcessingPipeline()
    exp = UVVisExperiment(name="Test UV-Vis Spectrum")
    exp.raw_wavelength_nm = np.linspace(250, 800, 200).tolist()
    exp.raw_absorbance = np.linspace(2.0, 0.01, 200).tolist()

    res_exp = pipeline.process_experiment(exp)
    assert res_exp.status == "Analyzed"
    assert res_exp.band_gap_ev is None
    assert "Band gap not calculated" in res_exp.analysis_history[-1]["details"]["validation"]["flags"][0]


@pytest.mark.parametrize(
    ("parser", "filename"),
    [(FTIRParser(), "empty.csv"), (RamanParser(), "empty.txt"), (UVVisParser(), "empty.csv")],
)
def test_spectroscopy_parsers_reject_empty_data(parser, filename):
    with pytest.raises(ValueError):
        parser.parse(b"header only", filename)
