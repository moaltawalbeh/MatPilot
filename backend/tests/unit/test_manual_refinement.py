"""Tests for the manual (step-by-step) Rietveld refinement service."""

import math

import numpy as np
import pytest

from backend.services.manual_refinement_service import (
    ManualRefinementService,
    CU_KA_AVG_ANGSTROM,
)
from backend.services.rietveld_service import RietveldService, N_BASE_PARAMS


def _silicon_peaks(a=5.431, wavelength=1.541874, max_two_theta=80.0, n_strong=None):
    peaks = []
    for h in range(0, 4):
        for k in range(0, 4):
            for l in range(0, 4):
                if h == k == l == 0:
                    continue
                d2 = (h * h + k * k + l * l) / (a * a)
                sinth = wavelength / (2.0 * math.sqrt(1.0 / d2))
                if 0 < sinth < 1:
                    tth = 2.0 * math.degrees(math.asin(sinth))
                    if 10.0 < tth < max_two_theta:
                        mult = len(
                            {(h, k, l), (h, l, k), (k, h, l), (k, l, h), (l, h, k), (l, k, h)}
                        )
                        peaks.append(
                            {
                                "two_theta": tth,
                                "intensity": float(mult * 100.0 / (h * h + k * k + l * l)),
                                "h": h,
                                "k": k,
                                "l": l,
                            }
                        )
    if n_strong is not None:
        peaks.sort(key=lambda p: p["intensity"], reverse=True)
        peaks = peaks[:n_strong]
    return peaks


def _silicon_phase(peaks):
    return {
        "formula": "Si",
        "name": "Silicon",
        "space_group": "Fd-3m",
        "crystal_system": "Cubic",
        "unit_cell": {"a": 5.431, "b": 5.431, "c": 5.431,
                      "alpha": 90, "beta": 90, "gamma": 90},
        "_theoretical_peaks": peaks,
    }


@pytest.fixture()
def observed_data():
    peaks = _silicon_peaks(n_strong=18)
    phase = _silicon_phase(peaks)
    tth = np.linspace(10, 80, 100)
    svc = RietveldService()
    y = np.zeros_like(tth)
    U, V, W = 0.004, -0.0015, 0.008
    for p in peaks:
        th = math.radians(p["two_theta"] / 2.0)
        fwhm = math.degrees(math.sqrt(U * math.tan(th) ** 2 + V * math.tan(th) + W))
        profile = svc._pseudo_voigt(tth, p["two_theta"], fwhm, fwhm, 0.5)
        y += p["intensity"] * profile
    y = 200.0 * y / y.max() + 12.0 + 0.03 * tth
    rng = np.random.default_rng(1234)
    y_obs = np.maximum(y + rng.normal(0, 1.2, y.size), 0.0)
    return tth, y_obs, [phase]


@pytest.fixture()
def session(observed_data):
    tth, y_obs, phases = observed_data
    service = ManualRefinementService(RietveldService())
    state = service.init_session(
        session_id="sess-1",
        experiment_id="exp-1",
        two_theta=tth,
        intensity=y_obs,
        phase_cifs=phases,
        wavelength=CU_KA_AVG_ANGSTROM,
    )
    assert state["last_result"] is not None, "initial auto-refinement failed"
    return service, "sess-1"


class TestSessionInit:
    def test_parameter_set(self, session):
        service, sid = session
        state = service.get_session_state(sid)
        names = {p["name"] for p in state["parameters"]}
        for expected in [
            "scale", "zero_shift", "bg_c0", "bg_c1", "bg_c2", "bg_c3",
            "U", "V", "W", "sample_displacement", "preferred_orientation",
            "crystallite_size", "microstrain", "lattice_p0_a",
        ]:
            assert expected in names, f"missing parameter: {expected}"
        # The TCH mixing replaced the fitted eta / asymmetry sliders.
        assert "eta" not in names
        assert "peak_asymmetry" not in names

    def test_wavelength_default_is_canonical(self):
        assert CU_KA_AVG_ANGSTROM == pytest.approx(1.541874, rel=1e-4)

    def test_initial_result_metrics(self, session):
        service, sid = session
        state = service.get_session_state(sid)
        r = state["last_result"]
        assert r["r_wp"] is not None and r["r_wp"] < 80
        assert r["r_exp"] is not None
        assert r["gof"] is not None


