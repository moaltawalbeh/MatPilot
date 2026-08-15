# MatPilot V2 API Specification

## Global Standards
- **Base URL**: `/api/v2`
- **Authentication**: Bearer JWT Token in Authorization header.
- **Content-Type**: `application/json` (except for file uploads).
- **Pagination**: `?page=1&size=20` returning `{ data: [], total: int, page: int }`.

## Core Platform APIs
- `GET /workspaces`
- `POST /workspaces`
- `POST /workspaces/{id}/files` (multipart/form-data)

## Instrument Specific APIs (The "Spokes")

### XRD Module
- `POST /instruments/xrd/experiments`: Create new XRD experiment in a workspace.
- `GET /instruments/xrd/experiments/{id}`: Fetch raw pattern and metadata.
- `POST /instruments/xrd/experiments/{id}/process/background`: Execute baseline stripping.
- `POST /instruments/xrd/experiments/{id}/process/peaks`: Run peak detection.
- `POST /instruments/xrd/experiments/{id}/process/search-match`: Query crystallography databases.
- `POST /instruments/xrd/experiments/{id}/interpret`: Trigger AI Scientist for XRD.

### FTIR Module
- `POST /instruments/ftir/experiments`
- `GET /instruments/ftir/experiments/{id}`
- `POST /instruments/ftir/experiments/{id}/process/baseline`: Run linear/poly baseline.
- `POST /instruments/ftir/experiments/{id}/process/peaks`: Detect absorption bands.
- `POST /instruments/ftir/experiments/{id}/process/functional-groups`: Map wavenumbers to groups.
- `POST /instruments/ftir/experiments/{id}/interpret`: Trigger AI Scientist for FTIR.

### Raman Module
- `POST /instruments/raman/experiments`
- `POST /instruments/raman/experiments/{id}/process/despike`: Cosmic ray removal.
- `POST /instruments/raman/experiments/{id}/process/fit`: Peak deconvolution (Gaussian/Lorentzian).
- `POST /instruments/raman/experiments/{id}/interpret`

### UV-Vis Module
- `POST /instruments/uvvis/experiments`
- `POST /instruments/uvvis/experiments/{id}/process/kubelka-munk`
- `POST /instruments/uvvis/experiments/{id}/process/tauc-plot`: Generates Direct/Indirect band gaps.
- `POST /instruments/uvvis/experiments/{id}/interpret`

## Shared Result API
- `POST /workspaces/{id}/reports`: Generate unified report across all instruments.
