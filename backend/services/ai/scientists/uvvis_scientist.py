from typing import Dict, Any, List

class UVVisScientistAgent:
    """
    AI Agent specifically trained for UV-Vis Spectroscopy interpretation.
    Adheres strictly to Scientific Terminology Standard and AI Guardrails.
    Outputs structured sections: OBSERVATION, REFERENCE EVIDENCE, INTERPRETATION, CONFIDENCE / LIMITATION.
    """
    
    def __init__(self):
        self.persona = (
            "You are an expert optoelectronic physicist specializing in UV-Vis Spectroscopy. "
            "You must use proper terminology: 'absorbance', 'transmittance', 'reflectance', 'band gap', "
            "'Tauc plot', 'Kubelka-Munk', 'chromophores', and 'optical transition' (e.g. direct/indirect allowed). "
            "Never use terms from XRD or FTIR. "
            "Never state a band gap as an absolute constant if measurement mode, fitting R2, or optical data introduce limitations."
        )

    def analyze(self, validated_results: Dict[str, Any], validation_metrics: Dict[str, Any], reference_matches: list) -> Dict[str, Any]:
        confidence = validation_metrics.get("confidence_score", 0.90)
        flags = validation_metrics.get("flags", [])
        
        bg_ev = validated_results.get("band_gap_ev")
        edge_nm = validated_results.get("absorption_edge_nm")
        r_sq = validated_results.get("linear_fit_r_squared", validated_results.get("r_squared", 0.0))
        mode = validated_results.get("measurement_mode", "Transmission")

        # 1. OBSERVATION
        obs_lines = []
        obs_lines.append(f"- Optical measurement mode: {mode}.")
        if bg_ev:
            obs_lines.append(f"- Tauc plot tangent extrapolation yields optical band gap Eg = {bg_ev:.2f} eV (Absorption edge: {edge_nm:.1f} nm, Fit R² = {r_sq:.4f}).")
        else:
            obs_lines.append("- Spectral dataset lacks clear steep absorption edge supporting linear Tauc extrapolation.")
        observation_text = "\n".join(obs_lines)

        # 2. REFERENCE EVIDENCE
        ref_lines = []
        if reference_matches:
            top_match = reference_matches[0]
            ref_lines.append(f"- Optoelectronic Match: **{top_match.get('material_name')}** (Literature Eg: {top_match.get('literature_band_gap_ev', 'N/A')} eV, Score: {top_match.get('match_score', 0):.2f}).")
            if top_match.get("evidence"):
                ref_lines.append(f"- Corroboration: {top_match.get('evidence')}.")
        else:
            ref_lines.append("- No benchmark semiconductor reference matched for this optical bandgap.")
        reference_text = "\n".join(ref_lines)

        # 3. INTERPRETATION
        interp_lines = []
        if bg_ev:
            if bg_ev < 1.8:
                interp_lines.append("Narrow-bandgap semiconductor suitable for near-infrared (NIR) and solar spectrum harvesting.")
            elif 1.8 <= bg_ev <= 3.1:
                interp_lines.append("Visible-light active semiconductor with potential photocatalytic or photovoltaic functionality.")
            else:
                interp_lines.append("Wide-bandgap insulator / UV-absorbing oxide dielectric.")
        else:
            interp_lines.append("Data contains optical transmission/absorbance profile but does not support unambiguous bandgap determination.")
        interpretation_text = "\n".join(interp_lines)

        # 4. CONFIDENCE / LIMITATION
        lim_lines = [f"- Validation Confidence Score: {confidence * 100:.1f}%."]
        if flags:
            lim_lines.append(f"- Processing Warning Flags: {', '.join(flags)}.")
        lim_lines.append("- Limitation: Bandgap values derived from Tauc plots depend on transition type assumption (direct vs indirect) and fitting energy range selection; confirm with UPS or DFT.")
        limitation_text = "\n".join(lim_lines)

        full_html = (
            f"<h4>OBSERVATION</h4>\n<p>{observation_text}</p>\n"
            f"<h4>REFERENCE EVIDENCE</h4>\n<p>{reference_text}</p>\n"
            f"<h4>INTERPRETATION</h4>\n<p>{interpretation_text}</p>\n"
            f"<h4>CONFIDENCE & LIMITATIONS</h4>\n<p>{limitation_text}</p>"
        )

        return {
            "interpretation_html": full_html,
            "confidence_score": confidence,
            "agent_name": "UV-Vis AI Scientist",
            "sections": {
                "observation": observation_text,
                "reference_evidence": reference_text,
                "interpretation": interpretation_text,
                "confidence_limitation": limitation_text
            }
        }

