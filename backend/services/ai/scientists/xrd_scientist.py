from typing import Dict, Any, List

class XRDScientistAgent:
    """
    AI Agent specifically trained for XRD interpretation.
    Adheres strictly to the Scientific Terminology Standard and AI Guardrails.
    Outputs structured sections: OBSERVATION, REFERENCE EVIDENCE, INTERPRETATION, CONFIDENCE / LIMITATION.
    """
    
    def __init__(self):
        self.persona = (
            "You are an expert crystallographer specializing in X-Ray Diffraction (XRD). "
            "You must use proper terminology: 'Bragg reflections', 'd-spacing', 'Miller indices', 'crystallite size', "
            "'Rietveld refinement', and 'preferred orientation'. Never use terms from FTIR or Raman. "
            "Your output must be strictly based on the validated computational results provided to you. "
            "Never invent peaks, phases, or lattice parameters."
        )

    def analyze(self, validated_results: Dict[str, Any], validation_metrics: Dict[str, Any], reference_matches: list) -> Dict[str, Any]:
        confidence = validation_metrics.get("confidence_score", 0.90)
        flags = validation_metrics.get("flags", [])
        
        peaks = validated_results.get("peaks", [])
        rietveld = validated_results.get("rietveld_results", {})
        
        # 1. OBSERVATION
        obs_lines = []
        if peaks:
            top_peaks = peaks[:3]
            peak_str = ", ".join([f"{p.get('two_theta', p.get('two_theta_deg', 0)):.2f}° 2θ (d = {p.get('d_spacing_angstrom', 0):.4f} Å)" for p in top_peaks])
            obs_lines.append(f"- Primary Bragg reflections observed at: {peak_str}.")
        if rietveld.get("refinement_performed"):
            obs_lines.append(f"- Full-profile Rietveld fit yielded R_wp = {rietveld.get('R_wp', 0):.2f}%, χ² = {rietveld.get('chi_squared', 0):.2f}.")
        else:
            obs_lines.append("- Analysis Level: Peak detection and phase identification (Rietveld profile refinement not requested).")

        observation_text = "\n".join(obs_lines) if obs_lines else "- Diffractogram contains low signal-to-noise ratio reflections."

        # 2. REFERENCE EVIDENCE
        ref_lines = []
        if reference_matches:
            top_match = reference_matches[0]
            ref_lines.append(f"- Candidate Phase Match: **{top_match.get('material_name')}** (Space Group: {top_match.get('space_group', 'N/A')}, Score: {top_match.get('match_score', 0):.2f}) from COD.")
        else:
            ref_lines.append("- No high-confidence match found in the crystallographic reference database.")
        reference_text = "\n".join(ref_lines)

        # 3. INTERPRETATION
        interp_lines = []
        if rietveld.get("phase_fractions_wt_percent"):
            fractions = rietveld["phase_fractions_wt_percent"]
            frac_str = ", ".join([f"{p['phase_name']}: {p['weight_percent']:.1f}%" for p in fractions])
            interp_lines.append(f"Phase composition estimated via profile fit: {frac_str}.")
        elif reference_matches:
            interp_lines.append(f"Diffractogram peak positions are consistent with crystalline {reference_matches[0].get('material_name')}.")
        else:
            interp_lines.append("Diffraction pattern exhibits crystalline features; phase indexing requires complementary element constraints.")
        interpretation_text = "\n".join(interp_lines)

        # 4. CONFIDENCE / LIMITATION
        lim_lines = [f"- Validation Confidence Score: {confidence * 100:.1f}%."]
        if flags:
            lim_lines.append(f"- Processing Warning Flags: {', '.join(flags)}.")
        lim_lines.append("- Limitation: Peak overlap or preferred orientation may affect phase quantification; confirm with Raman or TEM.")
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
            "agent_name": "XRD AI Scientist",
            "sections": {
                "observation": observation_text,
                "reference_evidence": reference_text,
                "interpretation": interpretation_text,
                "confidence_limitation": limitation_text
            }
        }

