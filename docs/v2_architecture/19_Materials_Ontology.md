# MatPilot V2 Materials Ontology

## 1. Concept
Instead of treating experimental results as isolated database rows, MatPilot maps the data onto a formalized Materials Ontology. This ontology becomes the semantic backbone of the platform, enabling the Global Correlation AI to reason about physical phenomena rather than just parse numbers.

## 2. Ontology Graph Architecture
The central node is the **Material**. Every experimental finding populates a specific domain of this ontology.

```text
Material
 ├── Chemical Composition (e.g., LiCoO2) <- Populated by: EDX, XPS
 ├── Crystal Structure
 │    ├── Space Group (R-3m) <- Populated by: XRD
 │    ├── Lattice Parameters (a=2.81, c=14.05) <- Populated by: XRD (Rietveld)
 ├── Optical Properties
 │    ├── Direct Band Gap (2.1 eV) <- Populated by: UV-Vis
 │    ├── Refractive Index <- Populated by: Ellipsometry
 ├── Vibrational Properties
 │    ├── Raman Active Modes (A1g, Eg) <- Populated by: Raman
 │    ├── IR Active Modes (Functional Groups) <- Populated by: FTIR
 ├── Electronic Properties
 │    ├── Oxidation States (Co3+) <- Populated by: XPS
 ├── Surface Chemistry
 │    ├── Adsorbed Species (H2O, CO2) <- Populated by: FTIR
 ├── Morphology
 │    ├── Grain Size (500 nm) <- Populated by: SEM
 │    ├── Particle Shape <- Populated by: TEM
 ├── Thermal Properties
 │    ├── Phase Transition Temp <- Populated by: DSC
 │    ├── Decomposition Temp <- Populated by: TGA
 └── References
      ├── Literature Citations <- Populated by: RDL, AI
```

## 3. Semantic Impact
By strictly mapping data to this ontology, the platform achieves cross-technique data validation automatically. 
- If the XRD module updates the `Crystal Structure` node to state the material is highly crystalline, but the SEM module attempts to update the `Morphology` node with "amorphous blob", the Ontology layer detects a semantic conflict and triggers the `Peer Review Report` AI to alert the user.
- This creates an operating system that "understands" materials science.
