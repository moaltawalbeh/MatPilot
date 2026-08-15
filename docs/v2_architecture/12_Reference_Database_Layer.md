# MatPilot V2 Reference Database Layer

## 1. Architectural Strategy
To guarantee stability and isolation, no scientific processing module or AI agent is permitted to query external databases directly. Instead, all requests are routed through the dedicated **Reference Database Layer (RDL)** via a standardized Connector Architecture.

## 2. Connector Architecture
The RDL defines an interface `IReferenceDatabaseConnector` which handles:
- Authentication & Handshake with external APIs.
- Query normalization.
- Response parsing into standardized MatPilot domain objects.
- Rate limiting and retry logic.

### Supported Connectors (Current & Roadmap)
- **Crystallography**: `CODConnector`, `MaterialsProjectConnector`
- **Infrared (FTIR)**: `OpenSpecyConnector`, `NISTWebBookConnector`
- **Raman**: `RRUFFConnector`, `RODConnector`
- **UV-Vis**: `PhotochemCADConnector`
- **Future**: ICSD, CCDC, SDBS.

## 3. Caching Strategy
- **Layer 1 (In-Memory)**: Frequently accessed reference structures (e.g., standard quartz, polystyrene) are cached in Redis to provide sub-millisecond lookups during real-time fitting.
- **Layer 2 (Persistent Cache)**: Queried records are stored in a dedicated `reference_cache` PostgreSQL database table. If a user queries the same chemical formula or peak sequence, the system serves the cached result if the TTL (Time-To-Live) is valid.

## 4. Synchronization & Versioning
- Connectors run nightly background jobs to verify if cached reference patterns have been deprecated or updated upstream.
- Every experiment references the explicit *version* of the database used during matching to ensure absolute reproducibility.

## 5. Licensing & Isolation
- Public databases (e.g., COD) are freely queryable.
- Proprietary databases (e.g., ICSD) require the user to input their institutional license key. The RDL securely stores this key via AES-256 encryption and proxies the request to the proprietary endpoint, ensuring MatPilot remains compliant with third-party licensing.
