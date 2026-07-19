"""End-to-end validation: Complete scientific workflow.

Validates the full pipeline:
Upload Experimental XRD → Phase Identification → Search COD →
Download Candidate CIFs → Generate Theoretical Diffraction Pattern →
Run Automatic Rietveld Refinement → Return Refinement Statistics

This test uses the actual backend services (no HTTP server needed).
"""

import sys
import os
import asyncio
import numpy as np
import tempfile

sys.path.insert(0, r"C:\Users\Mohammad\Desktop\matpilot")

from backend.reference.engine.reference_engine import ReferenceEngine
from backend.reference.providers.cod_provider import CODProvider
from backend.reference.providers.local_cod_provider import LocalCODProvider
from backend.reference.theoretical_pattern import TheoreticalPatternGenerator
from backend.reference.pymatgen_pattern_generator import PymatgenPatternGenerator
from backend.reference.similarity_engine import SimilarityEngine
from backend.services.rietveld_service import RietveldService
from backend.services.peak_detection import detect_peaks


def generate_synthetic_silicon_xrd():
    """Generate a realistic synthetic Si XRD pattern for testing."""
    wavelength = 1.5406
    gen = TheoreticalPatternGenerator(wavelength=wavelength)

    # Real Si peak positions (Cu K-alpha)
    si_peaks = [
        (28.443, 100.0), (47.303, 55.0), (56.121, 30.0),
        (69.13, 10.0), (76.38, 10.0),
    ]

    two_theta = np.linspace(10, 80, 2000)
    intensity = np.zeros_like(two_theta)

    # Gaussian peak profiles
    for tth, rel_int in si_peaks:
        sigma = 0.12  # Instrument broadening
        intensity += rel_int * np.exp(-0.5 * ((two_theta - tth) / sigma) ** 2)

    # Normalize to ~1000 counts max
    intensity = intensity / np.max(intensity) * 1000

    # Add realistic noise
    np.random.seed(42)
    noise = np.random.normal(0, 8, len(two_theta))
    intensity = intensity + noise

    # Add background
    bg = 30 + 0.1 * two_theta
    intensity = intensity + bg

    # Ensure non-negative
    intensity = np.maximum(intensity, 0)

    return two_theta.tolist(), intensity.tolist()


