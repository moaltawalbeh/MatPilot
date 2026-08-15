# MatPilot V2 Scientific Report Levels

## 1. Reporting Philosophy
A single "Report" does not fit all use cases. MatPilot V2 generates modular reports tailored to specific audiences, ranging from quick lab notes to publication-ready manuscripts.

## 2. The Report Tiers

### A. Quick Report
- **Audience**: The researcher running the machine.
- **Purpose**: Immediate verification that an experiment succeeded.
- **Content**: Raw data plot, processing parameters used, and a top-3 list of findings (e.g., top 3 XRD phases, or major FTIR functional groups).
- **Format**: 1-page PDF or HTML view.

### B. Scientific Report
- **Audience**: The research team or Principal Investigator (PI).
- **Purpose**: A comprehensive breakdown of a single experiment or a single sample across multiple instruments.
- **Content**: 
  - Validated Scientific Results (Tables, Extrapolations).
  - High-resolution plots with annotations.
  - The AI Scientist's interpretation (Findings, Reasoning, Confidence).
- **Format**: Multi-page PDF, interactive Web view.

### C. Publication Report
- **Audience**: Peer reviewers, journal editors.
- **Purpose**: To provide copy-paste ready text and vector graphics for academic papers.
- **Content**:
  - Automatically generated "Materials & Methods" text detailing the exact algorithms, baseline polynomial orders, and databases used.
  - Vector graphics (SVG/EPS) conforming to ACS (American Chemical Society) or RSC standard formatting.
  - Formatted tables (e.g., crystallographic data in standard CIF/table format).

### D. AI Discussion Report
- **Audience**: The researcher during the brainstorming phase.
- **Purpose**: An exploratory dialogue based on the Knowledge Graph.
- **Content**: A transcript of the Global Correlation AI attempting to reconcile contradictory data, suggesting potential synthesis flaws, or recommending further techniques (e.g., "The band gap shifted, but XRD shows no lattice expansion. Consider XPS to check for oxygen vacancies.").

### E. Peer Review Report
- **Audience**: The researcher (as a self-check before publication).
- **Purpose**: A strict, adversarial critique of the data by the AI.
- **Content**: The AI acts as "Reviewer 2". It highlights weak Signal-to-Noise ratios, questions high Chi-squared values in Rietveld refinement, and points out missing baseline corrections.
