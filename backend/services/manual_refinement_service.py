"""Manual Rietveld Refinement Service.

Supports step-by-step refinement with parameter lock/unlock,
enabling users to control which parameters are refined at each step.
"""

import logging
import math
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field
import numpy as np
from scipy.optimize import least_squares

from backend.services.rietveld_service import RietveldService, RietveldResult, RietveldParameters

logger = logging.getLogger("manual_refinement")


@dataclass
class RefinementParameter:
    """Represents a single refinable parameter."""
    name: str
    label: str
    value: float
    initial_value: float
    lower_bound: float
    upper_bound: float
    locked: bool = False
    category: str = ""
    description: str = ""
    uncertainty: Optional[float] = None


@dataclass
class ManualRefinementSession:
    """Tracks state for a manual refinement session."""
    session_id: str
    experiment_id: str
    parameters: Dict[str, RefinementParameter] = field(default_factory=dict)
    current_step: int = 0
    history: List[Dict[str, Any]] = field(default_factory=list)
    last_result: Optional[RietveldResult] = None
    phase_cifs: List[Dict[str, Any]] = field(default_factory=list)
    two_theta: Optional[np.ndarray] = None
    intensity: Optional[np.ndarray] = None
    wavelength: float = 1.5406
    # Internal: cached peak data and lattice info from last Rietveld run
    _all_phase_peaks: Optional[List[List[Dict[str, Any]]]] = None
    _phase_lattice_info: Optional[List[Dict[str, Any]]] = None
    _n_bg: int = 4
    _n_frac: int = 0
    _i_obs_max: float = 1.0


PARAMETER_DEFINITIONS = [
    {"name": "scale", "label": "Scale Factor", "category": "scale",
     "description": "Overall intensity scaling factor", "default": 1.0,
     "lower": 0.001, "upper": 50.0},
    {"name": "zero_shift", "label": "Zero Shift (deg 2-theta)", "category": "scale",
     "description": "Zero-point offset in 2-theta", "default": 0.0,
     "lower": -2.0, "upper": 2.0},
    {"name": "bg_c0", "label": "Background Coeff 0", "category": "background",
     "description": "Constant background term", "default": 0.0,
     "lower": -1.0, "upper": 1.0},
    {"name": "bg_c1", "label": "Background Coeff 1", "category": "background",
     "description": "Linear background term", "default": 0.0,
     "lower": -1.0, "upper": 1.0},
    {"name": "bg_c2", "label": "Background Coeff 2", "category": "background",
     "description": "Quadratic background term", "default": 0.0,
     "lower": -1.0, "upper": 1.0},
    {"name": "bg_c3", "label": "Background Coeff 3", "category": "background",
     "description": "Cubic background term", "default": 0.0,
     "lower": -1.0, "upper": 1.0},
    {"name": "U", "label": "U (Caglioti)", "category": "profile",
     "description": "Gaussian width parameter (tan-theta squared)", "default": 0.005,
     "lower": 0.0, "upper": 0.01},
    {"name": "V", "label": "V (Caglioti)", "category": "profile",
     "description": "Gaussian width parameter (tan-theta)", "default": -0.002,
     "lower": -0.005, "upper": 0.005},
    {"name": "W", "label": "W (Caglioti)", "category": "profile",
     "description": "Gaussian width constant", "default": 0.01,
     "lower": 0.0, "upper": 0.05},
    {"name": "eta", "label": "Mixing Parameter (eta)", "category": "profile",
     "description": "Pseudo-Voigt Lorentzian/Gaussian ratio", "default": 0.5,
     "lower": 0.0, "upper": 1.0},
    {"name": "sample_displacement", "label": "Sample Displacement (mm)", "category": "instrument",
     "description": "Sample displacement error", "default": 0.0,
     "lower": -5.0, "upper": 5.0},
    {"name": "preferred_orientation", "label": "Preferred Orientation", "category": "sample",
     "description": "March-Dollase preferred orientation parameter", "default": 1.0,
     "lower": 0.1, "upper": 10.0},
    {"name": "peak_asymmetry", "label": "Peak Asymmetry", "category": "profile",
     "description": "Peak asymmetry correction parameter", "default": 0.0,
     "lower": -1.0, "upper": 1.0},
    {"name": "crystallite_size", "label": "Crystallite Size (nm)", "category": "microstructure",
     "description": "Average crystallite size (Scherrer)", "default": 100.0,
     "lower": 1.0, "upper": 10000.0},
    {"name": "microstrain", "label": "Microstrain (x10^-4)", "category": "microstructure",
     "description": "Microstrain broadening", "default": 0.0,
     "lower": 0.0, "upper": 50.0},
]


def _param_def(name: str) -> Dict[str, Any]:
    for d in PARAMETER_DEFINITIONS:
        if d["name"] == name:
            return d
    return {"name": name, "label": name, "category": "unknown", "description": "", "default": 0.0, "lower": -1e9, "upper": 1e9}


