
# MatPilot

**Cloud Platform for Materials Characterization**

MatPilot is a cloud-native platform for analyzing experimental materials characterization data. The Foundation (v0.2) establishes the production-grade architecture that will support XRD, Raman, FTIR, SEM, EDX, XPS, DSC, TGA, and UV-Vis in future releases.

---

## Quick Start

### Prerequisites

- Python 3.11+
- pip

### Installation

```bash
# Clone or extract the project
cd matpilot

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Run the Backend

```bash
# Start the FastAPI server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API Base**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Run the Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The production-ready Next.js frontend will be available at:
- **MatPilot UI**: http://localhost:3000

The legacy Streamlit prototype remains at `frontend/app.py` for reference; it is no longer the primary interface.

### Verify the System

1. Open Swagger at http://localhost:8000/docs
2. Test `GET /health` — should return `{"status": "healthy", "version": "0.2"}`
3. Test `GET /providers` — should return all registered providers
4. Test `POST /upload` with a `.csv` or `.cif` file
5. Open the Streamlit frontend and upload a file via the UI

---

## Architecture

MatPilot follows **Clean Architecture** principles:

```
┌─────────────────┐
│   API Layer     │  FastAPI routers, middleware
│   (FastAPI)     │
├─────────────────┤
│ Application     │  Use cases, DTOs, orchestration
│ Layer           │
├─────────────────┤
│ Domain Layer    │  Entities, value objects, interfaces
│                 │  (no external dependencies)
├─────────────────┤
│ Infrastructure  │  DI container, repositories, cache
│ Layer           │
└─────────────────┘
```

### Key Design Patterns

- **Repository Pattern**: Abstract data access
- **Unit of Work**: Atomic transactions
- **Provider Pattern**: Reference Knowledge Engine decouples all scientific databases
- **Strategy Pattern**: File parsers and analysis algorithms are interchangeable
- **Dependency Injection**: Constructor injection throughout

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Upload experimental file |
| GET | `/providers` | List reference providers |
| POST | `/analyze` | Submit analysis job (placeholder) |
| GET | `/analysis/{id}` | Get analysis result (placeholder) |
| GET | `/report/{id}` | Get report (placeholder) |

---

## Project Structure

```
matpilot/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── api/                 # HTTP routers and middleware
│   ├── application/         # Use cases and DTOs
│   ├── domain/              # Entities, value objects, interfaces
│   ├── reference/           # Reference Knowledge Engine + providers
│   ├── parsers/             # File format parsers
│   ├── analysis/            # Analysis service interfaces (architecture)
│   ├── reports/             # Report generator interfaces (architecture)
│   ├── infrastructure/      # DI, repositories, cache, config
│   └── utils/               # Utilities
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable application components
│   ├── services/            # Typed mock API services
│   ├── types/               # Frontend domain types
│   └── app.py               # Legacy Streamlit prototype
├── tests/                   # pytest test suite
├── requirements.txt         # Python dependencies
├── pyproject.toml           # Project metadata and tool config
└── README.md                # This file
```

---

## Testing

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/unit/test_health.py
```

---

## Supported File Formats

| Format | Extension | Status |
|--------|-----------|--------|
| XY | `.xy`, `.txt`, `.dat`, `.csv` | ✅ Implemented |
| XRDML | `.xrdml` | 🔧 Placeholder |
| RAW | `.raw` | 🔧 Placeholder |
| CIF | `.cif` | 🔧 Placeholder |

---

## Reference Providers

| Provider | Status | Description |
|----------|--------|-------------|
| COD | 🟡 Partial | Crystallography Open Database |
| Materials Project | 🔧 Placeholder | Computational materials database |
| OQMD | 🔧 Placeholder | Open Quantum Materials Database |
| AFLOW | 🔧 Placeholder | AFLOWLIB |
| NOMAD | 🔧 Placeholder | Novel Materials Discovery |
| Materials Cloud | 🔧 Placeholder | Open science platform |
| PubChem | 🔧 Placeholder | Future chemistry support |
| User Private | 🔧 Placeholder | User-uploaded references |
| Org Private | 🔧 Placeholder | Organization private DB |
| Local Cache | 🔧 Placeholder | Local cache layer |

---

## Roadmap

### v0.2 (Foundation) — Current
- ✅ Clean Architecture foundation
- ✅ Reference Knowledge Engine with provider interface
- ✅ Upload Engine with parser strategy
- ✅ FastAPI backend with health, upload, providers endpoints
- ✅ Streamlit frontend
- ✅ DI container and in-memory persistence

### v0.3 — Core Analysis
- Database persistence (PostgreSQL/MongoDB)
- Asynchronous job queue (Celery/RQ)
- Peak detection algorithm
- Peak matching algorithm
- COD API integration
- Report generation (PDF/HTML)

### v0.4 — Advanced Analysis
- Phase identification
- Rietveld refinement
- Lattice parameter calculation
- Crystallite size & microstrain
- Pattern simulation

### v1.0 — Production
- Cloud workspaces
- Organization accounts
- Batch analysis
- API access tokens
- Subscription plans

---

## License

MIT License — See `LICENSE` for details.

---

**Built for materials scientists, by materials scientists.**
