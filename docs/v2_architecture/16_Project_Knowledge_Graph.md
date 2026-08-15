# MatPilot V2 Project Knowledge Graph

## 1. Architectural Purpose
Currently, scientific data is stored in relational silos (e.g., an XRD table, an FTIR table). The Project Knowledge Graph introduces a semantic layer that links discrete experimental findings into a cohesive understanding of a material. 

## 2. Graph Structure
The graph models relationships (Edges) between scientific entities (Nodes).

**Nodes**:
- `Workspace`
- `Project`
- `Sample`
- `Instrument Experiment` (XRD, FTIR, Raman, etc.)
- `Scientific Finding` (Phase, Functional Group, Band Gap, Morphology)
- `Reference Data` (COD Entry, NIST Entry)

**Edges (Predicates)**:
- `BELONGS_TO` (Sample -> Project)
- `ANALYZED_BY` (Sample -> XRD Experiment)
- `CONFIRMS_PRESENCE_OF` (XRD Experiment -> Phase)
- `CORROBORATES` (Raman Finding -> XRD Finding)
- `CONTRADICTS` (FTIR Finding -> UV-Vis Finding)

## 3. Example Graph Traversal
```text
Workspace (Li-ion Battery Research)
  ↓ [CONTAINS]
Sample (Cathode Batch A)
  ↓ [ANALYZED_BY]
XRD Experiment 1
  ↓ [CONFIRMS_PRESENCE_OF]
Crystal Structure (LiCoO2)
  ↓ [CORROBORATES]
Raman Experiment 1 (Peak at 596 cm⁻¹)
  ↓ [CONFIRMS_PRESENCE_OF]
Phase (LiCoO2 Raman Signature)
```

## 4. Multi-Technique Reasoning (The Global Correlation AI)
Instead of feeding the Global Correlation AI raw tables, the backend traverses the Knowledge Graph for a specific `Sample` and generates a Semantic Triplet serialization.
The AI is prompted to look for `CORROBORATES` and `CONTRADICTS` edges.
For example, if XRD suggests $TiO_2$ (Anatase), but Raman shows the rutile phase signature, the Knowledge Graph creates a `CONTRADICTS` edge. The Global AI highlights this discrepancy in the final report, suggesting a mixed-phase sample or a misinterpretation.

## 5. Technology Stack
While the core application uses PostgreSQL for relational integrity, the Knowledge Graph can be materialized via:
- **Graph Database**: Neo4j or Amazon Neptune.
- **Relational Fallback**: Recursive CTEs (Common Table Expressions) in PostgreSQL using an `edges` adjacency table, sufficient for early iterations.
