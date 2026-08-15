from typing import List, Dict, Any, Tuple, Optional
import numpy as np

class UVVisComputationEngine:
    """
    Scientific Computation Engine strictly for UV-Vis Spectroscopy.
    Handles optical calculations, Kubelka-Munk transformations, Tauc plots,
    direct/indirect band gap estimations, and extrapolation fit quality checks.
    """
    
    def kubelka_munk_transform(self, reflectance_pct: List[float]) -> List[float]:
        """
        Transforms Diffuse Reflectance (%R) into Kubelka-Munk F(R) values.
        F(R) = (1 - R)^2 / (2R)
        """
        r_arr = np.clip(np.array(reflectance_pct) / 100.0, 0.001, 0.999)
        f_r = ((1.0 - r_arr)**2) / (2.0 * r_arr)
        return f_r.tolist()

    def generate_tauc_plot(
        self,
        wavelength_nm: List[float],
        intensity: List[float],
        transition_type: str = "direct_allowed"
    ) -> Tuple[List[float], List[float]]:
        """
        Generates Photon Energy (hν in eV) vs (α * hν)^(1/n) for Tauc plot formulation.
        n values:
          - direct_allowed: n = 1/2 -> power = 2.0
          - indirect_allowed: n = 2 -> power = 0.5
          - direct_forbidden: n = 3/2 -> power = 2/3
          - indirect_forbidden: n = 3 -> power = 1/3
        """
        wl = np.array(wavelength_nm)
        # Avoid division by zero
        wl = np.clip(wl, 100.0, 2500.0)
        
        # hν = h*c / λ = 1239.8 / λ (nm)
        energy_ev = 1239.8 / wl
        
        power_map = {
            "direct_allowed": 2.0,
            "indirect_allowed": 0.5,
            "direct_forbidden": 2.0 / 3.0,
            "indirect_forbidden": 1.0 / 3.0
        }
        power = power_map.get(transition_type, 2.0)
        
        y_raw = np.maximum(np.array(intensity), 0.0)
        tauc_y = (y_raw * energy_ev) ** power
        
        # Sort energy ascending for standard Tauc plot representation
        sort_indices = np.argsort(energy_ev)
        return energy_ev[sort_indices].tolist(), tauc_y[sort_indices].tolist()

    def estimate_band_gap(
        self,
        energy_ev: List[float],
        tauc_y: List[float]
    ) -> Dict[str, Any]:
        """
        Estimates the optical band gap (Eg in eV) by locating the maximum linear slope 
        at the absorption edge, fitting a tangent line, and calculating the x-intercept at y=0.
        Also evaluates the coefficient of determination (R²) for fit validity.
        """
        x = np.array(energy_ev)
        y = np.array(tauc_y)
        
        if len(x) < 5 or len(y) < 5:
            return {
                "band_gap_ev": None,
                "r_squared": 0.0,
                "absorption_edge_nm": None,
                "fit_status": "INSUFFICIENT_DATA"
            }
            
        # Numerical derivative
        dy = np.gradient(y, x)
        max_idx = np.argmax(dy)
        
        # Select linear window around maximum derivative point (±3 indices)
        window_start = max(0, max_idx - 3)
        window_end = min(len(x), max_idx + 4)
        
        x_win = x[window_start:window_end]
        y_win = y[window_start:window_end]
        
        if len(x_win) < 2:
            return {
                "band_gap_ev": None,
                "r_squared": 0.0,
                "absorption_edge_nm": None,
                "fit_status": "POOR_SLOPE"
            }

        # Linear regression y = mx + c
        slope, intercept = np.polyfit(x_win, y_win, 1)
        
        if slope <= 0:
            return {
                "band_gap_ev": None,
                "r_squared": 0.0,
                "absorption_edge_nm": None,
                "fit_status": "NON_PHYSICAL_SLOPE"
            }

        # x-intercept at y = 0 => Eg = -intercept / slope
        eg_ev = -intercept / slope
        
        # Calculate R² fit quality
        y_pred = slope * x_win + intercept
        ss_res = np.sum((y_win - y_pred) ** 2)
        ss_tot = np.sum((y_win - np.mean(y_win)) ** 2)
        r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        
        # Physical bounds sanity check (0.2 eV to 8.0 eV)
        if 0.2 <= eg_ev <= 8.0:
            edge_nm = 1239.8 / eg_ev
            return {
                "band_gap_ev": float(round(eg_ev, 3)),
                "r_squared": float(round(r_squared, 4)),
                "absorption_edge_nm": float(round(edge_nm, 1)),
                "slope": float(round(slope, 4)),
                "tangent_intercept": float(round(intercept, 4)),
                "fit_status": "PASS" if r_squared >= 0.85 else "AMBIGUOUS_EDGE"
            }
            
        return {
            "band_gap_ev": None,
            "r_squared": float(round(r_squared, 4)),
            "absorption_edge_nm": None,
            "fit_status": "OUT_OF_PHYSICAL_BOUNDS"
        }

