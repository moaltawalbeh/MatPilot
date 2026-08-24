"""Shared per-experiment summaries and key-findings for instrument workspaces.

Both the instruments API router and the workspace report service use these
helpers so JSON responses and generated report text always describe a result
with the same structure.
"""

from typing import Any, Dict, List


def experiment_summary(exp) -> Dict[str, Any]:
    """Compact, technique-aware summary used for list/detail responses."""
    results = getattr(exp, "analysis_results", None) or {}
    technique = (getattr(exp, "technique", "") or "").lower()
    if technique == "ftir":
        groups = results.get("functional_groups", [])
        return {
            "functional_groups": groups,
            "peak_count": len(results.get("peaks", [])),
            "deconvolution": results.get("deconvolution"),
        }
    if technique == "raman":
        matching = results.get("matching") or {}
        matches = matching.get("matches") or []
        return {
            "top_match": matches[0] if matches else None,
            "peak_count": len(results.get("peaks", [])),
            "cosmic_rays_removed": len(results.get("cosmic_rays", [])),
        }
    if technique == "uvvis":
        tauc = results.get("tauc") or {}
        direct = (tauc.get("direct") or {}).get("band_gap") or {}
        indirect = (tauc.get("indirect") or {}).get("band_gap") or {}
        return {
            "direct_gap_eV": direct.get("band_gap_eV"),
            "indirect_gap_eV": indirect.get("band_gap_eV"),
            "mode": results.get("mode"),
            "transitions": results.get("transitions"),
            "peak_count": len(results.get("peaks", [])),
        }
    return {
        "peak_count": len(results.get("peaks", [])) if results else 0,
    }


def experiment_findings(exp) -> List[str]:
    """Human-readable key findings per technique, used for report conclusions."""
    summary = experiment_summary(exp)
    technique = (getattr(exp, "technique", "") or "").lower()
    findings: List[str] = []

    if technique == "ftir":
        for group in summary.get("functional_groups", []):
            position = ""
            peaks = group.get("peaks") or []
            if peaks:
                position = f" near {peaks[0].get('position', 0):.1f} cm-1"
            findings.append(f"{group.get('group')} ({group.get('mode')}) detected{position}")
    elif technique == "raman":
        top = summary.get("top_match")
        if top:
            score = top.get("score")
            score_text = f"{score:.0f}" if isinstance(score, (int, float)) else str(score)
            findings.append(
                f"Best spectral match: {top.get('material')} "
                f"(score {score_text}, confidence {top.get('confidence')})"
            )
        else:
            findings.append("No reference match above threshold")
    elif technique == "uvvis":
        direct = summary.get("direct_gap_eV")
        indirect = summary.get("indirect_gap_eV")
        if isinstance(direct, (int, float)):
            findings.append(f"Direct band gap: {direct:.3f} eV")
        if isinstance(indirect, (int, float)):
            findings.append(f"Indirect band gap: {indirect:.3f} eV")
    else:
        phases = getattr(exp, "candidate_phases", []) or []
        if phases:
            names = [p.get("name") or str(p) for p in phases[:5]]
            findings.append("Candidate phases: " + ", ".join(names))
        rietveld = getattr(exp, "rietveld_results", None)
        if isinstance(rietveld, dict):
            refined = rietveld.get("phases") or []
            if refined:
                names = [
                    p.get("phase_name") or p.get("name") or str(p)
                    for p in refined[:5]
                ]
                findings.append("Refined phases: " + ", ".join(names))

    if not findings:
        findings.append("No findings recorded")
    return findings