def run_e2e_validation():
    """Execute the complete scientific workflow."""
    print("=" * 70)
    print("E2E VALIDATION: Complete Scientific Workflow")
    print("=" * 70)
    print()

    # ── Step 1: Generate synthetic experimental data ──────────
    print("Step 1: Generate synthetic Si XRD pattern")
    two_theta, intensity = generate_synthetic_silicon_xrd()
    print("  Data points: %d" % len(two_theta))
    print("  2T range: %.1f - %.1f" % (min(two_theta), max(two_theta)))
    print("  Max intensity: %.1f" % max(intensity))
    print()

    # ── Step 2: Peak detection ──────────────────────────────
    print("Step 2: Detect peaks in experimental pattern")
    peaks = detect_peaks(
        two_theta=two_theta,
        intensity=intensity,
        wavelength_angstrom=1.5406,
    )
    peak_dicts = [
        {"two_theta": p.two_theta, "intensity": p.intensity, "d_spacing": p.d_spacing}
        for p in peaks
    ]
    print("  Peaks detected: %d" % len(peak_dicts))
    for pd in peak_dicts[:5]:
        print("    2T=%.2f I=%.1f d=%.4f" % (pd["two_theta"], pd["intensity"], pd["d_spacing"]))
    print()

    # ── Step 3: Search COD for candidates ────────────────────
    print("Step 3: Search COD for Si candidates")
    engine = ReferenceEngine(cif_cache_dir="data/cif_cache", wavelength=1.5406)
    cod_provider = CODProvider()
    engine.register_provider(cod_provider)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(
        engine.identify_phases(
            experimental_peaks=peak_dicts,
            query="silicon",
            elements=["Si"],
            limit=10,
        )
    )
    print("  Candidates found: %d" % len(results))
    for r in results[:3]:
        print("    %s (%s) - score=%.3f" % (r.material_name, r.material_formula, r.match_score))
    print()

    if not results:
        print("  FALLBACK: Using local database")
        local_provider = LocalCODProvider()
        engine.register_provider(local_provider)
        results = loop.run_until_complete(
            engine.identify_phases(
                experimental_peaks=peak_dicts,
                query="silicon",
                elements=["Si"],
                limit=10,
            )
        )
        print("  Candidates found: %d" % len(results))

    if not results:
        print("  ERROR: No candidates found!")
        return False

    # ── Step 4: Download candidate CIF ───────────────────────
    best = results[0]
    cod_id = best.source_id
    print("Step 4: Download CIF for best candidate: %s (%s)" % (best.material_name, cod_id))

    cif_content = engine.get_or_download_cif(cod_id)
    parsed_data = engine.get_parsed_cif(cod_id)
    print("  CIF downloaded: %s" % ("Yes" if cif_content else "No"))
    print("  CIF parsed: %s" % ("Yes" if parsed_data else "No"))
    if parsed_data:
        uc = parsed_data.get("unit_cell", {})
        print("  Unit cell: a=%.4f b=%.4f c=%.4f" % (uc.get("a", 0), uc.get("b", 0), uc.get("c", 0)))
        print("  Atoms: %d" % len(parsed_data.get("atoms", [])))
    print()

    # ── Step 5: Generate theoretical diffraction pattern ─────
    print("Step 5: Generate theoretical pattern (pymatgen)")

    # Path A: from CIF content (preferred)
    pym_gen = PymatgenPatternGenerator(wavelength=1.5406)
    peaks_from_cif = pym_gen.generate_from_cif_content(cif_content, max_two_theta=80.0) if cif_content else []
    print("  Path A (from CIF content): %d peaks" % len(peaks_from_cif))
    if peaks_from_cif:
        for p in peaks_from_cif[:3]:
            print("    2T=%.2f I=%.1f d=%.4f hkl=%s" % (
                p["two_theta"], p["intensity"], p["d_spacing"], p["hkl"]))

    # Path B: from parsed data (fallback)
    peaks_from_parsed = pym_gen.generate_from_parsed_data(parsed_data, max_two_theta=80.0) if parsed_data else []
    print("  Path B (from parsed data): %d peaks" % (len(peaks_from_parsed) if peaks_from_parsed else 0))

    # Path C: numpy generator (final fallback)
    numpy_gen = TheoreticalPatternGenerator(wavelength=1.5406)
    peaks_from_numpy = numpy_gen.generate_pattern(parsed_data, max_two_theta=80.0) if parsed_data else []
    print("  Path C (numpy fallback): %d peaks" % (len(peaks_from_numpy) if peaks_from_numpy else 0))
    print()

    # ── Step 6: Run Rietveld refinement ──────────────────────
    print("Step 6: Run Rietveld refinement")
    phase_cifs = [dict(parsed_data)]
    if cif_content:
        phase_cifs[0]["_cif_content"] = cif_content

    rietveld = RietveldService(wavelength=1.5406)
    result = rietveld.refine(
        two_theta_obs=np.array(two_theta),
        intensity_obs=np.array(intensity),
        phase_cifs=phase_cifs,
        wavelength=1.5406,
    )

    print("  Success: %s" % result.success)
    print("  Message: %s" % result.message)
    if result.success:
        print("  Rwp: %.2f%%" % (result.r_wp or 0))
        print("  Rp: %.2f%%" % (result.r_p or 0))
        print("  Chi²: %.4f" % (result.chi_squared or 0))
        print("  GoF: %.4f" % (result.gof or 0))
        print("  Iterations: %d" % result.iterations)
        print("  Pattern points: %d" % len(result.two_theta))
        print("  Phases used:")
        for phase in result.phases_used:
            print("    %s (%s) - fraction=%.3f, %d peaks" % (
                phase.get("formula", "?"),
                phase.get("space_group", "?"),
                phase.get("fraction", 0),
                phase.get("n_peaks", 0),
            ))
    print()

    # ── Validation criteria ──────────────────────────────────
    print("=" * 70)
    print("VALIDATION RESULTS")
    print("=" * 70)

    checks = [
        ("Peak detection produced results", len(peak_dicts) > 0),
        ("COD search found candidates", len(results) > 0),
        ("CIF downloaded from COD", cif_content is not None),
        ("CIF parsed successfully", parsed_data is not None),
        ("pymatgen generated peaks from CIF content", len(peaks_from_cif) > 0),
        ("pymatgen generated peaks from parsed data", peaks_from_parsed is not None and len(peaks_from_parsed) > 0),
        ("Rietveld refinement converged", result.success),
        ("Rwp is reasonable (< 50%)", (result.r_wp or 100) < 50),
        ("Pattern has correct dimensions", len(result.two_theta) > 0),
        ("At least one phase identified", len(result.phases_used) > 0),
    ]

    all_passed = True
    for desc, passed in checks:
        status = "PASS" if passed else "FAIL"
        if not passed:
            all_passed = False
        print("  [%s] %s" % (status, desc))

    print()
    if all_passed:
        print("ALL CHECKS PASSED - Scientific workflow validated successfully!")
    else:
        print("SOME CHECKS FAILED - Review needed!")

    return all_passed


if __name__ == "__main__":
    success = run_e2e_validation()
    sys.exit(0 if success else 1)
