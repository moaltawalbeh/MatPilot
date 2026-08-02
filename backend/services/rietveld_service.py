"""Rietveld Refinement Service.

Real Rietveld refinement using scipy.optimize.least_squares.
"""

import logging
import math
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
import numpy as np
from scipy.optimize import least_squares

from backend.domain.value_objects.wavelength import Wavelength, RadiationType

logger = logging.getLogger("rietveld_service")

# ---------------------------------------------------------------------------
# Scientific constants (authoritative source: docs/research_rietveld.md).
# ---------------------------------------------------------------------------

# Canonical NIST Cu K-alpha weighted-average wavelength, imported from the
# shared value object (backend/domain/value_objects/wavelength.py) so the
# refinement engine and the peak generators always agree.
CU_KA_AVG_ANGSTROM = Wavelength.from_radiation_type(
    RadiationType.Cu_K_ALPHA_AVG
).value_angstrom

# Thompson-Cox-Hastings (1987) pseudo-Voigt mixing approximation.
#   Gamma^5 = Gamma_G^5 + 2.69269*Gamma_G^4*Gamma_L + 2.42843*Gamma_G^3*Gamma_L^2
#           + 4.45163*Gamma_G^2*Gamma_L^3 + 0.07842*Gamma_G*Gamma_L^4 + Gamma_L^5
#   eta = 1.36603*q - 0.47719*q^2 + 0.11116*q^3,  q = Gamma_L/Gamma
TCH_GAMMA_COEFFS = (2.69269, 2.42843, 4.45163, 0.07842, 1.0)
TCH_ETA_COEFFS = (1.36603, -0.47719, 0.11116)

# Scherrer crystallite size (K = 1, FWHM convention) and Stokes-Wilson
# maximum microstrain (beta = 4*eps*tan(theta)).
SCHERRER_K = 1.0
STOKES_WILSON_STRAIN_COEFF = 4.0

# Poisson weights w = 1/y_obs (doc section 5) with a relative floor as a
# numerical guard. Counts are never exactly zero in practice (there is always
# background), but the synthetic/denoised data can contain zero channels; a
# floor proportional to the data maximum keeps the weights bounded and
# invariant under an overall intensity rescaling while leaving them ~1/y for
# every meaningful channel.
WEIGHT_FLOOR = 0.05

# Peak truncation window in units of the TCH total FWHM (doc section 6
# recommendation: n1 = n2 = 20).
PROFILE_TRUNCATION_FWHM = 20.0

# Default goniometer radius (mm) for the sample-displacement correction.
GONIOMETER_RADIUS_MM = 200.0

# Parameter vector layout (shared by RietveldService.refine() and the manual
# refinement service). Fixed base parameters occupy indices 0..12, phase
# fractions follow at N_BASE_PARAMS.., then per-phase lattice parameters.
IDX_SCALE = 0
IDX_ZERO_SHIFT = 1
IDX_BG = 2            # 4 Chebyshev background coefficients: 2..5
IDX_U = 6             # Caglioti Gaussian term, rad^2
IDX_V = 7             # Caglioti Gaussian term, rad^2
IDX_W = 8             # Caglioti Gaussian term, rad^2
IDX_SIZE = 9          # crystallite size, Angstrom (Scherrer)
IDX_STRAIN = 10       # microstrain eps (dimensionless)
IDX_PO = 11           # March-Dollase preferred-orientation parameter r
IDX_SAMPLE_DISP = 12  # sample displacement, mm
N_BASE_PARAMS = 13


@dataclass
class RietveldParameters:
    scale: float = 1.0
    zero_shift: float = 0.0
    background_coeffs: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])
    U: float = 0.005
    V: float = -0.002
    W: float = 0.01
    size_angstrom: float = 1000.0
    microstrain_eps: float = 0.0
    preferred_orientation: float = 1.0
    sample_displacement: float = 0.0
    eta: float = 0.5
    phase_fractions: List[float] = field(default_factory=list)
    lattice_params: List[Dict[str, float]] = field(default_factory=list)


@dataclass
class RietveldResult:
    success: bool = False
    message: str = ""
    r_wp: Optional[float] = None
    r_p: Optional[float] = None
    r_exp: Optional[float] = None
    r_wp_bg_subtracted: Optional[float] = None
    chi_squared: Optional[float] = None
    gof: Optional[float] = None
    durbin_watson: Optional[float] = None
    two_theta: List[float] = field(default_factory=list)
    observed: List[float] = field(default_factory=list)
    calculated: List[float] = field(default_factory=list)
    difference: List[float] = field(default_factory=list)
    background: List[float] = field(default_factory=list)
    parameters: Optional[RietveldParameters] = None
    parameter_uncertainties: Optional[Dict[str, float]] = None
    phases_used: List[Dict[str, Any]] = field(default_factory=list)
    iterations: int = 0
    bragg_markers: List[Dict[str, Any]] = field(default_factory=list)
    refinement_history: List[Dict[str, Any]] = field(default_factory=list)
    history: List[Dict[str, Any]] = field(default_factory=list)


