from typing import Dict, Any, List

class RamanScientistAgent:
    """
    AI Agent specifically trained for Raman Spectroscopy interpretation.
    Adheres strictly to Scientific Terminology Standard and AI Guardrails.
    Outputs structured sections: OBSERVATION, REFERENCE EVIDENCE, INTERPRETATION, CONFIDENCE / LIMITATION.
    """
    
    def __init__(self):
        self.persona = (
            "You are an expert solid-state physicist specializing in Raman Spectroscopy. "
            "You must use proper terminology: 'Raman shift', 'phonons', 'Stokes scattering', "
            "'polarizability', 'FWHM', and 'D/G bands' if carbon is present. Never use terms from XRD or UV-Vis. "
            "Your output must be strictly based on the validated computational results provided to you."
        )

    def analyze(self, validated_results: Dict[str, Any], validation_metrics: Dict[str, Any], reference_matches: list) -> Dict[str, Any]:
        confidence = validation_metrics.get("confidence_score", 0.90)
        flags = validation_metrics.get("flags", [])
        peaks = validated_results.get("peaks", [])

        # 1. OBSERVATION
        obs_lines = []
        if peaks:
            top_shifts = [f"{p.get('raman_shift_cm1', p.get('raman_shift', 0)):.1f} cm⁻¹" for p in peaks[:3]]
            obs_lines.append(f"- Active Raman phonon modes observed at: {', '.join(top_shifts)}.")
        else:
            obs_lines.append("- Raman spectrum shows low signal-to-noise ratio or high background fluorescence.")
        observation_text = "\n".join(obs_lines)

        # 2. REFERENCE EVIDENCE
        ref_lines = []
        if reference_matches:
            top_match = reference_matches[0]
            ref_lines.append(f"- RRUFF Reference Match: **{top_match.get('material_name')}** (Score: {top_match.get('match_score', 0):.2f}).")
            if top_match.get("evidence"):
                ref_lines.append(f"- Evidence: {top_match.get('evidence')}.")
        else:
            ref_lines.append("- No exact reference spectral match found in RRUFF / ROD databases.")
        reference_text = "\n".join(ref_lines)

        # 3. INTERPRETATION
        interp_lines = []
        if reference_matches and ("Graphene" in reference_matches[0].get("material_name", "") or "Graphite" in reference_matches[0].get("material_name", "")):
            interp_lines.append("Raman profile displays characteristic G-band (~1580 cm⁻¹) and D-band (~1350 cm⁻¹) of sp² carbon lattices.")
        elif peaks:
            interp_lines.append(f"Primary Raman active mode at {peaks[0].get('raman_shift_cm1', 0):.1f} cm⁻¹ reflects lattice polarizability changes consistent with solid-state crystal symmetry.")
        else:
            interp_lines.append("Lacks prominent Raman active modes; sample may require altered laser excitation wavelength.")
        interpretation_text = "\n".join(interp_lines)

        # 4. CONFIDENCE / LIMITATION
        lim_lines = [f"- Validation Confidence Score: {confidence * 100:.1f}%."]
        if flags:
            lim_lines.append(f"- Processing Warning Flags: {', '.join(flags)}.")
        lim_lines.append("- Limitation: Fluorescence background or laser heating may distort peak shapes; verify with complementary FTIR.")
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
            "agent_name": "Raman AI Scientist",
            "sections": {
                "observation": observation_text,
                "reference_evidence": reference_text,
                "interpretation": interpretation_text,
                "confidence_limitation": limitation_text
            }
        }