class ManualRefinementService:
    """Service for interactive manual Rietveld refinement."""

    def __init__(self, rietveld_service: Optional[RietveldService] = None):
        self._rietveld = rietveld_service or RietveldService()
        self._sessions: Dict[str, ManualRefinementSession] = {}

    def get_available_parameters(self) -> List[Dict[str, Any]]:
        """Return the full list of refinable parameter definitions."""
        return [
            {k: v for k, v in d.items() if k != "default"}
            for d in PARAMETER_DEFINITIONS
        ]

    # ------------------------------------------------------------------
    # Session lifecycle
    # ------------------------------------------------------------------

    def init_session(
        self,
        session_id: str,
        experiment_id: str,
        two_theta,
        intensity,
        phase_cifs: List[Dict[str, Any]],
        wavelength: float = 1.5406,
    ) -> Dict[str, Any]:
        """Initialize a manual refinement session with data.

        Performs an initial auto-refinement to seed parameter values, then
        returns the session state.
        """
        tth = np.asarray(two_theta, dtype=np.float64)
        i_obs = np.asarray(intensity, dtype=np.float64)

        if len(tth) < 10:
            raise ValueError("Insufficient data points for refinement")
        if not phase_cifs:
            raise ValueError("No phases provided")

        # Run initial auto-refinement to seed parameter values
        initial_result = self._rietveld.refine(tth, i_obs, phase_cifs, wavelength=wavelength)

        # Determine number of phase fractions
        n_phases = len(phase_cifs)
        n_frac = max(0, n_phases - 1)
        n_bg = 4

        # Build parameters from the initial refinement result (or defaults)
        params: Dict[str, RefinementParameter] = {}
        if initial_result.success and initial_result.parameters:
            rp = initial_result.parameters
            unc = initial_result.parameter_uncertainties or {}
            param_values = {
                "scale": rp.scale,
                "zero_shift": rp.zero_shift,
                "bg_c0": rp.background_coeffs[0] if len(rp.background_coeffs) > 0 else 0.0,
                "bg_c1": rp.background_coeffs[1] if len(rp.background_coeffs) > 1 else 0.0,
                "bg_c2": rp.background_coeffs[2] if len(rp.background_coeffs) > 2 else 0.0,
                "bg_c3": rp.background_coeffs[3] if len(rp.background_coeffs) > 3 else 0.0,
                "U": rp.U,
                "V": rp.V,
                "W": rp.W,
                "eta": rp.eta,
                "sample_displacement": 0.0,
                "preferred_orientation": 1.0,
                "peak_asymmetry": 0.0,
                "crystallite_size": 100.0,
                "microstrain": 0.0,
            }
            unc_map = {
                "scale": unc.get("scale"),
                "zero_shift": unc.get("zero_shift"),
                "bg_c0": unc.get("bg_c0"),
                "bg_c1": unc.get("bg_c1"),
                "bg_c2": unc.get("bg_c2"),
                "bg_c3": unc.get("bg_c3"),
                "U": unc.get("U"),
                "V": unc.get("V"),
                "W": unc.get("W"),
                "eta": unc.get("eta"),
            }
        else:
            param_values = {d["name"]: d["default"] for d in PARAMETER_DEFINITIONS}
            unc_map = {}

        for d in PARAMETER_DEFINITIONS:
            name = d["name"]
            val = param_values.get(name, d["default"])
            params[name] = RefinementParameter(
                name=name,
                label=d["label"],
                value=val,
                initial_value=val,
                lower_bound=d["lower"],
                upper_bound=d["upper"],
                locked=True,
                category=d["category"],
                description=d["description"],
                uncertainty=unc_map.get(name),
            )

        # Add lattice parameter parameters from CIF data
        lattice_param_defs = self._build_lattice_param_defs(phase_cifs)
        for lpd in lattice_param_defs:
            params[lpd["name"]] = RefinementParameter(
                name=lpd["name"],
                label=lpd["label"],
                value=lpd["value"],
                initial_value=lpd["value"],
                lower_bound=lpd["lower"],
                upper_bound=lpd["upper"],
                locked=True,
                category="lattice",
                description=lpd["description"],
            )

        # Add phase fraction parameters
        phase_frac_defs = self._build_phase_fraction_defs(phase_cifs)
        for pfd in phase_frac_defs:
            params[pfd["name"]] = RefinementParameter(
                name=pfd["name"],
                label=pfd["label"],
                value=pfd["value"],
                initial_value=pfd["value"],
                lower_bound=pfd["lower"],
                upper_bound=pfd["upper"],
                locked=True,
                category="phase",
                description=pfd["description"],
            )

        # Cache internal state for the Rietveld engine
        all_phase_peaks = []
        for cif_data in phase_cifs:
            peaks = self._rietveld._generate_phase_peaks(cif_data, wavelength, float(np.max(tth)))
            if peaks:
                max_theo = max(p["intensity"] for p in peaks) if peaks else 1.0
                if max_theo > 0:
                    for p in peaks:
                        p["intensity"] = p["intensity"] / max_theo
            all_phase_peaks.append(peaks)

        phase_lattice_info = self._build_phase_lattice_info(phase_cifs)

        i_obs_max = float(np.max(i_obs)) if float(np.max(i_obs)) > 0 else 1.0

        session = ManualRefinementSession(
            session_id=session_id,
            experiment_id=experiment_id,
            parameters=params,
            current_step=0,
            history=[],
            last_result=initial_result if initial_result.success else None,
            phase_cifs=phase_cifs,
            two_theta=tth,
            intensity=i_obs,
            wavelength=wavelength,
            _all_phase_peaks=all_phase_peaks,
            _phase_lattice_info=phase_lattice_info,
            _n_bg=n_bg,
            _n_frac=n_frac,
            _i_obs_max=i_obs_max,
        )

        self._sessions[session_id] = session

        # Record initial state in history
        if initial_result.success:
            session.history.append({
                "step": 0,
                "action": "init",
                "rwp": initial_result.r_wp,
                "rp": initial_result.r_p,
                "parameters": {k: v.value for k, v in params.items()},
            })

        return self.get_session_state(session_id)

    # ------------------------------------------------------------------
    # Parameter manipulation
    # ------------------------------------------------------------------

    def set_parameter(
        self,
        session_id: str,
        param_name: str,
        value: Optional[float] = None,
        locked: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """Set value and/or lock state of a parameter."""
        session = self._get_session(session_id)
        if param_name not in session.parameters:
            raise KeyError(f"Unknown parameter: {param_name}")
        param = session.parameters[param_name]
        if value is not None:
            param.value = max(param.lower_bound, min(param.upper_bound, value))
        if locked is not None:
            param.locked = locked
        return {"success": True, "parameter": self._param_to_dict(param)}

    def lock_parameters(self, session_id: str, param_names: List[str]) -> Dict[str, Any]:
        """Lock multiple parameters (they will not be refined)."""
        session = self._get_session(session_id)
        locked = []
        for name in param_names:
            if name in session.parameters:
                session.parameters[name].locked = True
                locked.append(name)
        return {"success": True, "locked": locked}

    def unlock_parameters(self, session_id: str, param_names: List[str]) -> Dict[str, Any]:
        """Unlock multiple parameters (they will be refined)."""
        session = self._get_session(session_id)
        unlocked = []
        for name in param_names:
            if name in session.parameters:
                session.parameters[name].locked = False
                unlocked.append(name)
        return {"success": True, "unlocked": unlocked}

    # ------------------------------------------------------------------
    # Refinement steps
    # ------------------------------------------------------------------

    def run_step(self, session_id: str) -> Dict[str, Any]:
        """Run one refinement step, only refining unlocked parameters.

        The key algorithm:
        1. Build parameter vector from only UNLOCKED parameters
        2. Keep locked parameters at their fixed values
        3. Run least_squares with appropriate bounds
        4. Map results back to the full parameter set
        5. Store history for undo capability
        """
        session = self._get_session(session_id)

        if session.two_theta is None or session.intensity is None:
            raise ValueError("No data loaded in session")
        if not session.phase_cifs:
            raise ValueError("No phases loaded in session")
        if session._all_phase_peaks is None or session._phase_lattice_info is None:
            raise ValueError("Internal peak/lattice data not initialized")

        tth = session.two_theta
        i_obs_norm = session.intensity / session._i_obs_max
        all_phase_peaks = session._all_phase_peaks
        phase_lattice_info = session._phase_lattice_info
        n_bg = session._n_bg
        n_frac = session._n_frac
        wl = session.wavelength

        # Build the master parameter vector (same layout as RietveldService)
        # Indices: 0=scale, 1=zero_shift, 2..5=bg_c0..3, 6=U, 7=V, 8=W, 9=eta,
        #          10..10+n_frac-1=phase_fractions, then lattice params
        n_base = 10 + n_frac
        n_lattice = sum(len(info["param_indices"]) for info in phase_lattice_info)
        total_params = n_base + n_lattice

        # Build full parameter vector from current session state
        full_x = np.zeros(total_params, dtype=np.float64)
        full_lower = np.full(total_params, -np.inf, dtype=np.float64)
        full_upper = np.full(total_params, np.inf, dtype=np.float64)

        # Map session parameters to the internal vector
        param_name_to_idx = {}
        full_x[0] = session.parameters.get("scale", _as_ref("scale")).value
        full_x[1] = session.parameters.get("zero_shift", _as_ref("zero_shift")).value
        for i, bg_name in enumerate(["bg_c0", "bg_c1", "bg_c2", "bg_c3"]):
            full_x[2 + i] = session.parameters.get(bg_name, _as_ref(bg_name)).value
        full_x[6] = session.parameters.get("U", _as_ref("U")).value
        full_x[7] = session.parameters.get("V", _as_ref("V")).value
        full_x[8] = session.parameters.get("W", _as_ref("W")).value
        full_x[9] = session.parameters.get("eta", _as_ref("eta")).value

        param_name_to_idx["scale"] = 0
        param_name_to_idx["zero_shift"] = 1
        for i, bg_name in enumerate(["bg_c0", "bg_c1", "bg_c2", "bg_c3"]):
            param_name_to_idx[bg_name] = 2 + i
        param_name_to_idx["U"] = 6
        param_name_to_idx["V"] = 7
        param_name_to_idx["W"] = 8
        param_name_to_idx["eta"] = 9

        # Phase fractions
        if n_frac > 0:
            phase_frac_names = [f"phase_frac_{i}" for i in range(n_frac)]
            for i, name in enumerate(phase_frac_names):
                full_x[10 + i] = session.parameters.get(name, _as_ref(name)).value
                param_name_to_idx[name] = 10 + i

        # Lattice parameters
        lattice_offset = n_base
        for phase_idx, info in enumerate(phase_lattice_info):
            cs = info["crystal_system"]
            indices = info["param_indices"]
            a0, b0, c0, alpha0, beta0, gamma0 = info["initial"]
            lattice_param_names = self._get_lattice_param_names(cs)
            for j, (lp_name_suffix, param_idx) in enumerate(zip(lattice_param_names, range(len(indices)))):
                full_name = f"lattice_p{phase_idx}_{lp_name_suffix}"
                lp = session.parameters.get(full_name)
                full_x[lattice_offset + param_idx] = lp.value if lp else a0
                param_name_to_idx[full_name] = lattice_offset + param_idx
            lattice_offset += len(indices)

        # Set bounds from parameter definitions
        for name, idx in param_name_to_idx.items():
            if name in session.parameters:
                full_lower[idx] = session.parameters[name].lower_bound
                full_upper[idx] = session.parameters[name].upper_bound

        # Determine which parameters are unlocked (will be optimized)
        unlocked_names = [name for name, p in session.parameters.items() if not p.locked]
        unlocked_indices = [param_name_to_idx[name] for name in unlocked_names if name in param_name_to_idx]

        if not unlocked_indices:
            raise ValueError("No parameters are unlocked for refinement")

        # Save snapshot for undo
        snapshot = {k: v.value for k, v in session.parameters.items()}

        # Build optimization vector (only unlocked params)
        x0_opt = full_x[unlocked_indices].copy()
        lower_opt = full_lower[unlocked_indices].copy()
        upper_opt = full_upper[unlocked_indices].copy()

        # Clip initial values to bounds
        for i in range(len(x0_opt)):
            if lower_opt[i] > -1e30:
                x0_opt[i] = max(x0_opt[i], lower_opt[i])
            if upper_opt[i] < 1e30:
                x0_opt[i] = min(x0_opt[i], upper_opt[i])

        iteration_history: List[Dict[str, Any]] = []
        iteration_counter = [0]
        max_iter = 200

        def _residuals(x_opt, tth, i_obs, all_peaks, n_bg, n_frac, phase_lat_info, wavelength):
            iteration_counter[0] += 1
            # Map optimization vector back to full vector
            full_x_local = full_x.copy()
            full_x_local[unlocked_indices] = x_opt
            i_calc = self._rietveld._calculate_pattern(
                full_x_local, tth, all_peaks, n_bg, n_frac, phase_lat_info, wavelength
            )
            residuals = i_calc - i_obs
            eps = max(0.05, 0.05 * float(np.max(i_obs)))
            safe_obs = np.clip(i_obs, eps, None)
            weights = 1.0 / safe_obs
            weighted_res = residuals * weights
            cost = float(np.sum(weighted_res ** 2))
            rwp = self._rietveld._compute_rwp(i_obs, i_calc)
            rp = self._rietveld._compute_rp(i_obs, i_calc)
            if iteration_counter[0] <= 5 or iteration_counter[0] % max(1, max_iter // 20) == 0:
                iteration_history.append({
                    "iteration": iteration_counter[0],
                    "rwp": round(rwp, 4),
                    "rp": round(rp, 4),
                    "cost": round(cost, 6),
                })
            return weighted_res

        try:
            result = least_squares(
                _residuals,
                x0_opt,
                args=(tth, i_obs_norm, all_phase_peaks, n_bg, n_frac, phase_lattice_info, wl),
                bounds=(lower_opt, upper_opt),
                method="trf",
                max_nfev=max_iter,
                ftol=1e-12,
                xtol=1e-12,
                gtol=1e-12,
            )
        except Exception as e:
            logger.error("Manual refinement step failed: %s", e)
            raise RuntimeError(f"Refinement step failed: {e}")

        # Map optimized values back to full vector
        x_final = full_x.copy()
        x_final[unlocked_indices] = result.x

        # Compute final patterns
        i_obs_max = session._i_obs_max
        i_calc = self._rietveld._calculate_pattern(
            x_final, tth, all_phase_peaks, n_bg, n_frac, phase_lattice_info, wl
        ) * i_obs_max
        bg = self._rietveld._polynomial_bg(x_final[2:6], tth) * i_obs_max
        diff = session.intensity - i_calc

        r_wp = self._rietveld._compute_rwp(session.intensity, i_calc)
        r_p = self._rietveld._compute_rp(session.intensity, i_calc)

        # Compute Rexp, chi-squared, GoF
        n_data = len(tth)
        n_params_used = int(np.sum(~np.isinf(full_lower)))
        eps_rexp = max(1e-10, 0.05 * float(np.max(session.intensity)))
        safe_obs_rexp = np.clip(session.intensity, eps_rexp, None)
        weights_rexp = 1.0 / safe_obs_rexp
        sum_w_y2 = float(np.sum(weights_rexp * session.intensity ** 2))
        if sum_w_y2 > 0 and n_data > n_params_used:
            r_exp = math.sqrt((n_data - n_params_used) / sum_w_y2) * 100.0
        else:
            r_exp = None

        if r_exp and r_exp > 0:
            chi_sq = (r_wp / r_exp) ** 2
            gof = math.sqrt(chi_sq)
        else:
            chi_sq = 0.0
            gof = 0.0

        # Parameter uncertainties
        uncertainties = np.zeros(len(x_final))
        try:
            jacobian = result.jac
            jtj = jacobian.T @ jacobian
            cov = np.linalg.pinv(jtj)
            sum_residuals_sq = np.sum(result.fun ** 2)
            reduced_chi_sq = sum_residuals_sq / max(1, n_data - max(n_params_used, 1))
            cov = cov * reduced_chi_sq
            full_unc = np.zeros(len(x_final))
            full_unc[unlocked_indices] = np.sqrt(np.diag(cov)) if len(unlocked_indices) == len(np.diag(cov)) else 0.0
            uncertainties = full_unc
        except Exception:
            pass

        # Update session parameters with optimized values
        for name, idx in param_name_to_idx.items():
            if name in session.parameters:
                p = session.parameters[name]
                old_val = p.value
                p.value = float(x_final[idx])
                if name in [n for n in unlocked_names if n in param_name_to_idx]:
                    if name in param_name_to_idx:
                        unc_idx = param_name_to_idx[name]
                        p.uncertainty = float(uncertainties[unc_idx]) if uncertainties[unc_idx] > 0 else None

        # Update iteration history
        if iteration_history and iteration_history[-1]["iteration"] != iteration_counter[0]:
            iteration_history.append({
                "iteration": iteration_counter[0],
                "rwp": round(r_wp, 4),
                "rp": round(r_p, 4),
                "cost": round(float(result.cost), 6),
            })

        # Build RietveldResult
        params_obj = self._build_rietveld_params(session)
        param_unc_map = {n: session.parameters[n].uncertainty for n in unlocked_names
                         if n in session.parameters and session.parameters[n].uncertainty is not None}

        # Build phase info
        phase_info = []
        for i, (cif_data, peaks) in enumerate(zip(session.phase_cifs, all_phase_peaks)):
            frac_val = 1.0
            frac_name = f"phase_frac_{i}"
            if frac_name in session.parameters:
                frac_val = session.parameters[frac_name].value
            elif i == len(session.phase_cifs) - 1 and n_frac > 0:
                frac_val = 1.0 - sum(
                    session.parameters.get(f"phase_frac_{j}", _as_ref(f"phase_frac_{j}")).value
                    for j in range(n_frac)
                )
                frac_val = max(0.0, min(1.0, frac_val))

            info = phase_lattice_info[i]
            a_f, b_f, c_f, alpha_f, beta_f, gamma_f = self._rietveld._get_lattice_parameters(x_final, info)
            cos_a = math.cos(math.radians(alpha_f))
            cos_b = math.cos(math.radians(beta_f))
            cos_g = math.cos(math.radians(gamma_f))
            volume = a_f * b_f * c_f * math.sqrt(
                max(0.0, 1.0 - cos_a**2 - cos_b**2 - cos_g**2 + 2.0 * cos_a * cos_b * cos_g)
            )
            g_star = self._rietveld._compute_reciprocal_metric_tensor(a_f, b_f, c_f, alpha_f, beta_f, gamma_f)
            bragg_peaks = []
            for peak in peaks:
                h, k, l = self._rietveld._get_hkl(peak)
                tth_calc = self._rietveld._calculate_two_theta(h, k, l, g_star, wl, peak["two_theta"])
                bragg_peaks.append(round(tth_calc, 4))

            phase_info.append({
                "formula": cif_data.get("formula", ""),
                "name": cif_data.get("name", ""),
                "space_group": cif_data.get("space_group", ""),
                "fraction": round(frac_val, 4),
                "n_peaks": len(peaks),
                "lattice_params": {
                    "a": round(a_f, 4), "b": round(b_f, 4), "c": round(c_f, 4),
                    "alpha": round(alpha_f, 4), "beta": round(beta_f, 4), "gamma": round(gamma_f, 4),
                    "volume": round(volume, 4),
                },
                "bragg_peaks": bragg_peaks,
            })

        bragg_markers = []
        for i, (cif_data, peaks) in enumerate(zip(session.phase_cifs, all_phase_peaks)):
            phase_name = cif_data.get("name", cif_data.get("formula", f"Phase {i+1}"))
            frac_val = 1.0
            frac_name = f"phase_frac_{i}"
            if frac_name in session.parameters:
                frac_val = session.parameters[frac_name].value
            for peak in peaks:
                hkl = peak.get("hkl", "")
                if isinstance(hkl, (list, tuple)):
                    hkl = f"({hkl[0]}{hkl[1]}{hkl[2]})"
                bragg_markers.append({
                    "two_theta": peak["two_theta"],
                    "intensity": peak["intensity"],
                    "hkl": str(hkl),
                    "phase_name": phase_name,
                    "phase_index": i,
                    "phase_fraction": round(frac_val, 4),
                })

        refined_result = RietveldResult(
            success=True,
            message=f"Manual refinement step {session.current_step + 1} completed",
            r_wp=round(r_wp, 4),
            r_p=round(r_p, 4),
            r_exp=round(r_exp, 4) if r_exp else None,
            chi_squared=round(chi_sq, 4),
            gof=round(gof, 4),
            two_theta=tth.tolist(),
            observed=session.intensity.tolist(),
            calculated=i_calc.tolist(),
            difference=diff.tolist(),
            background=bg.tolist(),
            parameters=params_obj,
            parameter_uncertainties=param_unc_map,
            phases_used=phase_info,
            iterations=iteration_counter[0],
            bragg_markers=bragg_markers,
            refinement_history=iteration_history,
        )

        session.current_step += 1
        session.last_result = refined_result

        session.history.append({
            "step": session.current_step,
            "action": "refine_step",
            "rwp": round(r_wp, 4),
            "rp": round(r_p, 4),
            "refined_params": unlocked_names,
            "snapshot": snapshot,
            "parameters": {k: v.value for k, v in session.parameters.items()},
        })

        logger.info(
            "Step %d: Rwp=%.4f, Rp=%.4f, refined %d params",
            session.current_step, r_wp, r_p, len(unlocked_names),
        )

        return self.get_session_state(session_id)

    def run_full_refinement(self, session_id: str) -> Dict[str, Any]:
        """Unlock all parameters and run full refinement."""
        session = self._get_session(session_id)
        for p in session.parameters.values():
            p.locked = False
        return self.run_step(session_id)

    # ------------------------------------------------------------------
    # State management
    # ------------------------------------------------------------------

    def get_session_state(self, session_id: str) -> Dict[str, Any]:
        """Return current session state including all parameters and last result."""
        session = self._get_session(session_id)
        params_list = [self._param_to_dict(p) for p in session.parameters.values()]

        result_dict = None
        if session.last_result:
            r = session.last_result
            result_dict = {
                "status": "success" if r.success else "error",
                "workflow": "manual",
                "message": r.message,
                "r_wp": r.r_wp,
                "r_p": r.r_p,
                "r_exp": r.r_exp,
                "chi_squared": r.chi_squared,
                "gof": r.gof,
                "iterations": r.iterations,
                "parameters": {
                    "scale": r.parameters.scale if r.parameters else None,
                    "zero_shift": r.parameters.zero_shift if r.parameters else None,
                    "background_coeffs": r.parameters.background_coeffs if r.parameters else [],
                    "U": r.parameters.U if r.parameters else None,
                    "V": r.parameters.V if r.parameters else None,
                    "W": r.parameters.W if r.parameters else None,
                    "eta": r.parameters.eta if r.parameters else None,
                    "phase_fractions": r.parameters.phase_fractions if r.parameters else [],
                } if r.parameters else None,
                "patterns": {
                    "two_theta": r.two_theta,
                    "observed": r.observed,
                    "calculated": r.calculated,
                    "difference": r.difference,
                    "background": r.background,
                } if r.two_theta else None,
                "phases_used": r.phases_used,
                "bragg_markers": r.bragg_markers,
                "refinement_history": r.refinement_history,
            }

        return {
            "session_id": session.session_id,
            "experiment_id": session.experiment_id,
            "parameters": params_list,
            "current_step": session.current_step,
            "history": [
                {"step": h["step"], "rwp": h.get("rwp"), "rp": h.get("rp"), "action": h.get("action", "")}
                for h in session.history
            ],
            "last_result": result_dict,
            "wavelength": session.wavelength,
        }

    def undo_step(self, session_id: str) -> Dict[str, bool]:
        """Undo the last refinement step, restoring previous parameter values."""
        session = self._get_session(session_id)
        if not session.history:
            return {"success": False}

        last_entry = session.history[-1]
        snapshot = last_entry.get("snapshot")
        if not snapshot:
            return {"success": False}

        for name, val in snapshot.items():
            if name in session.parameters:
                session.parameters[name].value = val

        session.history.pop()
        session.current_step = max(0, session.current_step - 1)

        # Re-run with restored params to update result
        # But don't add another history entry — just update display
        return {"success": True}

    def reset_session(self, session_id: str) -> Dict[str, bool]:
        """Reset all parameters to initial values."""
        session = self._get_session(session_id)
        for p in session.parameters.values():
            p.value = p.initial_value
            p.locked = True
            p.uncertainty = None
        session.current_step = 0
        session.history = []
        session.last_result = None
        return {"success": True}

    def export_state(self, session_id: str) -> Dict[str, Any]:
        """Export session state as JSON-serializable dict."""
        state = self.get_session_state(session_id)
        return state

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_session(self, session_id: str) -> ManualRefinementSession:
        if session_id not in self._sessions:
            raise KeyError(f"Session not found: {session_id}")
        return self._sessions[session_id]

    def delete_session(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def _param_to_dict(self, p: RefinementParameter) -> Dict[str, Any]:
        return {
            "name": p.name,
            "label": p.label,
            "value": round(p.value, 6),
            "initial_value": round(p.initial_value, 6),
            "lower_bound": p.lower_bound,
            "upper_bound": p.upper_bound,
            "locked": p.locked,
            "category": p.category,
            "description": p.description,
            "uncertainty": round(p.uncertainty, 6) if p.uncertainty is not None else None,
        }

    def _build_rietveld_params(self, session: ManualRefinementSession) -> RietveldParameters:
        p = session.parameters
        return RietveldParameters(
            scale=p.get("scale", _as_ref("scale")).value,
            zero_shift=p.get("zero_shift", _as_ref("zero_shift")).value,
            background_coeffs=[
                p.get("bg_c0", _as_ref("bg_c0")).value,
                p.get("bg_c1", _as_ref("bg_c1")).value,
                p.get("bg_c2", _as_ref("bg_c2")).value,
                p.get("bg_c3", _as_ref("bg_c3")).value,
            ],
            U=p.get("U", _as_ref("U")).value,
            V=p.get("V", _as_ref("V")).value,
            W=p.get("W", _as_ref("W")).value,
            eta=p.get("eta", _as_ref("eta")).value,
            phase_fractions=[],
            lattice_params=[],
        )

    def _build_lattice_param_defs(self, phase_cifs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        defs = []
        for p_idx, cif_data in enumerate(phase_cifs):
            uc = cif_data.get("unit_cell", {})
            cs = cif_data.get("crystal_system", "Cubic")
            if cs is None:
                cs = "Cubic"
            cs = cs.capitalize()

            a0 = float(uc.get("a", 5.0) if uc.get("a") else 5.0)
            b0 = float(uc.get("b", 5.0) if uc.get("b") else 5.0)
            c0 = float(uc.get("c", 5.0) if uc.get("c") else 5.0)
            alpha0 = float(uc.get("alpha", 90.0) if uc.get("alpha") else 90.0)
            beta0 = float(uc.get("beta", 90.0) if uc.get("beta") else 90.0)
            gamma0 = float(uc.get("gamma", 90.0) if uc.get("gamma") else 90.0)
            formula = cif_data.get("formula", f"Phase {p_idx+1}")

            if cs == "Cubic":
                defs.append({
                    "name": f"lattice_p{p_idx}_a",
                    "label": f"Lattice a ({formula})",
                    "value": a0, "lower": a0 * 0.95, "upper": a0 * 1.05,
                    "description": f"Cubic lattice parameter a for {formula}",
                })
            elif cs in ("Tetragonal", "Hexagonal", "Trigonal"):
                defs.append({
                    "name": f"lattice_p{p_idx}_a",
                    "label": f"Lattice a ({formula})",
                    "value": a0, "lower": a0 * 0.95, "upper": a0 * 1.05,
                    "description": f"Lattice parameter a for {formula}",
                })
                defs.append({
                    "name": f"lattice_p{p_idx}_c",
                    "label": f"Lattice c ({formula})",
                    "value": c0, "lower": c0 * 0.95, "upper": c0 * 1.05,
                    "description": f"Lattice parameter c for {formula}",
                })
            elif cs == "Orthorhombic":
                for lp, val in [("a", a0), ("b", b0), ("c", c0)]:
                    defs.append({
                        "name": f"lattice_p{p_idx}_{lp}",
                        "label": f"Lattice {lp} ({formula})",
                        "value": val, "lower": val * 0.95, "upper": val * 1.05,
                        "description": f"Lattice parameter {lp} for {formula}",
                    })
            elif cs == "Monoclinic":
                for lp, val in [("a", a0), ("b", b0), ("c", c0), ("beta", beta0)]:
                    defs.append({
                        "name": f"lattice_p{p_idx}_{lp}",
                        "label": f"Lattice {lp} ({formula})",
                        "value": val, "lower": val * 0.95, "upper": val * 1.05,
                        "description": f"Lattice parameter {lp} for {formula}",
                    })
            else:  # Triclinic
                for lp, val in [("a", a0), ("b", b0), ("c", c0), ("alpha", alpha0), ("beta", beta0), ("gamma", gamma0)]:
                    defs.append({
                        "name": f"lattice_p{p_idx}_{lp}",
                        "label": f"Lattice {lp} ({formula})",
                        "value": val, "lower": val * 0.95, "upper": val * 1.05,
                        "description": f"Lattice parameter {lp} for {formula}",
                    })
        return defs

    def _build_phase_fraction_defs(self, phase_cifs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        n = len(phase_cifs)
        if n <= 1:
            return []
        defs = []
        for i in range(n - 1):
            formula = phase_cifs[i].get("formula", f"Phase {i+1}")
            defs.append({
                "name": f"phase_frac_{i}",
                "label": f"Phase Fraction ({formula})",
                "value": 1.0 / n,
                "lower": 0.0,
                "upper": 1.0,
                "description": f"Weight fraction of {formula}",
            })
        return defs

    def _build_phase_lattice_info(self, phase_cifs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build lattice info mapping matching RietveldService's internal format."""
        info_list = []
        current_idx = 10 + max(0, len(phase_cifs) - 1)

        for cif_data in phase_cifs:
            uc = cif_data.get("unit_cell", {})
            a0 = float(uc.get("a", 5.0) if uc.get("a") else 5.0)
            b0 = float(uc.get("b", 5.0) if uc.get("b") else 5.0)
            c0 = float(uc.get("c", 5.0) if uc.get("c") else 5.0)
            alpha0 = float(uc.get("alpha", 90.0) if uc.get("alpha") else 90.0)
            beta0 = float(uc.get("beta", 90.0) if uc.get("beta") else 90.0)
            gamma0 = float(uc.get("gamma", 90.0) if uc.get("gamma") else 90.0)

            cs = cif_data.get("crystal_system", "Cubic")
            if cs is None:
                cs = "Cubic"
            cs = cs.capitalize()

            info = {
                "crystal_system": cs,
                "initial": (a0, b0, c0, alpha0, beta0, gamma0),
                "param_indices": [],
            }

            if cs == "Cubic":
                info["param_indices"] = [current_idx]
                current_idx += 1
            elif cs in ("Tetragonal", "Hexagonal", "Trigonal"):
                info["param_indices"] = [current_idx, current_idx + 1]
                current_idx += 2
            elif cs == "Orthorhombic":
                info["param_indices"] = [current_idx, current_idx + 1, current_idx + 2]
                current_idx += 3
            elif cs == "Monoclinic":
                info["param_indices"] = [current_idx, current_idx + 1, current_idx + 2, current_idx + 3]
                current_idx += 4
            else:  # Triclinic
                info["param_indices"] = list(range(current_idx, current_idx + 6))
                current_idx += 6

            info_list.append(info)
        return info_list

    def _get_lattice_param_names(self, crystal_system: str) -> List[str]:
        if crystal_system == "Cubic":
            return ["a"]
        elif crystal_system in ("Tetragonal", "Hexagonal", "Trigonal"):
            return ["a", "c"]
        elif crystal_system == "Orthorhombic":
            return ["a", "b", "c"]
        elif crystal_system == "Monoclinic":
            return ["a", "b", "c", "beta"]
        else:
            return ["a", "b", "c", "alpha", "beta", "gamma"]


def _as_ref(name: str) -> RefinementParameter:
    """Create a fallback RefinementParameter for missing entries."""
    d = _param_def(name)
    return RefinementParameter(
        name=name,
        label=d.get("label", name),
        value=d.get("default", 0.0),
        initial_value=d.get("default", 0.0),
        lower_bound=d.get("lower", -1e9),
        upper_bound=d.get("upper", 1e9),
        locked=True,
        category=d.get("category", "unknown"),
        description=d.get("description", ""),
    )
