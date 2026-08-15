from typing import Dict, Any, List

class FTIRScientistAgent:
    """
    AI Agent specifically trained for FTIR Spectroscopy interpretation.
    Adheres strictly to Scientific Terminology Standard and AI Guardrails.
    Outputs structured sections: OBSERVATION, REFERENCE EVIDENCE, INTERPRETATION, CONFIDENCE / LIMITATION.
    """
    
    def __init__(self):
        self.persona = (
            "You are an expert analytical chemist specializing in Fourier-Transform Infrared (FTIR) Spectroscopy. "
            "You must use proper terminology: 'transmittance', 'absorbance bands', 'wavenumber', 'vibrational modes', "
            "'stretching', 'bending', and 'fingerprint region'. Never use terms from XRD or Raman. "
            "Your output must be strictly based on the validated computational results provided to you. "
            "Never fabricate functional groups or reference matches without spectral evidence."
        )

    def analyze(self, validated_results: Dict[str, Any], validation_metrics: Dict[str, Any], reference_matches: list) -> Dict[str, Any]:
        confidence = validation_metrics.get("confidence_score", 0.90)
        flags = validation_metrics.get("flags", [])
        peaks = validated_results.get("peaks", [])

        # 1. OBSERVATION
        obs_lines = []
        if peaks:
            assigned = [p for p in peaks if p.get("assigned_group") and "Unassigned" not in p.get("assigned_group", "")]
            fingerprint = [p for p in peaks if p.get("is_fingerprint_region")]
            obs_lines.append(f"- Detected {len(peaks)} absorption bands across the 4000-400 cm⁻¹ range ({len(fingerprint)} in fingerprint region).")
            if assigned:
                band_str = ", ".join([f"{p['wavenumber_cm1']:.1f} cm⁻¹ ({p.get('assigned_group', '')})" for p in assigned[:3]])
                obs_lines.append(f"- Characteristic absorption bands: {band_str}.")
        else:
            obs_lines.append("- Spectral profile lacks distinct absorption minima above noise threshold.")

        observation_text = "\n".join(obs_lines)

        # 2. REFERENCE EVIDENCE
        ref_lines = []
        if reference_matches:
            top_match = reference_matches[0]
            ref_lines.append(f"- Library Correlation: **{top_match.get('material_name')}** (Match Score: {top_match.get('match_score', 0):.2f}) via {top_match.get('provider_source', 'OpenSpecy')}.")
            if top_match.get("evidence"):
                ref_lines.append(f"- Evidence: {top_match.get('evidence')}.")
        else:
            ref_lines.append("- No conclusive library correlation found in infrared reference database.")
        reference_text = "\n".join(ref_lines)

        # 3. INTERPRETATION
        interp_lines = []
        if peaks:
            groups_found = set([p.get("assigned_group") for p in peaks if p.get("assigned_group") and "Unassigned" not in p.get("assigned_group", "")])
            if groups_found:
                interp_lines.append(f"Vibrational analysis indicates presence of: {', '.join(groups_found)}.")
            else:
                interp_lines.append("Observed absorption features reside primarily in complex finger-print region; requires complementary Raman or NMR confirmation.")
        else:
            interp_lines.append("Spectrum indicates an IR-transparent or non-absorbing sample matrix under current measurement parameters.")
        interpretation_text = "\n".join(interp_lines)

        # 4. CONFIDENCE / LIMITATION
        lim_lines = [f"- Validation Confidence Score: {confidence * 100:.1f}%."]
        if flags:
            lim_lines.append(f"- Processing Warning Flags: {', '.join(flags)}.")
        lim_lines.append("- Limitation: Single peak assignment does not guarantee chemical identity without considering broad band envelope and neighboring features.")
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
            "agent_name": "FTIR AI Scientist",
            "sections": {
                "observation": observation_text,
                "reference_evidence": reference_text,
                "interpretation": interpretation_text,
                "confidence_limitation": limitation_text
            }
        }

