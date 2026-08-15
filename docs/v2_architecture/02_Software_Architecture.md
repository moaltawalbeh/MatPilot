# MatPilot V2 Software Architecture

## 1. Clean Architecture & Domain Driven Design (DDD)
The platform adheres strictly to Clean Architecture principles, isolating the core scientific domain from infrastructure, databases, and external APIs.
- **Domain Layer**: Contains enterprise logic, entities (Workspace, Instrument schemas), and scientific algorithms. This layer has zero dependencies on external frameworks.
- **Application Layer**: Contains Use Cases (e.g., `ProcessFTIRSpectrumUseCase`, `GenerateWorkspaceReportUseCase`). Orchestrates domain objects.
- **Interface Adapters**: Controllers, Presenters, and Gateways (FastAPI routers, Database Repositories).
- **Infrastructure Layer**: SQLAlchemy models, database connections, external AI provider integrations (OpenAI/Anthropic APIs).

## 2. Layer Separation
- **Frontend (Next.js App Router)**: UI components, State Management, Client-side visualization (Recharts/Plotly). Strictly separated by Instrument domain (`/app/instruments/[type]`).
- **Backend (FastAPI)**: RESTful stateless API. Strictly separated by Domain modules.
- **Scientific Computation Engine**: A dedicated, deterministic mathematical processing layer (strictly isolated from AI) responsible for signal processing and fitting. See `11_Scientific_Computation_Layer.md`.
- **Scientific Validation Layer**: A strict guardrail verifying numerical stability and physical feasibility before data reaches the AI. See `15_Scientific_Validation_Layer.md`.
- **AI Service Layer**: LLM orchestration, prompt templates, tool-calling definitions specific to each instrument persona. Never performs numerical processing.
- **Reference Database Layer (RDL)**: An isolated connector architecture that proxies all requests to external databases (COD, SDBS, etc.) to ensure compliance and caching. See `12_Reference_Database_Layer.md`.

## 3. Services & Module Boundaries
- **Core Platform Service**: Manages Workspaces, Users, Organizations, Billing, and unified Reports.
- **Instrument Modules**: Independent bounded contexts.
  - `XRD Service`
  - `FTIR Service`
  - `Raman Service`
  - `UVVis Service`
  *Each instrument module contains its own API router, use cases, domain entities, and algorithms. They do NOT share experiment state.*
- **AI Service**: Routes requests to specific AI personas (FTIR Scientist, XRD Scientist).
- **Storage Service**: Manages raw file uploads (S3/Azure Blob), ensuring instrument data is securely partitioned.

## 4. Dependency Graph
`UI (Next.js)` -> `API Gateway (FastAPI)` -> `Use Cases (App Layer)` -> `Domain Entities & Scientific Algorithms`
`Use Cases` -> `Repositories (Data Access)` -> `SQL Database`
`Use Cases` -> `AI Services` -> `LLM Providers`

Dependencies always point INWARD toward the Domain Layer.

## 5. Shared Components
To avoid duplicating generic logic while maintaining instrument independence, the following components are shared:
- **Mathematical Utilities**: Base classes for peak detection, baseline correction algorithms, and smoothing (Savitzky-Golay) reside in a `shared/math` library. Instruments compose these functions rather than inheriting them.
- **UI Design System**: A unified React component library (buttons, modals, scientific charting wrappers) ensures the platform looks cohesive, even though layouts differ per instrument.
- **Auth & Security**: JWT verification, RBAC (Role-Based Access Control) are applied globally via middleware.

## 6. Plugin Architecture
Future instruments are treated as "Plugins".
To add a new instrument (e.g., XPS):
1. Create `backend/domain/instruments/xps.py` (Entity schema).
2. Create `backend/api/routers/instruments/xps.py` (Endpoints).
3. Create `frontend/app/instruments/xps/` (UI routes).
4. Register the instrument in the `Platform Registry` to make it appear in the Workspace dashboard.
No existing code needs to be modified to support a new instrument (Open/Closed Principle).

## 7. AI Architecture
The AI is decoupled into specialized agents.
- **Agent Registry**: Maps Instrument Type to specific AI Prompt Templates and Toolsets.
- **Context Injection**: When a user requests an interpretation, the Backend injects the specific mathematical results (e.g., peak list, functional groups) into the specialized prompt.
- **Streaming Response**: AI reasoning is streamed back to the frontend via Server-Sent Events (SSE) or WebSockets for real-time feedback.

## 8. Data Flow
1. User uploads a file in the FTIR Instrument UI.
2. File is parsed by `FTIRParser` in the Backend.
3. Raw data is saved to Storage; Metadata saved to Database linked to an `FTIRExperiment` entity.
4. User clicks "Process". Frontend sends parameters to `/api/v1/instruments/ftir/experiments/{id}/process`.
5. Backend orchestrates `FTIRPreProcessingUseCase` -> `PeakDetectionUseCase`.
6. Results saved to `FTIRExperiment` database row.
7. Results returned to Frontend for visualization.
8. User clicks "Interpret". Data sent to `FTIR_AI_Scientist`.
9. AI streams interpretation back to UI.
