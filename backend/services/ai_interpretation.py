"""Per-technique AI interpretation for instrument workspaces.

Each instrument gets its own interpretation prompt so the assistant speaks the
language of that characterization technique: functional groups and vibrational
modes for FTIR, characteristic shifts and materials for Raman, optical
transitions and band gaps for UV-Vis, crystallography for XRD.

Reuses the same Groq chat backend as the AI assistant (``backend/api/routers/chat.py``)
so no new credentials are needed; without a ``GROQ_API_KEY`` it returns a
graceful, rule-based fallback built from the analysis summary.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPTS: Dict[str, str] = {
    "ftir": (
        "You are MatPilot's FTIR spectroscopy interpreter. You explain infrared "
        "spectra: functional groups, characteristic band positions, peak "
        "assignments, vibrational modes, and what the spectrum implies about "
        "molecular structure and sample composition. Be concise and scientific. "
        "If data is insufficient, say so. Respond in the language of the user's "
        "request."
    ),
    "raman": (
        "You are MatPilot's Raman spectroscopy interpreter. You explain Raman "
        "spectra: characteristic Raman shifts, phonon/molecular modes, crystal "
        "structure fingerprints, and material identification. Interpret matching "
        "scores and confidence honestly. Be concise and scientific. If data is "
        "insufficient, say so. Respond in the language of the user's request."
    ),
    "uvvis": (
        "You are MatPilot's UV-Vis spectroscopy interpreter. You explain optical "
        "spectra: absorbance/reflectance features, Kubelka-Munk transforms, Tauc "
        "plots, direct and indirect band gaps, optical transitions, and what they "
        "mean for the material's electronic structure. Be concise and scientific. "
        "If data is insufficient, say so. Respond in the language of the user's "
        "request."
    ),
    "xrd": (
        "You are MatPilot's X-ray diffraction interpreter. You explain diffraction "
        "results: detected phases, lattice parameters, Rietveld refinement quality "
        "metrics, and crystallite size / microstrain. Be concise and scientific. "
        "If data is insufficient, say so. Respond in the language of the user's "
        "request."
    ),
}


def _build_context(technique: str, results: Optional[Dict[str, Any]]) -> str:
    """Curate the analysis payload into a compact, prompt-safe context string."""
    results = results or {}
    pieces: Dict[str, Any] = {"technique": technique}

    if technique == "ftir":
        pieces["functional_groups"] = results.get("functional_groups", [])
        pieces["peaks"] = results.get("peaks", [])[:20]
        pieces["deconvolution"] = results.get("deconvolution")
        pieces["stats"] = results.get("stats")
    elif technique == "raman":
        pieces["peaks"] = results.get("peaks", [])[:20]
        pieces["cosmic_rays"] = results.get("cosmic_rays")
        pieces["matching"] = results.get("matching")
        pieces["stats"] = results.get("stats")
    elif technique == "uvvis":
        pieces["peaks"] = results.get("peaks", [])
        pieces["transitions"] = results.get("transitions")
        pieces["tauc"] = results.get("tauc")
        pieces["kubelka_munk"] = results.get("kubelka_munk")
        pieces["stats"] = results.get("stats")
    elif technique == "xrd":
        pieces["candidate_phases"] = results.get("candidate_phases", [])[:10]
        pieces["rietveld_results"] = results.get("rietveld_results")
    return json.dumps(pieces, default=str)


def interpret(
    technique: str,
    experiment_name: str,
    results: Optional[Dict[str, Any]],
    question: str = "Interpret these results for me.",
) -> Dict[str, str]:
    """Return a per-technique interpretation of an experiment's analysis."""
    technique = (technique or "").strip().lower()
    system_prompt = SYSTEM_PROMPTS.get(technique, SYSTEM_PROMPTS["xrd"])
    context = _build_context(technique, results)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {
            "interpretation": (
                f"AI interpretation is not configured (GROQ_API_KEY missing). "
                f"Here is a summary of the {technique} results for '{experiment_name}':\n\n"
                f"{context}"
            ),
            "model": "none",
        }

    try:
        from groq import Groq
    except ImportError:
        return {
            "interpretation": (
                f"AI interpretation is unavailable (groq package not installed). "
                f"Here is a summary of the {technique} results for '{experiment_name}':\n\n"
                f"{context}"
            ),
            "model": "none",
        }

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"Experiment: {experiment_name}\n"
                f"Analysis results (JSON): {context}\n\n"
                f"{question}"
            ),
        },
    ]
    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.4,
        )
        return {
            "interpretation": completion.choices[0].message.content,
            "model": MODEL,
        }
    except Exception as exc:
        return {
            "interpretation": (
                f"An error occurred while contacting the AI service: {exc}\n\n"
                f"Raw {technique} results for '{experiment_name}':\n{context}"
            ),
            "model": MODEL,
        }


def summarize_report(report_text: str, project_name: str) -> Dict[str, str]:
    """Generate a concise cross-technique AI summary of a workspace report."""
    system_prompt = (
        "You are MatPilot's workspace report summarizer. Read the materials "
        "characterization report and produce a concise, cross-technique AI summary "
        "(4-8 sentences) of the findings, highlighting the most significant results "
        "across all instruments and any material identification or band-gap "
        "determinations. Be scientific and precise. Respond in the language of the "
        "user's request."
    )
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {
            "ai_summary": (
                f"AI summary is not configured (GROQ_API_KEY missing). The report for "
                f"'{project_name}' covers the findings listed above."
            ),
            "model": "none",
        }

    try:
        from groq import Groq
    except ImportError:
        return {
            "ai_summary": (
                f"AI summary is unavailable (groq package not installed). The report "
                f"for '{project_name}' covers the findings listed above."
            ),
            "model": "none",
        }

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": f"Project: {project_name}\n\nWorkspace report:\n{report_text}",
        },
    ]
    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.4,
        )
        return {
            "ai_summary": completion.choices[0].message.content,
            "model": MODEL,
        }
    except Exception as exc:
        return {
            "ai_summary": f"An error occurred while contacting the AI service: {exc}",
            "model": MODEL,
        }
