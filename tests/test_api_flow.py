"""Test the full API flow: upload -> pipeline -> display."""
import sys
sys.path.insert(0, '.')

import asyncio
import json


async def main():
    from backend.main import create_app
    from httpx import AsyncClient, ASGITransport

    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Create a project
        print("1. Creating project...")
        resp = await client.post("/projects", json={"name": "LaB6 Test Project"})
        assert resp.status_code in (200, 201), f"Failed: {resp.status_code} {resp.text}"
        project = resp.json()
        project_id = project["id"]
        print(f"   Project: {project_id}")

        # Step 2: Upload the sample file
        print("2. Uploading LaB6 file...")
        with open("samples/LaB6_041008.xrdml", "rb") as f:
            file_bytes = f.read()

        resp = await client.post(
            "/upload",
            files={"file": ("LaB6_041008.xrdml", file_bytes, "application/xml")},
            data={"project_id": project_id},
        )
        assert resp.status_code == 200, f"Failed: {resp.status_code} {resp.text}"
        upload_result = resp.json()
        experiment_id = upload_result["experiment_id"]
        print(f"   Experiment: {experiment_id}")
        print(f"   Data points: {upload_result['data_points']}")
        print(f"   Two theta range: {upload_result['two_theta_range']}")

        # Step 3: Get experiment details
        print("3. Getting experiment details...")
        resp = await client.get(f"/experiments/{experiment_id}")
        assert resp.status_code == 200, f"Failed: {resp.status_code} {resp.text}"
        exp = resp.json()
        print(f"   Name: {exp['name']}")
        print(f"   Status: {exp['status']}")
        print(f"   Has pattern data: {exp['has_pattern_data']}")
        print(f"   Raw two_theta points: {len(exp.get('raw_two_theta') or [])}")
        print(f"   Raw intensity points: {len(exp.get('raw_intensity') or [])}")

        # Step 4: Run the pipeline (signal processing stages)
        print("4. Running pipeline (signal processing)...")
        resp = await client.post(
            f"/experiments/{experiment_id}/pipeline",
            json={
                "stages": [
                    "background_correction",
                    "ka2_stripping",
                    "noise_reduction",
                    "intensity_normalization",
                    "peak_detection",
                ]
            },
        )
        assert resp.status_code == 200, f"Failed: {resp.status_code} {resp.text}"
        pipeline_result = resp.json()
        print(f"   Success: {pipeline_result['success']}")
        print(f"   Completed: {pipeline_result['completed_stages']}")
        for stage in pipeline_result['completed_stages']:
            sr = pipeline_result['results'].get(stage, {})
            print(f"     {stage}: {'OK' if sr.get('success') else 'FAIL'} - {sr.get('message', '')[:80]}")

        # Step 5: Get experiment again to see peaks
        print("5. Getting experiment after pipeline...")
        resp = await client.get(f"/experiments/{experiment_id}")
        exp = resp.json()
        print(f"   Detected peaks: {len(exp.get('detected_peaks', []))}")
        for p in (exp.get('detected_peaks') or [])[:5]:
            print(f"     2theta={p.get('two_theta'):.3f} I={p.get('intensity'):.1f} d={p.get('d_spacing'):.4f}")

        # Step 6: Run phase identification
        print("6. Running phase identification...")
        resp = await client.post(
            f"/experiments/{experiment_id}/phase-identification",
            json={"query": "LaB6", "limit": 20},
        )
        assert resp.status_code == 200, f"Failed: {resp.status_code} {resp.text}"
        pid_result = resp.json()
        print(f"   Success: {pid_result['success']}")
        print(f"   Candidates: {len(pid_result['candidate_phases'])}")
        for c in pid_result['candidate_phases'][:5]:
            print(f"     {c.get('material_formula', '?')} ({c.get('material_name', '?')}) score={c.get('match_score', 0):.4f}")
        print(f"   CIF files: {len(pid_result['cif_files'])}")

        # Step 7: Run Rietveld
        print("7. Running Rietveld refinement...")
        # Get CIF IDs for the top candidate
        top_cif_ids = [c.get("cod_id", "") for c in pid_result['cif_files'][:1]]
        resp = await client.post(
            f"/experiments/{experiment_id}/rietveld",
            json={
                "workflow": "auto",
                "selected_cif_ids": top_cif_ids,
            },
        )
        assert resp.status_code == 200, f"Failed: {resp.status_code} {resp.text}"
        riet_result = resp.json()
        print(f"   Success: {riet_result['success']}")
        rr = riet_result.get('rietveld_results', {})
        if rr:
            print(f"   Rwp: {rr.get('r_wp')}")
            print(f"   Rp: {rr.get('r_p')}")
            print(f"   Rexp: {rr.get('r_exp')}")
            print(f"   Chi-squared: {rr.get('chi_squared')}")
            print(f"   GoF: {rr.get('gof')}")
            pats = rr.get('patterns', {})
            if pats:
                print(f"   Pattern lengths: tt={len(pats.get('two_theta', []))} obs={len(pats.get('observed', []))} calc={len(pats.get('calculated', []))} diff={len(pats.get('difference', []))}")

        # Step 8: Final experiment state
        print("8. Final experiment state...")
        resp = await client.get(f"/experiments/{experiment_id}")
        exp = resp.json()
        print(f"   Status: {exp['status']}")
        print(f"   Candidate phases: {len(exp.get('candidate_phases', []))}")
        print(f"   CIF files: {len(exp.get('cif_files', []))}")
        print(f"   Has rietveld_results: {exp.get('rietveld_results') is not None}")
        print(f"   Detected peaks: {len(exp.get('detected_peaks', []))}")
        has_rpatterns = False
        if exp.get('rietveld_results', {}).get('patterns'):
            rp = exp['rietveld_results']['patterns']
            has_rpatterns = len(rp.get('two_theta', [])) > 0
            print(f"   Rietveld patterns: {has_rpatterns} (tt={len(rp.get('two_theta', []))})")

        # Summary
        print("\n" + "="*60)
        checks = [
            ("File parsed", upload_result['data_points'] > 100),
            ("Pattern data stored", len(exp.get('raw_two_theta') or []) > 100),
            ("Pipeline completed", len(pipeline_result['completed_stages']) >= 5),
            ("Peaks detected", len(exp.get('detected_peaks', [])) >= 3),
            ("Phase ID found", len(pid_result.get('candidate_phases', [])) > 0),
            ("LaB6 identified", any(c.get('material_formula') == 'B6La' for c in pid_result.get('candidate_phases', []))),
            ("Rietveld completed", riet_result.get('success', False)),
            ("Rietveld patterns", has_rpatterns),
        ]
        all_ok = True
        for name, passed in checks:
            status = "PASS" if passed else "FAIL"
            print(f"  [{status}] {name}")
            if not passed:
                all_ok = False
        print()
        if all_ok:
            print("  ALL CHECKS PASSED")
        else:
            print("  SOME CHECKS FAILED")


if __name__ == "__main__":
    asyncio.run(main())
