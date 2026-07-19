import sys
sys.path.insert(0, '.')
import json

with open('backend/reference/data/cod_reference_db.json', 'r') as f:
    data = json.load(f)

for mat in data['materials'][:10]:
    lp = mat.get('lattice_parameters', {})
    print(f'{mat["id"]:20s} {mat["formula"]:30s} a={lp.get("a", "MISSING")} b={lp.get("b", "MISSING")} c={lp.get("c", "MISSING")} sg={mat.get("space_group", "?")}')

# Check if LaB6 is in the DB
print('\n--- Looking for LaB6 ---')
for mat in data['materials']:
    if 'La' in mat.get('formula', '') and 'B' in mat.get('formula', ''):
        print(f'FOUND: {mat["id"]} {mat["formula"]} {mat["name"]}')
        lp = mat.get('lattice_parameters', {})
        print(f'  lattice: a={lp.get("a")} b={lp.get("b")} c={lp.get("c")}')
        print(f'  peaks: {len(mat.get("peaks", []))}')