class TestParameterControl:
    def test_set_parameter_clamps_to_bounds(self, session):
        service, sid = session
        service.set_parameter(sid, "scale", value=1e9)
        state = service.get_session_state(sid)
        scale = next(p for p in state["parameters"] if p["name"] == "scale")
        assert scale["value"] <= 50.0
        service.set_parameter(sid, "scale", value=-1e9)
        state = service.get_session_state(sid)
        scale = next(p for p in state["parameters"] if p["name"] == "scale")
        assert scale["value"] >= 0.001

    def test_lock_unlock_toggle(self, session):
        service, sid = session
        service.unlock_parameters(sid, ["scale"])
        state = service.get_session_state(sid)
        scale = next(p for p in state["parameters"] if p["name"] == "scale")
        assert scale["locked"] is False
        service.lock_parameters(sid, ["scale"])
        state = service.get_session_state(sid)
        scale = next(p for p in state["parameters"] if p["name"] == "scale")
        assert scale["locked"] is True

    def test_unknown_parameter_raises(self, session):
        service, sid = session
        with pytest.raises(KeyError):
            service.set_parameter(sid, "not_a_param", value=1.0)

    def test_vector_scale_conversions(self, session):
        service, _ = session
        assert service._vector_scale("crystallite_size") == 10.0
        assert service._vector_scale("microstrain") == 1e-4
        assert service._vector_scale("scale") == 1.0


class TestRefinementSteps:
    def test_run_step_updates_lattice(self, session):
        service, sid = session
        # Deliberately detune the lattice parameter, then refine it back.
        service.set_parameter(sid, "lattice_p0_a", value=5.45)
        service.unlock_parameters(sid, ["lattice_p0_a"])
        before = next(p for p in service.get_session_state(sid)["parameters"]
                      if p["name"] == "lattice_p0_a")
        assert before["value"] == pytest.approx(5.45)

        state = service.run_step(sid)
        assert state["current_step"] == 1
        assert state["last_result"] is not None
        after = next(p for p in state["parameters"] if p["name"] == "lattice_p0_a")
        # Single-parameter step pulls the lattice back near the truth (5.431).
        assert abs(after["value"] - 5.431) < 0.1

    def test_run_step_with_no_unlocked_raises(self, session):
        service, sid = session
        with pytest.raises(ValueError):
            service.run_step(sid)

    def test_full_refinement_unlocks_everything(self, session):
        service, sid = session
        state = service.run_full_refinement(sid)
        assert state["current_step"] == 1
        assert state["last_result"]["r_wp"] is not None
        assert all(not p["locked"] for p in state["parameters"])

    def test_undo_restores_snapshot(self, session):
        service, sid = session
        service.set_parameter(sid, "lattice_p0_a", value=5.45)
        service.unlock_parameters(sid, ["lattice_p0_a"])
        service.run_step(sid)
        state = service.get_session_state(sid)
        after = next(p for p in state["parameters"] if p["name"] == "lattice_p0_a")
        assert after["value"] != pytest.approx(5.45)

        service.undo_step(sid)
        state = service.get_session_state(sid)
        restored = next(p for p in state["parameters"] if p["name"] == "lattice_p0_a")
        assert restored["value"] == pytest.approx(5.45, rel=1e-9)

    def test_reset_restores_initial_values(self, session):
        service, sid = session
        initial = {p["name"]: p["value"] for p in service.get_session_state(sid)["parameters"]}
        service.set_parameter(sid, "scale", value=3.0)
        service.run_full_refinement(sid)
        assert service.get_session_state(sid)["current_step"] == 1

        ok = service.reset_session(sid)
        assert ok["success"] is True
        state = service.get_session_state(sid)
        assert state["current_step"] == 0
        assert state["last_result"] is None
        assert state["history"] == []
        for p in state["parameters"]:
            assert p["value"] == pytest.approx(initial[p["name"]], rel=1e-9)
            assert p["locked"] is True


class TestVectorLayout:
    def test_lattice_info_starts_after_base_params(self, session):
        service, sid = session
        service._sessions[sid]._phase_lattice_info
        session_obj = service._sessions[sid]
        info = session_obj._phase_lattice_info[0]
        assert info["param_indices"] == [N_BASE_PARAMS]

    def test_session_state_parameters_serializable(self, session):
        service, sid = session
        state = service.get_session_state(sid)
        for p in state["parameters"]:
            assert isinstance(p["value"], float)
            assert isinstance(p["lower_bound"], float)
            assert isinstance(p["upper_bound"], float)
            assert isinstance(p["locked"], bool)
