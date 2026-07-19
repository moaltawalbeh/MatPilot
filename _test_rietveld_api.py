"""Debug Rietveld API step by step with timeouts."""
import requests
import math
import sys

BASE = "http://localhost:8000"
s = requests.Session()

# 1. Create project
r = s.post(f"{BASE}/projects", json={"name":"Test","description":"t","material":"Si"}, timeout=5)
print(f"1. Create project: {r.status_code}")
project_id = r.json()["id"]

# 2. Upload XY file
lines = []
for i in range(500):
    angle = 10.0 + i * 0.08
    intensity = 100 + 2000 * math.exp(-0.5 * ((angle - 28.44) / 0.3) ** 2)
    lines.append(f"{angle:.4f} {intensity:.1f}")
xy_data = "\n".join(lines).encode("utf-8")

files = {"file": ("test.xy", xy_data, "text/plain")}
data = {"project_id": project_id}
r = s.post(f"{BASE}/upload", files=files, data=data, timeout=30)
print(f"2. Upload: {r.status_code}")
upload_result = r.json()
experiment_id = upload_result.get("experiment_id")
print(f"   experiment_id={experiment_id}")

# 3. Check experiment
r = s.get(f"{BASE}/experiments/{experiment_id}", timeout=5)
print(f"3. Get experiment: {r.status_code}")
exp = r.json()
print(f"   candidate_phases: {len(exp.get('candidate_phases', []))}")
print(f"   cif_files: {len(exp.get('cif_files', []))}")
print(f"   data_points: {exp.get('data_points')}")
print(f"   primary_file_id: {exp.get('primary_file_id')}")

# 4. Run phase identification with a SHORT timeout to see if it hangs
print("\n4. Phase ID (with 30s timeout)...")
try:
    r = s.post(f"{BASE}/experiments/{experiment_id}/phase-identification",
        json={"query": "Si", "limit": 5}, timeout=30)
    print(f"   Status: {r.status_code}")
    phase_result = r.json()
    print(f"   success={phase_result.get('success')}, candidates={len(phase_result.get('candidate_phases', []))}")
    print(f"   cif_files={len(phase_result.get('cif_files', []))}")
except requests.Timeout:
    print("   TIMEOUT! Phase ID took too long.")
    # Check what we have
    r = s.get(f"{BASE}/experiments/{experiment_id}", timeout=5)
    exp = r.json()
    print(f"   Experiment still has {len(exp.get('cif_files', []))} CIF files")
    print(f"   Experiment still has {len(exp.get('candidate_phases', []))} candidate phases")
except Exception as e:
    print(f"   ERROR: {e}")

# 5. Check experiment again
r = s.get(f"{BASE}/experiments/{experiment_id}", timeout=5)
exp = r.json()
print(f"\n5. After phase ID:")
print(f"   candidate_phases: {len(exp.get('candidate_phases', []))}")
print(f"   cif_files: {len(exp.get('cif_files', []))}")
for cf in exp.get("cif_files", []):
    has_parsed = "YES" if cf.get("parsed_data") else "NO"
    has_cif = "YES" if cf.get("_cif_content") else "NO"
    print(f"     - {cf.get('cod_id')}: {cf.get('material_name')} parsed={has_parsed} cif={has_cif}")

cif_ids = [cf["cod_id"] for cf in exp.get("cif_files", [])]
if not cif_ids:
    # Try to use local DB fallback - manually add a CIF
    print("\n   No CIF files from COD. Trying local database path...")
    # Check if we can download CIF directly
    r = s.get(f"{BASE}/experiments/{experiment_id}", timeout=5)
    exp = r.json()
    
    # Try Rietveld with whatever we have (even if no CIF files)
    print("   Cannot proceed without CIF files.")
    print("   THIS IS THE BUG: Phase ID either timed out or returned no CIF files.")
    sys.exit(1)

# 6. Run Rietveld
print(f"\n6. Running Rietveld with CIF IDs: {cif_ids}")
try:
    r = s.post(f"{BASE}/experiments/{experiment_id}/rietveld",
        json={"workflow": "auto", "selected_cif_ids": cif_ids}, timeout=120)
    print(f"   Status: {r.status_code}")
    if r.status_code != 200:
        print(f"   FAIL: {r.text[:1000]}")
    else:
        result = r.json()
        rr = result.get("rietveld_results", {})
        print(f"   r_wp={rr.get('r_wp')}, gof={rr.get('gof')}, iters={rr.get('iterations')}")
except requests.Timeout:
    print("   TIMEOUT!")
except Exception as e:
    print(f"   ERROR: {e}")

print("\nDONE")
