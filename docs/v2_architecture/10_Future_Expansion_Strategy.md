# MatPilot V2 Future Expansion Strategy

## 1. Modular Instrument Spoke Design
The most critical architectural decision in V2 is the "Hub and Spoke" pattern. By isolating instruments into completely independent domains (UI routes, Backend API routers, Database child tables, AI Prompts), adding a new instrument like XPS or TEM requires zero modifications to the core Hub (Workspace, Auth, Files). 
- **Developer Impact**: A new team can build the "XPS" module independently, register it in the `InstrumentRegistry`, and deploy it without causing regressions in XRD or FTIR.

## 2. Cloud & GPU Computation
- As MatPilot scales, computationally expensive tasks (like 3D Rietveld refinement or massive 2D XRD detector image integration) will move from synchronous API calls to asynchronous Task Queues (e.g., Celery/RabbitMQ).
- **GPU Scaling**: The `shared/math` library wraps SciPy/NumPy. In the future, this can seamlessly swap to CuPy/JAX to leverage GPU acceleration on cloud instances without changing the Application Layer logic.

## 3. Scientific Databases & External APIs
The architecture abstracts database lookups via Interfaces (e.g., `IReferenceDatabaseProvider`). 
- Currently, COD or RRUFF might be embedded or queried via public APIs.
- In the future, proprietary Enterprise databases (e.g., ICSD, CCDC) can be plugged in by creating a new class that implements the `IReferenceDatabaseProvider` interface, triggered by a user's subscription tier.

## 4. Expanding the AI Architecture
- **New Models**: Because AI integration is done via the `AI Service Layer`, upgrading from GPT-4o to a specialized Open-Source Llama model fine-tuned on Materials Science simply requires pointing the Inference Engine to a new endpoint. The Instrument Domain remains untouched.
- **Agent Swarms**: The Global Correlation AI is designed to trigger specialized AI sub-agents. Future iterations can spin up a "Literature Review Agent" to scrape recent papers and cross-reference them with the workspace results.

## 5. Enterprise Edition & Collaboration
- **Collaboration**: The database design uses `organization_users` with RBAC (Role-Based Access Control). This naturally supports sharing Workspaces with read/write/admin privileges among research groups.
- **Versioning**: Experiment metadata and results currently overwrite rows. Future iterations can adopt event-sourcing or explicit `experiment_versions` to track changes (e.g., "Baseline tweaked by User A at 10:00").

## 6. Plugin Marketplace
By strictly standardizing the API for what constitutes an "Instrument", MatPilot V2 paves the way for third-party developers (e.g., instrument manufacturers like Bruker or Thermo Fisher) to write their own Instrument Plugins using the MatPilot SDK, extending the platform's ecosystem infinitely.