class RietveldService:
    # Canonical NIST Cu K-alpha weighted-average wavelength (Angstrom),
    # imported from backend/domain/value_objects/wavelength.py.
    WAVELENGTH_CU_KA = CU_KA_AVG_ANGSTROM

    def __init__(self, wavelength: float = WAVELENGTH_CU_KA):
        self._wavelength = wavelength

    def refine(
        self,
        two_theta_obs: np.ndarray,
        intensity_obs: np.ndarray,
        phase_cifs: List[Dict[str, Any]],
        wavelength: Optional[float] = None,
        max_iter: int = 200,
    ) -> RietveldResult:
        wl = wavelength or self._wavelength

        if len(two_theta_obs) < 10:
            return RietveldResult(success=False, message="Insufficient data points for refinement")
        if not phase_cifs:
            return RietveldResult(success=False, message="No phases provided for refinement")

        tth = np.asarray(two_theta_obs, dtype=np.float64)
        i_obs = np.asarray(intensity_obs, dtype=np.float64)

        i_obs_max = np.max(i_obs) if np.max(i_obs) > 0 else 1.0
        i_obs_norm = i_obs / i_obs_max

        all_phase_peaks = []
        for cif_data in phase_cifs:
            peaks = self._generate_phase_peaks(cif_data, wl, np.max(tth))
            if peaks:
                max_theo = max(p["intensity"] for p in peaks) if peaks else 1.0
                if max_theo > 0:
                    for p in peaks:
                        p["intensity"] = p["intensity"] / max_theo
            all_phase_peaks.append(peaks)

        if not any(peaks for peaks in all_phase_peaks):
            return RietveldResult(
                success=False,
                message="No theoretical peaks generated from CIF data"
            )

        n_phases = len(phase_cifs)
        n_bg = 4
        n_frac = max(0, n_phases - 1)
        n_base_params = N_BASE_PARAMS + n_frac

        # Build initial guess for base parameters
        x0 = np.zeros(n_base_params)
        x0[IDX_BG:IDX_BG + n_bg] = self._fit_initial_background(tth, i_obs_norm)
        bg_est = float(np.percentile(i_obs_norm, 10))
        x0[IDX_SCALE] = self._estimate_initial_scale(i_obs_norm, tth, all_phase_peaks, bg_est)
        x0[IDX_ZERO_SHIFT] = 0.0
        x0[IDX_U] = 1e-4
        x0[IDX_V] = -5e-5
        x0[IDX_W] = 3e-5
        x0[IDX_SIZE] = 1000.0
        x0[IDX_STRAIN] = 0.0
        x0[IDX_PO] = 1.0
        x0[IDX_SAMPLE_DISP] = 0.0
        if n_frac > 0:
            x0[N_BASE_PARAMS:N_BASE_PARAMS + n_frac] = 1.0 / n_phases

        # Base parameter bounds
        lower = np.full(n_base_params, -np.inf)
        upper = np.full(n_base_params, np.inf)
        lower[IDX_SCALE] = 0.001;   upper[IDX_SCALE] = 50.0
        lower[IDX_ZERO_SHIFT] = -2.0;   upper[IDX_ZERO_SHIFT] = 2.0
        lower[IDX_U] = 0.0;         upper[IDX_U] = 0.01
        lower[IDX_V] = -0.005;      upper[IDX_V] = 0.005
        lower[IDX_W] = 0.0;         upper[IDX_W] = 0.01
        lower[IDX_SIZE] = 10.0;     upper[IDX_SIZE] = 1e5
        lower[IDX_STRAIN] = 0.0;    upper[IDX_STRAIN] = 0.05
        lower[IDX_PO] = 0.01;       upper[IDX_PO] = 100.0
        lower[IDX_SAMPLE_DISP] = -5.0;  upper[IDX_SAMPLE_DISP] = 5.0

        # Build lattice parameter mapping & bounds
        phase_lattice_info = []
        current_idx = n_base_params

        for p, cif_data in enumerate(phase_cifs):
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
                x0_append = [a0]
                lower_append = [a0 * 0.95]
                upper_append = [a0 * 1.05]
                current_idx += 1
            elif cs in ("Tetragonal", "Hexagonal", "Trigonal"):
                info["param_indices"] = [current_idx, current_idx + 1]
                x0_append = [a0, c0]
                lower_append = [a0 * 0.95, c0 * 0.95]
                upper_append = [a0 * 1.05, c0 * 1.05]
                current_idx += 2
            elif cs == "Orthorhombic":
                info["param_indices"] = [current_idx, current_idx + 1, current_idx + 2]
                x0_append = [a0, b0, c0]
                lower_append = [a0 * 0.95, b0 * 0.95, c0 * 0.95]
                upper_append = [a0 * 1.05, b0 * 1.05, c0 * 1.05]
                current_idx += 3
            elif cs == "Monoclinic":
                info["param_indices"] = [current_idx, current_idx + 1, current_idx + 2, current_idx + 3]
                x0_append = [a0, b0, c0, beta0]
                lower_append = [a0 * 0.95, b0 * 0.95, c0 * 0.95, beta0 * 0.95]
                upper_append = [a0 * 1.05, b0 * 1.05, c0 * 1.05, beta0 * 1.05]
                current_idx += 4
            else: # Triclinic / Default
                info["param_indices"] = list(range(current_idx, current_idx + 6))
                x0_append = [a0, b0, c0, alpha0, beta0, gamma0]
                lower_append = [a0 * 0.95, b0 * 0.95, c0 * 0.95, alpha0 * 0.95, beta0 * 0.95, gamma0 * 0.95]
                upper_append = [a0 * 1.05, b0 * 1.05, c0 * 1.05, alpha0 * 1.05, beta0 * 1.05, gamma0 * 1.05]
                current_idx += 6

            phase_lattice_info.append(info)
            x0 = np.concatenate([x0, x0_append])
            lower = np.concatenate([lower, lower_append])
            upper = np.concatenate([upper, upper_append])

        # Clip initial values to bounds
        for i in range(len(x0)):
            if lower[i] > -1e30:
                x0[i] = max(x0[i], lower[i])
            if upper[i] < 1e30:
                x0[i] = min(x0[i], upper[i])

        iteration_history: List[Dict[str, Any]] = []
        iteration_counter = [0]
        
        def _tracking_residuals(params, tth, i_obs, all_phase_peaks, n_bg, n_frac):
            iteration_counter[0] += 1
            i_calc = self._calculate_pattern(params, tth, all_phase_peaks, n_bg, n_frac, phase_lattice_info, wl)
            residuals = i_calc - i_obs
            # Unified Poisson weights w = 1/y_obs (research doc section 5).
            # Returning sqrt(w)*(y_c - y_o) makes J^T J the weighted normal
            # matrix A = sum w (dy_c/dp)(dy_c/dp)^T, so parameter esd's can be
            # read straight from the inverted matrix (section 7).
            weights = self._weights(i_obs)
            weighted_res = residuals * np.sqrt(weights)
            cost = float(np.sum(residuals ** 2 * weights))
            rwp = self._compute_rwp(i_obs, i_calc)
            rp = self._compute_rp(i_obs, i_calc)
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
                _tracking_residuals,
                x0,
                args=(tth, i_obs_norm, all_phase_peaks, n_bg, n_frac),
                bounds=(lower, upper),
                method='trf',
                max_nfev=max_iter,
                ftol=1e-12,
                xtol=1e-12,
                gtol=1e-12,
            )
            n_iter = result.nfev
            logger.info("Converged in %d iterations, cost=%.6f", n_iter, result.cost)
        except Exception as e:
            logger.error("Refinement failed: %s", e)
            return RietveldResult(success=False, message=f"Refinement failed: {e}")

        # Stop reporting refinement if no actual optimization has occurred
        if result.nfev <= 1 or np.allclose(result.x, x0, rtol=1e-6, atol=1e-6):
            return RietveldResult(success=False, message="Refinement terminated: No actual optimization step was taken by the least-squares solver.")

        x_final = result.x
        params = self._unpack_params(x_final, n_bg, n_frac, n_phases, phase_lattice_info)

        i_calc = self._calculate_pattern(x_final, tth, all_phase_peaks, n_bg, n_frac, phase_lattice_info, wl) * i_obs_max
        bg = self._chebyshev_bg(x_final[IDX_BG:IDX_BG + n_bg], tth) * i_obs_max
        diff = i_obs - i_calc

        r_wp = self._compute_rwp(i_obs, i_calc)
        r_p = self._compute_rp(i_obs, i_calc)
        r_wp_bg_sub = self._compute_rwp_bg_subtracted(i_obs, i_calc, bg)

        # Add final iteration
        if iteration_history and iteration_history[-1]["iteration"] != iteration_counter[0]:
            iteration_history.append({
                "iteration": iteration_counter[0],
                "rwp": round(r_wp, 4),
                "rp": round(r_p, 4),
                "cost": round(float(result.cost), 6),
            })

        # Calculate Rexp (expected R-factor). Same weights as the optimizer
        # and the reported Rwp (research doc section 5).
        n_data = len(tth)
        n_params_used = len(x_final)
        weights_rexp = self._weights(i_obs)
        sum_w_y2 = float(np.sum(weights_rexp * i_obs ** 2))
        if sum_w_y2 > 0 and n_data > n_params_used:
            r_exp = math.sqrt((n_data - n_params_used) / sum_w_y2) * 100.0
        else:
            r_exp = None

        # Chi-squared = (Rwp / Rexp)^2
        if r_exp and r_exp > 0:
            chi_sq = (r_wp / r_exp) ** 2
            gof = math.sqrt(chi_sq)
        else:
            chi_sq = (r_wp / 100.0) ** 2 * n_data / max(n_data - n_params_used, 1) if n_data > n_params_used else 0.0
            gof = math.sqrt(chi_sq) if chi_sq > 0 else 0.0

        # Calculate Durbin-Watson statistic
        diff_arr = np.array(diff)
        dw_numerator = np.sum(np.diff(diff_arr) ** 2)
        dw_denominator = np.sum(diff_arr ** 2)
        durbin_watson = float(dw_numerator / dw_denominator) if dw_denominator > 0 else 0.0

        # Compute covariance matrix and parameter uncertainties.
        # esd_j = sqrt(chi^2 * (A^-1)_jj) with A = J^T J the weighted normal
        # matrix (J = Jacobian of sqrt(w)*(y_c - y_o)) and
        # chi^2 = sum w (y_o - y_c)^2/(N - P) (research doc section 7).
        uncertainties = np.zeros(len(x_final))
        try:
            jacobian = result.jac
            jtj = jacobian.T @ jacobian
            cov = np.linalg.pinv(jtj)
            reduced_chi_sq = np.sum(result.fun ** 2) / max(1, n_data - n_params_used)
            cov = cov * reduced_chi_sq
            diag = np.maximum(np.diag(cov), 0.0)
            uncertainties = np.sqrt(diag)
            uncertainties = np.where(np.isfinite(uncertainties), uncertainties, 0.0)
        except Exception as e:
            logger.warning("Could not estimate uncertainties: %s", e)

        # Unpack parameter uncertainties
        param_names = [
            "scale", "zero_shift", "bg_c0", "bg_c1", "bg_c2", "bg_c3",
            "U", "V", "W", "size_angstrom", "microstrain_eps",
            "preferred_orientation", "sample_displacement",
        ]
        for p in range(n_frac):
            param_names.append(f"fraction_phase_{p+1}")
            
        param_uncertainties = {}
        for name, unc in zip(param_names, uncertainties[:len(param_names)]):
            param_uncertainties[name] = round(float(unc), 6)

        # Add lattice parameter uncertainties to each phase
        lattice_param_uncertainties = []
        for p, info in enumerate(phase_lattice_info):
            indices = info["param_indices"]
            cs = info["crystal_system"]
            uncs = {}
            if cs == "Cubic" and len(indices) >= 1:
                uncs["a"] = round(float(uncertainties[indices[0]]), 6)
            elif cs in ("Tetragonal", "Hexagonal", "Trigonal") and len(indices) >= 2:
                uncs["a"] = round(float(uncertainties[indices[0]]), 6)
                uncs["c"] = round(float(uncertainties[indices[1]]), 6)
            elif cs == "Orthorhombic" and len(indices) >= 3:
                uncs["a"] = round(float(uncertainties[indices[0]]), 6)
                uncs["b"] = round(float(uncertainties[indices[1]]), 6)
                uncs["c"] = round(float(uncertainties[indices[2]]), 6)
            elif cs == "Monoclinic" and len(indices) >= 4:
                uncs["a"] = round(float(uncertainties[indices[0]]), 6)
                uncs["b"] = round(float(uncertainties[indices[1]]), 6)
                uncs["c"] = round(float(uncertainties[indices[2]]), 6)
                uncs["beta"] = round(float(uncertainties[indices[3]]), 6)
            elif cs == "Triclinic" and len(indices) >= 6:
                uncs["a"] = round(float(uncertainties[indices[0]]), 6)
                uncs["b"] = round(float(uncertainties[indices[1]]), 6)
                uncs["c"] = round(float(uncertainties[indices[2]]), 6)
                uncs["alpha"] = round(float(uncertainties[indices[3]]), 6)
                uncs["beta"] = round(float(uncertainties[indices[4]]), 6)
                uncs["gamma"] = round(float(uncertainties[indices[5]]), 6)
            lattice_param_uncertainties.append(uncs)

        phase_info = []
        for i, (cif_data, peaks) in enumerate(zip(phase_cifs, all_phase_peaks)):
            frac = params.phase_fractions[i] if i < len(params.phase_fractions) else 1.0
            
            # Recalculate final lattice parameters and volume
            info = phase_lattice_info[i]
            a_f, b_f, c_f, alpha_f, beta_f, gamma_f = self._get_lattice_parameters(x_final, info)
            
            # General unit cell volume calculation
            cos_a = math.cos(math.radians(alpha_f))
            cos_b = math.cos(math.radians(beta_f))
            cos_g = math.cos(math.radians(gamma_f))
            volume = a_f * b_f * c_f * math.sqrt(
                max(0.0, 1.0 - cos_a**2 - cos_b**2 - cos_g**2 + 2.0 * cos_a * cos_b * cos_g)
            )

            # Recalculate final peak positions for Bragg markers
            g_star = self._compute_reciprocal_metric_tensor(a_f, b_f, c_f, alpha_f, beta_f, gamma_f)
            bragg_peaks = []
            for peak in peaks:
                h, k, l = self._get_hkl(peak)
                tth_calc = self._calculate_two_theta(h, k, l, g_star, wl, peak["two_theta"])
                bragg_peaks.append(round(tth_calc, 4))

            phase_info.append({
                "formula": cif_data.get("formula", ""),
                "name": cif_data.get("name", ""),
                "space_group": cif_data.get("space_group", ""),
                "fraction": round(frac, 4),
                "n_peaks": len(peaks),
                "lattice_params": {
                    "a": round(a_f, 4),
                    "b": round(b_f, 4),
                    "c": round(c_f, 4),
                    "alpha": round(alpha_f, 4),
                    "beta": round(beta_f, 4),
                    "gamma": round(gamma_f, 4),
                    "volume": round(volume, 4),
                },
                "lattice_param_uncertainties": lattice_param_uncertainties[i],
                "bragg_peaks": bragg_peaks,
            })

        # Build Bragg reflection markers from all phase peaks
        bragg_markers = []
        for i, (cif_data, peaks) in enumerate(zip(phase_cifs, all_phase_peaks)):
            phase_name = cif_data.get("name", cif_data.get("formula", f"Phase {i+1}"))
            frac = params.phase_fractions[i] if i < len(params.phase_fractions) else 1.0
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
                    "phase_fraction": round(frac, 4),
                })

        # Map exit status to human-readable termination reason
        status_reasons = {
            1: "Gradient norm is smaller than tolerance (gtol).",
            2: "Relative change in cost function is smaller than tolerance (ftol).",
            3: "Relative change in parameters is smaller than tolerance (xtol).",
            4: "Both cost function and parameter change tolerances satisfied.",
            0: "Maximum number of iterations/evaluations exceeded.",
            -1: "Invalid parameters or optimizer error."
        }
        termination_reason = status_reasons.get(result.status, f"Termination status code {result.status}")

        return RietveldResult(
            success=True,
            message=f"Rietveld refinement completed in {n_iter} iterations (Rwp={r_wp:.2f}%, Rp={r_p:.2f}%, Rexp={r_exp:.2f}%, GoF={gof:.4f})",
            r_wp=round(r_wp, 4),
            r_p=round(r_p, 4),
            r_exp=round(r_exp, 4) if r_exp else None,
            r_wp_bg_subtracted=round(r_wp_bg_sub, 4),
            chi_squared=round(chi_sq, 4),
            gof=round(gof, 4),
            durbin_watson=round(durbin_watson, 4),
            two_theta=tth.tolist(),
            observed=i_obs.tolist(),
            calculated=i_calc.tolist(),
            difference=diff.tolist(),
            background=bg.tolist(),
            parameters=params,
            parameter_uncertainties=param_uncertainties,
            phases_used=phase_info,
            iterations=n_iter,
            bragg_markers=bragg_markers,
            refinement_history=iteration_history,
            history=iteration_history,
        )

    def _get_hkl(self, peak: Dict[str, Any]) -> Tuple[int, int, int]:
        """Extract HKL indices from peak dict."""
        if "h" in peak and "k" in peak and "l" in peak:
            return int(peak["h"]), int(peak["k"]), int(peak["l"])
        hkl_str = peak.get("hkl", "")
        hkl_str = hkl_str.replace("(", "").replace(")", "").strip()
        parts = hkl_str.split()
        if len(parts) == 3:
            try:
                return int(parts[0]), int(parts[1]), int(parts[2])
            except ValueError:
                pass
        if len(hkl_str) == 3:
            try:
                return int(hkl_str[0]), int(hkl_str[1]), int(hkl_str[2])
            except ValueError:
                pass
        return 0, 0, 0

    def _compute_reciprocal_metric_tensor(self, a, b, c, alpha, beta, gamma) -> np.ndarray:
        """Compute the reciprocal metric tensor G* (inverse metric tensor)."""
        alpha_r = math.radians(alpha)
        beta_r = math.radians(beta)
        gamma_r = math.radians(gamma)
        
        g = np.zeros((3, 3))
        g[0, 0] = a * a
        g[1, 1] = b * b
        g[2, 2] = c * c
        g[0, 1] = g[1, 0] = a * b * math.cos(gamma_r)
        g[0, 2] = g[2, 0] = a * c * math.cos(beta_r)
        g[1, 2] = g[2, 1] = b * c * math.cos(alpha_r)
        
        try:
            return np.linalg.inv(g)
        except np.linalg.LinAlgError:
            return np.diag([1.0 / (a * a), 1.0 / (b * b), 1.0 / (c * c)])

    def _calculate_two_theta(self, h, k, l, g_star, wavelength, fallback_2theta) -> float:
        """Calculate shifted two_theta using the reciprocal metric tensor."""
        if h == 0 and k == 0 and l == 0:
            return fallback_2theta
        hkl_vec = np.array([h, k, l], dtype=float)
        inv_d_sq = float(hkl_vec @ g_star @ hkl_vec)
        if inv_d_sq > 0:
            d_spacing = 1.0 / math.sqrt(inv_d_sq)
            sin_theta = wavelength / (2.0 * d_spacing)
            if 0 < sin_theta < 1.0:
                return 2.0 * math.degrees(math.asin(sin_theta))
        return fallback_2theta

    def _get_lattice_parameters(self, x, info) -> Tuple[float, float, float, float, float, float]:
        """Extract lattice parameters from the parameter vector based on symmetry constraints."""
        a0, b0, c0, alpha0, beta0, gamma0 = info["initial"]
        indices = info["param_indices"]
        cs = info["crystal_system"]
        
        if not indices:
            return a0, b0, c0, alpha0, beta0, gamma0

        if cs == "Cubic":
            a = x[indices[0]]
            return a, a, a, 90.0, 90.0, 90.0
        elif cs in ("Tetragonal", "Hexagonal", "Trigonal"):
            a = x[indices[0]]
            c = x[indices[1]]
            if cs == "Tetragonal":
                return a, a, c, 90.0, 90.0, 90.0
            else: # Hexagonal / Trigonal
                return a, a, c, 90.0, 90.0, 120.0
        elif cs == "Orthorhombic":
            a = x[indices[0]]
            b = x[indices[1]]
            c = x[indices[2]]
            return a, b, c, 90.0, 90.0, 90.0
        elif cs == "Monoclinic":
            a = x[indices[0]]
            b = x[indices[1]]
            c = x[indices[2]]
            beta = x[indices[3]]
            return a, b, c, 90.0, beta, 90.0
        else: # Triclinic / Default
            a = x[indices[0]]
            b = x[indices[1]]
            c = x[indices[2]]
            alpha = x[indices[3]]
            beta = x[indices[4]]
            gamma = x[indices[5]]
            return a, b, c, alpha, beta, gamma

    def _estimate_initial_scale(self, i_obs_norm, tth, all_phase_peaks, bg_est):
        best_peak = None
        best_intensity = 0.0
        for peaks in all_phase_peaks:
            for p in peaks:
                if p["intensity"] > best_intensity:
                    best_intensity = p["intensity"]
                    best_peak = p
        if best_peak is None:
            return 1.0

        target_tth = best_peak["two_theta"]
        idx = int(np.argmin(np.abs(tth - target_tth)))
        obs_at_peak = max(float(i_obs_norm[idx]) - bg_est, 0.01)

        fwhm_est = 0.3
        sigma_est = fwhm_est / (2.0 * math.sqrt(2.0 * math.log(2.0)))
        peak_height = 1.0 / (sigma_est * math.sqrt(2.0 * math.pi))

        scale_est = obs_at_peak / (best_intensity * peak_height)
        return max(0.1, min(10.0, scale_est))

    def _fit_initial_background(self, tth, i_obs_norm):
        n_bg = 4
        window_size = max(5, len(tth) // 50)
        n_windows = len(tth) // window_size

        if n_windows < n_bg:
            return [float(np.percentile(i_obs_norm, 10))] + [0.0] * (n_bg - 1)

        tth_mins = []
        bg_mins = []
        for i in range(n_windows):
            start = i * window_size
            end = min(start + window_size, len(tth))
            tth_mins.append(float(np.mean(tth[start:end])))
            bg_mins.append(float(np.min(i_obs_norm[start:end])))

        tth_mins = np.array(tth_mins)
        bg_mins = np.maximum(np.array(bg_mins), 0.0)

        X = np.column_stack([(tth_mins / 100.0) ** i for i in range(n_bg)])
        try:
            coeffs, _, _, _ = np.linalg.lstsq(X, bg_mins, rcond=None)
            return [max(0.0, float(c)) if i == 0 else float(c) for i, c in enumerate(coeffs)]
        except np.linalg.LinAlgError:
            return [float(np.percentile(i_obs_norm, 10))] + [0.0] * (n_bg - 1)

    def _generate_phase_peaks(self, cif_data, wavelength, max_two_theta):
        """Generate theoretical peaks from CIF data."""
        formula = cif_data.get("formula", "?")
        logger.info("Generating theoretical peaks for %s", formula)

        precomputed = cif_data.get("_theoretical_peaks")
        if precomputed:
            logger.info("Using %d pre-computed peaks for %s", len(precomputed), formula)
            return precomputed

        cif_content = cif_data.get("_cif_content")
        if cif_content:
            try:
                from backend.reference.pymatgen_pattern_generator import PymatgenPatternGenerator
                pym_gen = PymatgenPatternGenerator(wavelength=wavelength)
                if pym_gen.available:
                    peaks = pym_gen.generate_from_cif_content(
                        cif_content, max_two_theta=max_two_theta
                    )
                    if peaks:
                        logger.info("pymatgen generated %d peaks from CIF content for %s", len(peaks), formula)
                        return peaks
            except Exception as e:
                logger.warning("pymatgen CIF content path failed for %s: %s", formula, e)

        try:
            from backend.reference.pymatgen_pattern_generator import PymatgenPatternGenerator
            pym_gen = PymatgenPatternGenerator(wavelength=wavelength)
            if pym_gen.available:
                peaks = pym_gen.generate_from_parsed_data(
                    cif_data, max_two_theta=max_two_theta
                )
                if peaks:
                    logger.info("pymatgen generated %d peaks from parsed data for %s", len(peaks), formula)
                    return peaks
        except Exception as e:
            logger.warning("pymatgen parsed data path failed for %s: %s", formula, e)

        try:
            from backend.reference.theoretical_pattern import TheoreticalPatternGenerator
            gen = TheoreticalPatternGenerator(wavelength=wavelength)
            peaks = gen.generate_pattern(cif_data, max_two_theta=max_two_theta)
            if peaks:
                logger.info("numpy generator produced %d peaks for %s", len(peaks), formula)
                return peaks
        except Exception as e:
            logger.warning("numpy generator failed for %s: %s", formula, e)

        return []

    def _compute_residuals(self, params, tth, i_obs, all_phase_peaks, n_bg, n_frac, phase_lattice_info, wavelength):
        i_calc = self._calculate_pattern(params, tth, all_phase_peaks, n_bg, n_frac, phase_lattice_info, wavelength)
        residuals = i_calc - i_obs
        weights = self._weights(i_obs)
        return residuals * np.sqrt(weights)

    def _calculate_pattern(self, params, tth, all_phase_peaks, n_bg, n_frac, phase_lattice_info, wavelength):
        scale = params[IDX_SCALE]
        zero_shift = params[IDX_ZERO_SHIFT]
        bg_coeffs = params[IDX_BG:IDX_BG + n_bg]
        U, V, W = params[IDX_U], params[IDX_V], params[IDX_W]
        size_angstrom = params[IDX_SIZE]
        strain = params[IDX_STRAIN]
        march = params[IDX_PO]
        sample_disp_mm = params[IDX_SAMPLE_DISP]

        bg = self._chebyshev_bg(bg_coeffs, tth)
        i_total = np.zeros_like(tth, dtype=np.float64)
        n_phases = len(all_phase_peaks)

        for phase_idx, peaks in enumerate(all_phase_peaks):
            if not peaks:
                continue

            if phase_idx < n_phases - 1 and n_frac > 0:
                frac = max(0.0, min(1.0, params[N_BASE_PARAMS + phase_idx]))
            else:
                frac = 1.0
                if n_frac > 0:
                    frac -= np.sum(params[N_BASE_PARAMS:N_BASE_PARAMS + n_frac])
                frac = max(0.0, min(1.0, frac))

            info = phase_lattice_info[phase_idx]
            a, b, c, alpha, beta, gamma = self._get_lattice_parameters(params, info)
            g_star = self._compute_reciprocal_metric_tensor(a, b, c, alpha, beta, gamma)

            for peak in peaks:
                h, k, l = self._get_hkl(peak)
                tth_calc = self._calculate_two_theta(h, k, l, g_star, wavelength, peak["two_theta"])
                theta_rad = math.radians(tth_calc / 2.0)
                tth_shifted = tth_calc + zero_shift
                if sample_disp_mm != 0.0:
                    # Sample-displacement correction:
                    # Delta(2theta) = -2*(s/R)*cos(theta) (Klug & Alexander).
                    tth_shifted += (
                        -2.0 * (sample_disp_mm / GONIOMETER_RADIUS_MM)
                        * math.cos(theta_rad) * (180.0 / math.pi)
                    )

                # Gaussian (instrumental) FWHM: Gamma_G^2 = U*tan^2(theta) +
                # V*tan(theta) + W (Caglioti, research doc section 1). The
                # Caglioti equation uses theta, not 2theta.
                tan_theta = math.tan(theta_rad)
                fwhm_g_sq = U * tan_theta * tan_theta + V * tan_theta + W
                fwhm_g_rad = math.sqrt(max(fwhm_g_sq, 0.0))

                # Lorentzian FWHM from crystallite size (Scherrer, K = 1) and
                # microstrain (Stokes-Wilson max strain, beta = 4*eps*tan theta):
                #   Gamma_L = K*lambda/(D*cos theta) + 4*eps*tan theta
                cos_theta = math.cos(theta_rad)
                fwhm_l_rad = 0.0
                if size_angstrom > 0 and cos_theta > 0:
                    fwhm_l_rad += SCHERRER_K * wavelength / (size_angstrom * cos_theta)
                fwhm_l_rad += STOKES_WILSON_STRAIN_COEFF * strain * tan_theta

                # TCH total FWHM and mixing parameter eta.
                fwhm_tot_rad, eta = self._tch_mixing(fwhm_g_rad, fwhm_l_rad)

                # March-Dollase preferred orientation (default texture axis [001]).
                # r = 1 is random orientation and leaves intensities untouched.
                intensity = float(peak["intensity"])
                if march != 1.0 and march > 0 and intensity > 0:
                    intensity *= self._march_dollase(h, k, l, g_star, march)

                # Truncate each reflection's evaluation window to
                # +/- n*FWHM (research doc section 6).
                window_deg = PROFILE_TRUNCATION_FWHM * math.degrees(fwhm_tot_rad)
                mask = np.abs(tth - tth_shifted) <= window_deg
                if not np.any(mask):
                    continue
                fwhm_l_deg = math.degrees(max(fwhm_l_rad, 1e-9))
                fwhm_g_deg = math.degrees(max(fwhm_g_rad, 1e-9))
                profile = np.zeros_like(tth)
                profile[mask] = self._pseudo_voigt(
                    tth[mask], tth_shifted, fwhm_l_deg, fwhm_g_deg, eta
                )
                i_total[mask] += frac * intensity * profile[mask]

        return scale * i_total + bg

    def _tch_mixing(self, fwhm_g_rad, fwhm_l_rad) -> Tuple[float, float]:
        """Total FWHM and mixing parameter via the TCH (1987) approximation.

        Gamma^5 = Gamma_G^5 + 2.69269*Gamma_G^4*Gamma_L + 2.42843*Gamma_G^3*Gamma_L^2
                + 4.45163*Gamma_G^2*Gamma_L^3 + 0.07842*Gamma_G*Gamma_L^4 + Gamma_L^5
        eta = 1.36603*q - 0.47719*q^2 + 0.11116*q^3,  q = Gamma_L/Gamma.

        eta is clamped to [0, 1]; eta = 0 is pure Gaussian, eta = 1 pure
        Lorentzian (research doc section 1).
        """
        gg, gl = float(fwhm_g_rad), float(fwhm_l_rad)
        total = (
            gg ** 5
            + TCH_GAMMA_COEFFS[0] * gg ** 4 * gl
            + TCH_GAMMA_COEFFS[1] * gg ** 3 * gl ** 2
            + TCH_GAMMA_COEFFS[2] * gg ** 2 * gl ** 3
            + TCH_GAMMA_COEFFS[3] * gg * gl ** 4
            + TCH_GAMMA_COEFFS[4] * gl ** 5
        )
        if total <= 0:
            return 1e-6, 0.0
        gamma = total ** 0.2
        q = gl / gamma
        eta = (
            TCH_ETA_COEFFS[0] * q
            + TCH_ETA_COEFFS[1] * q ** 2
            + TCH_ETA_COEFFS[2] * q ** 3
        )
        return gamma, min(1.0, max(0.0, eta))

    def _march_dollase(self, h, k, l, g_star, march) -> float:
        """March-Dollase preferred-orientation factor (research doc section 2).

        P(alpha) = (r^2*cos^2(alpha) + r^-1*sin^2(alpha))^(-3/2), where alpha is
        the angle between the reflection's scattering vector Q_k = h a* + k b* +
        l c* and the preferred-orientation (texture) axis (default [001]).
        r = 1 gives P = 1 (random orientation).
        """
        if h == 0 and k == 0 and l == 0:
            return 1.0
        q = np.array([float(h), float(k), float(l)])
        po_axis = np.array([0.0, 0.0, 1.0])
        q_norm = float(q @ g_star @ q)
        po_norm = float(po_axis @ g_star @ po_axis)
        if q_norm <= 0 or po_norm <= 0:
            return 1.0
        cos_alpha = float(q @ g_star @ po_axis) / math.sqrt(q_norm * po_norm)
        cos_alpha = min(1.0, max(-1.0, cos_alpha))
        sin_alpha_sq = max(0.0, 1.0 - cos_alpha * cos_alpha)
        r = float(march)
        base = r * r * cos_alpha * cos_alpha + (1.0 / r) * sin_alpha_sq
        return max(1e-6, base) ** -1.5

    def _pseudo_voigt(self, x, x0, fwhm_l=None, fwhm_g=None, eta=0.5, **kwargs):
        """Area-normalized pseudo-Voigt with independent L/G widths.

        pV(x) = eta*L(x) + (1-eta)*G(x) with
            L(x) = 1/(pi*gamma_L*(1+(x/gamma_L)^2)),      gamma_L = FWHM_L/2
            G(x) = 1/(gamma_G*sqrt(2*pi))*exp(-x^2/(2*gamma_G^2)),
                                                          gamma_G = FWHM_G/(2*sqrt(2*ln2))
        (research doc section 1). The Lorentzian width is driven by size/strain
        broadening and the Gaussian width by the Caglioti instrument function.
        Each component is normalized so the integral of pV over x is 1.

        For backward compatibility, a single ``fwhm`` keyword is accepted and
        applied to both widths.
        """
        if "fwhm" in kwargs:
            shared = float(kwargs["fwhm"])
            if fwhm_l is None:
                fwhm_l = shared
            if fwhm_g is None:
                fwhm_g = shared
        if fwhm_l is None:
            fwhm_l = fwhm_g
        if fwhm_g is None:
            fwhm_g = fwhm_l
        gamma_l = max(fwhm_l / 2.0, 1e-9)
        delta = x - x0
        lorentz = 1.0 / (math.pi * gamma_l * (1.0 + (delta / gamma_l) ** 2))
        gamma_g = max(fwhm_g / (2.0 * math.sqrt(2.0 * math.log(2.0))), 1e-9)
        gauss = (1.0 / (gamma_g * math.sqrt(2.0 * math.pi))) * np.exp(
            -0.5 * (delta / gamma_g) ** 2
        )
        return eta * lorentz + (1.0 - eta) * gauss

    def _weights(self, y_obs) -> np.ndarray:
        """Poisson weights w = 1/sigma^2 with sigma^2 ~ y_obs (doc section 5).

        A tiny relative floor guards against division by zero while leaving the
        weights proportional to 1/y for every meaningful data point.
        """
        y = np.asarray(y_obs, dtype=np.float64)
        if y.size == 0:
            return np.zeros(0, dtype=np.float64)
        floor = max(WEIGHT_FLOOR * float(np.max(y)), 1e-10)
        return 1.0 / np.maximum(y, floor)

    def _polynomial_bg(self, coeffs, tth):
        bg = np.zeros_like(tth, dtype=np.float64)
        for i, c in enumerate(coeffs):
            bg += c * (tth / 100.0) ** i
        return bg

    def _chebyshev_bg(self, coeffs, tth):
        """Chebyshev background polynomial on x in [-1, 1] (doc section 3).

        background(tth) = sum_j c_j * T_j(x),  x = 2*(tth - tth_min)/span - 1,
        T_0(x)=1, T_1(x)=x, T_j(x)=2x*T_{j-1}(x) - T_{j-2}(x). All coefficient
        terms share the background polynomial so the constant term keeps its
        natural offset.
        """
        tth = np.asarray(tth, dtype=np.float64)
        x_min = float(np.min(tth)) if tth.size else 0.0
        x_max = float(np.max(tth)) if tth.size else 1.0
        span = max(x_max - x_min, 1e-12)
        x = 2.0 * (tth - x_min) / span - 1.0
        bg = np.zeros_like(tth, dtype=np.float64)
        n = len(coeffs)
        if n == 0:
            return bg
        t_prev = np.ones_like(x)
        t_curr = x.copy()
        bg = bg + float(coeffs[0]) * t_prev
        if n >= 2:
            bg = bg + float(coeffs[1]) * t_curr
        for j in range(2, n):
            t_next = 2.0 * x * t_curr - t_prev
            bg = bg + float(coeffs[j]) * t_next
            t_prev, t_curr = t_curr, t_next
        return bg

    def _compute_rwp(self, i_obs, i_calc):
        # Same weights as the optimizer and Rexp (research doc section 5):
        # w = 1/y_obs with a tiny relative floor.
        weights = self._weights(i_obs)
        numerator = np.sum(weights * (i_obs - i_calc) ** 2)
        denominator = np.sum(weights * i_obs ** 2)
        if denominator <= 0:
            return 0.0
        return float(math.sqrt(numerator / denominator) * 100.0)

    def _compute_rp(self, i_obs, i_calc):
        denominator = np.sum(np.abs(i_obs))
        if denominator <= 0:
            return 0.0
        return float(np.sum(np.abs(i_obs - i_calc)) / denominator * 100.0)

    def _compute_rwp_bg_subtracted(self, i_obs, i_calc, bg):
        """Background-subtracted weighted profile R-factor (doc section 5).

        Because a refined background artificially lowers Rwp (the constant offset
        is reproduced almost for free), the IUCr guidelines recommend reporting
        Rwp against the background-subtracted observed intensity:

            Rwp(b-s)^2 = sum w_i (y_obs,i - y_calc,i)^2
                         / sum w_i (y_obs,i - y_bg,i)^2

        with the same Poisson weights used for the ordinary Rwp. Both the
        calculated pattern and the observed pattern are background-subtracted
        in the denominator only; the numerator keeps the full-model residual so
        the statistic still reflects the total fit quality.
        """
        i_obs = np.asarray(i_obs, dtype=np.float64)
        i_calc = np.asarray(i_calc, dtype=np.float64)
        bg = np.asarray(bg, dtype=np.float64)
        weights = self._weights(i_obs)
        numerator = np.sum(weights * (i_obs - i_calc) ** 2)
        denominator = np.sum(weights * (i_obs - bg) ** 2)
        if denominator <= 0:
            return 0.0
        return float(math.sqrt(numerator / denominator) * 100.0)

    def _unpack_params(self, x, n_bg, n_frac, n_phases, phase_lattice_info):
        bg_coeffs = x[IDX_BG:IDX_BG + n_bg].tolist()
        phase_fractions = []
        for i in range(n_phases):
            if i < n_phases - 1 and i < n_frac:
                phase_fractions.append(float(max(0.0, min(1.0, x[N_BASE_PARAMS + i]))))
            elif n_phases == 1:
                phase_fractions.append(1.0)
            else:
                frac = 1.0 - sum(phase_fractions)
                phase_fractions.append(max(0.0, frac))

        lattice_params = []
        for info in phase_lattice_info:
            a_f, b_f, c_f, alpha_f, beta_f, gamma_f = self._get_lattice_parameters(x, info)
            lattice_params.append({
                "a": a_f, "b": b_f, "c": c_f,
                "alpha": alpha_f, "beta": beta_f, "gamma": gamma_f
            })

        return RietveldParameters(
            scale=float(max(0.0, x[IDX_SCALE])),
            zero_shift=float(x[IDX_ZERO_SHIFT]),
            background_coeffs=bg_coeffs,
            U=float(max(0.0, x[IDX_U])),
            V=float(x[IDX_V]),
            W=float(max(0.0, x[IDX_W])),
            size_angstrom=float(max(0.0, x[IDX_SIZE])),
            microstrain_eps=float(max(0.0, x[IDX_STRAIN])),
            preferred_orientation=float(max(0.0, x[IDX_PO])),
            sample_displacement=float(x[IDX_SAMPLE_DISP]),
            phase_fractions=phase_fractions,
            lattice_params=lattice_params
        )


class ResidualEvaluator:
    """Wrapper to compute residuals and track iteration history."""
    def __init__(self, service, tth, i_obs, all_phase_peaks, n_bg, n_frac, phase_lattice_info, wavelength):
        self.service = service
        self.tth = tth
        self.i_obs = i_obs
        self.all_phase_peaks = all_phase_peaks
        self.n_bg = n_bg
        self.n_frac = n_frac
        self.phase_lattice_info = phase_lattice_info
        self.wavelength = wavelength
        self.history = []
        self.iter_count = 0
        self.last_x = None

    def evaluate(self, x) -> np.ndarray:
        i_calc = self.service._calculate_pattern(
            x, self.tth, self.all_phase_peaks, self.n_bg, self.n_frac, self.phase_lattice_info, self.wavelength
        )
        residuals = i_calc - self.i_obs
        weights = self.service._weights(self.i_obs)
        weighted_residuals = residuals * np.sqrt(weights)
        cost = 0.5 * np.sum(weighted_residuals ** 2)

        if self.last_x is None or not np.allclose(x, self.last_x, rtol=1e-5, atol=1e-5):
            self.iter_count += 1
            self.last_x = x.copy()
            r_wp = self.service._compute_rwp(self.i_obs, i_calc)
            r_p = self.service._compute_rp(self.i_obs, i_calc)
            self.history.append({
                "iteration": self.iter_count,
                "residual": float(cost),
                "r_wp": float(r_wp),
                "r_p": float(r_p),
                "parameters": x.tolist(),
            })

        return weighted_residuals
