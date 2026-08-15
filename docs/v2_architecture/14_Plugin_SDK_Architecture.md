# MatPilot V2 Plugin SDK Architecture

## 1. Extensibility Mandate
MatPilot must eventually support third-party characterization modules without modifying the platform core. The Plugin SDK provides a standardized interface for injecting new scientific instruments.

## 2. Plugin Architecture Components
A complete Instrument Plugin requires the following layers:

### A. Plugin Manifest
A `manifest.json` defining:
- `instrument_id` (e.g., "nmr", "xps").
- `name` ("Nuclear Magnetic Resonance").
- `version` and `author`.
- `supported_file_extensions`.

### B. Plugin Backend
- **Data Schema**: A Pydantic model defining the `InstrumentExperiment` child table schema.
- **API Routers**: Standardized REST endpoints conforming to the Hub-and-Spoke contract (e.g., `POST /process`, `GET /results`).
- **Dependencies**: The platform dependency injection system automatically mounts the plugin's router under `/api/v2/instruments/{instrument_id}`.

### C. Plugin Scientific Engine
- Must implement the `IScientificComputationEngine` interface.
- Performs domain-specific mathematics strictly within the plugin boundaries (e.g., NMR FID Fourier transforms).

### D. Plugin Scientific Validation
- Must implement the `IScientificValidator` interface to ensure the outputs of the Scientific Engine are physically viable before reaching the AI.

### E. Plugin AI
- Must supply a `PromptManifest` defining the exact persona, guardrails, and knowledge boundaries for the instrument's AI Scientist.
- Reuses the core LLM orchestration engine but with injected plugin logic.

### F. Plugin Frontend & Visualization
- **Micro-Frontend Integration**: The UI components are dynamically imported into the Next.js workspace.
- The plugin must export a `Dashboard` component (Experiment list) and a `Workspace` component (The active analysis view).
- The platform provides a `Shared Scientific UI Kit` (Charts, Sliders, Tables) that the plugin must use for visual consistency.

### G. Plugin Reports
- Implements the `IReportGenerator` interface.
- Returns a standardized JSON or Markdown block that the Core Platform can embed into the Unified Workspace Report.

## 3. Sandboxing & Security
- Plugins run in a sandboxed container (or isolated Python sub-interpreters).
- They cannot access the database directly; they must interact via the `PlatformORMGateway`.
- They cannot query external endpoints directly; they must register a connector with the `Reference Database Layer`.
