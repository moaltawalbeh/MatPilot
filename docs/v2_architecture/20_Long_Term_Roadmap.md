# MatPilot Long-Term Product Roadmap

## V2.0: The Hub and Spoke Foundation
- **Core Architecture**: Implementation of the Clean Architecture, Workspace Hub, and strictly isolated Instrument Spokes.
- **Instruments**: Fully featured releases of **XRD**, **FTIR**, **Raman**, and **UV-Vis**.
- **AI**: Specialized AI Scientists per instrument.
- **Data Model**: Transition to polymorphic database tables and the Reference Database Layer (RDL).

## V2.5: Electron Microscopy & Surface Science
- **Instruments**: Integration of **SEM**, **TEM**, and **EDX**.
- **Features**: Image processing pipelines (watershed algorithms, contrast equalization).
- **Ontology Expansion**: Addition of the `Morphology` and `Chemical Composition` branches to the Materials Ontology.

## V3.0: Thermal & Advanced Surface Analysis
- **Instruments**: Integration of **XPS**, **DSC**, **TGA**, and **BET**.
- **Features**: Advanced deconvolution algorithms for XPS spin-orbit splitting; thermodynamic calculations for DSC.
- **Ecosystem**: Launch of the Plugin SDK V1, allowing external researchers to write custom analytical scripts that interface with the platform.

## V4.0: Global Scientific Correlation
- **Features**: Full materialization of the **Project Knowledge Graph** and **Materials Ontology** via Graph Databases (Neo4j).
- **AI**: Launch of the **Global Correlation AI**. The AI can now write cohesive multi-page scientific papers by analyzing discrepancies and corroborations across 10+ different techniques simultaneously.
- **Reporting**: Full release of the `Publication Report` and `Peer Review Report` tiers.

## V5.0: The Autonomous Laboratory
- **Features**: **Autonomous AI Materials Scientist**. The system can interface directly with laboratory hardware via LIMS (Laboratory Information Management System) APIs.
- **Workflow**: The AI detects an ambiguity in the XRD pattern, automatically schedules a Raman scan on the connected hardware, processes the data, and updates the Knowledge Graph without human intervention.
- **Marketplace**: Launch of the Third-Party Instrument Marketplace, establishing MatPilot as the enterprise standard operating system for global materials research facilities.
