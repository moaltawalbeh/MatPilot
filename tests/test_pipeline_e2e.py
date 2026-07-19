"""Minimal test: full pipeline with LaB6."""
import sys, asyncio
sys.path.insert(0, '.')

async def main():
    from backend.parsers.xrdml_parser import XRDMLParser
    from backend.domain.entities.experiment import Experiment
    from backend.reference.engine.reference_engine import ReferenceEngine
    from backend.reference.providers.local_cod_provider import LocalCODProvider
    from backend.services.scientific_pipeline import ScientificPipeline
    from uuid import uuid4

    # Parse
    parser = XRDMLParser()
    with open("samples/LaB6_041008.xrdml", "rb") as f:
        data = f.read()
    parsed = await parser.parse(data, "LaB6_041008.xrdml", {})
    print(f"Parsed {parsed.data_points} points")

    exp = Experiment(
        id=uuid4(), project_id=uuid4(), name="LaB6",
        raw_two_theta=parsed.two_theta, raw_intensity=parsed.intensity,
        wavelength_angstrom=1.5406, has_pattern_data=True,
        data_points=parsed.data_points,
    )

    engine = ReferenceEngine()
    engine._providers = {"LocalCOD": LocalCODProvider()}
    engine._provider_order = ["LocalCOD"]
    pipeline = ScientificPipeline(reference_engine=engine, upload_service=None)

    # Run signal processing stages first (no phase ID/Rietveld)
    result = await pipeline.run_full_pipeline(
        experiment=exp,
        stages_to_run=[
            "background_correction", "ka2_stripping",
            "noise_reduction", "intensity_normalization", "peak_detection",
        ],
    )
    print(f"\nSignal processing: {result['success']}")
    for s in result['completed_stages']:
        r = result['results'][s]
        print(f"  {s}: {'OK' if r.get('success') else 'FAIL'} - {r.get('message', '')}")

    print(f"\nDetected peaks: {len(exp.detected_peaks)}")
    for p in exp.detected_peaks[:10]:
        print(f"  2theta={p['two_theta']:.3f} I={p['intensity']:.1f} d={p['d_spacing']:.4f}")

    # Phase identification separately
    print("\n--- Phase Identification ---")
    pid_result = await pipeline.run_stage("phase_identification", exp)
    print(f"  success={pid_result.get('success')}")
    print(f"  candidates={len(pid_result.get('candidate_phases', []))}")
    for c in pid_result.get('candidate_phases', [])[:5]:
        formula = c.get('material_formula', '?')
        name = c.get('material_name', '?')
        score = c.get('match_score', 0)
        print(f"    {formula} ({name}) score={score:.4f}")

    print(f"\n  CIF files: {len(exp.cif_files)}")
    for cif in exp.cif_files[:5]:
        pd = cif.get('parsed_data', {})
        has_peaks = '_theoretical_peaks' in pd and len(pd.get('_theoretical_peaks', [])) > 0
        has_cif = cif.get('_cif_content') is not None
        print(f"    {cif.get('cod_id', '?')}: has_theoretical_peaks={has_peaks} has_cif={has_cif}")
        if has_peaks:
            tp = pd['_theoretical_peaks']
            print(f"      theoretical peaks: {len(tp)} peaks")
            for pk in tp[:3]:
                print(f"        {pk}")

    # Candidate selection
    print("\n--- Candidate Selection ---")
    sel_result = await pipeline.run_stage("candidate_selection", exp)
    print(f"  success={sel_result.get('success')}")
    print(f"  selected: {len(exp.selected_refinement_phases)}")

    # Rietveld
    print("\n--- Rietveld ---")
    riet_result = await pipeline.run_stage("rietveld_refinement", exp)
    print(f"  success={riet_result.get('success')}")
    print(f"  message: {riet_result.get('message', '')}")
    if riet_result.get('rietveld_results'):
        rr = riet_result['rietveld_results']
        print(f"  Rwp={rr.get('r_wp')} Rp={rr.get('r_p')} Rexp={rr.get('r_exp')} GoF={rr.get('gof')}")
        pats = rr.get('patterns', {})
        if pats:
            print(f"  patterns: tt={len(pats.get('two_theta', []))} obs={len(pats.get('observed', []))} calc={len(pats.get('calculated', []))}")

    print("\nDone!")

asyncio.run(main())
