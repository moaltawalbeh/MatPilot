# MatPilot Deployment Guide

## Architecture

| Layer | Service | URL Pattern |
|-------|---------|-------------|
| Frontend | Vercel | `https://<project>.vercel.app` |
| Backend | Render | `https://<service>.onrender.com` |
| Database | Neon PostgreSQL | `postgresql://...neon.tech/...` |

## Prerequisites

- GitHub repository with MatPilot code
- Vercel account (frontend)
- Render account (backend)
- Neon account (database)

---

## 1. Database Setup (Neon)

1. Create a new Neon project.
2. Copy the connection string from the Neon dashboard.
3. The connection string looks like: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

No migrations are needed — the current version uses in-memory storage. When PostgreSQL support is added, run:

```bash
alembic upgrade head
```

---

## 2. Backend Deployment (Render)

### Connect Repository

1. Log in to [Render](https://render.com).
2. Click **New** → **Web Service**.
3. Connect your GitHub repository.
4. Configure:

| Setting | Value |
|---------|-------|
| Name | `matpilot-api` |
| Runtime | Python |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |
| Plan | Free (or Starter) |

### Environment Variables

Set these in the Render dashboard under **Environment**:

| Variable | Value | Required |
|----------|-------|----------|
| `MATPILOT_ENV` | `production` | Yes |
| `MATPILOT_CORS_ORIGINS` | `https://your-app.vercel.app` | Yes |
| `DATABASE_URL` | `postgresql://...neon.tech/...` | When DB is added |
| `MATPILOT_STORAGE_PATH` | `/data/storage` | Optional |
| `MATPILOT_CIF_CACHE_DIR` | `/data/cif_cache` | Optional |
| `MATPILOT_LOG_LEVEL` | `INFO` | Optional |

### Deploy

Click **Create Web Service**. Render will build and deploy automatically.

The backend URL will be something like: `https://matpilot-api.onrender.com`

---

## 3. Frontend Deployment (Vercel)

### Connect Repository

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** → **Project**.
3. Import your GitHub repository.
4. Vercel auto-detects Next.js. Configure:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `frontend` |
| Build Command | `next build` |
| Output Directory | `.next` |

### Environment Variables

Set these in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_API_URL` | `https://matpilot-api.onrender.com` | Yes |

### Deploy

Click **Deploy**. Vercel will build and deploy automatically.

The frontend URL will be something like: `https://matpilot.vercel.app`

---

## 4. Post-Deployment Checklist

- [ ] Backend health check returns `{"status":"healthy","version":"0.3.0"}` at `/health`
- [ ] Frontend loads without errors
- [ ] Frontend can communicate with backend API
- [ ] File upload works
- [ ] Phase identification works
- [ ] Rietveld refinement works
- [ ] PDF report generation works
- [ ] CORS is configured (no browser console CORS errors)
- [ ] No localhost references in production network requests

---

## 5. Local Development

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Start backend
python -m backend.main
# or
uvicorn backend.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

### Environment Variables

Copy `.env.example` to `.env` in the project root for backend variables.
Copy `frontend/.env.example` to `frontend/.env.local` for frontend variables.

---

## 6. All Environment Variables

### Backend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `MATPILOT_ENV` | `development` | Environment: development, staging, production |
| `MATPILOT_API_HOST` | `0.0.0.0` | API server bind address |
| `MATPILOT_API_PORT` | `8000` | API server port |
| `MATPILOT_CORS_ORIGINS` | `*` (prod: restricted) | Comma-separated CORS origins |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `MATPILOT_STORAGE_BACKEND` | `local` | Storage: local, s3, azure, gcs |
| `MATPILOT_STORAGE_PATH` | `./storage` | Local storage directory |
| `MATPILOT_S3_BUCKET` | — | S3 bucket name |
| `MATPILOT_S3_REGION` | — | S3 region |
| `MATPILOT_AZURE_CONTAINER` | — | Azure Blob container |
| `MATPILOT_GCS_BUCKET` | — | GCS bucket name |
| `MATPILOT_TEMP_DIR` | OS temp + `/matpilot` | Temp file directory |
| `MATPILOT_MAX_FILE_SIZE` | `52428800` (50MB) | Max upload size in bytes |
| `MATPILOT_MAX_JOBS` | `4` | Max concurrent analysis jobs |
| `MATPILOT_JOB_TIMEOUT` | `300` | Job timeout in seconds |
| `MATPILOT_DEFAULT_WAVELENGTH` | `1.5406` | Default X-ray wavelength (Cu Kα) |
| `MATPILOT_CIF_CACHE_DIR` | `data/cif_cache` | CIF cache directory |
| `MATPILOT_COD_API_URL` | `https://www.crystallography.net/cod` | COD API base URL |
| `MATPILOT_CACHE_TTL` | `3600` | Reference cache TTL in seconds |
| `MATPILOT_SEARCH_TIMEOUT` | `30` | External DB search timeout |
| `MATPILOT_LOG_LEVEL` | `INFO` | Log level |
| `MATPILOT_LOG_STRUCTURED` | `true` | JSON structured logging |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |

---

## 7. Troubleshooting

### Backend won't start on Render

- Check build logs for missing dependencies.
- Ensure `requirements.txt` is in the repository root.
- Verify Python version is 3.11+.

### Frontend can't reach API

- Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel.
- Ensure the backend URL includes `https://` and has no trailing slash.
- Check Render logs for CORS errors — update `MATPILOT_CORS_ORIGINS`.

### CORS errors in browser console

- Set `MATPILOT_CORS_ORIGINS` on Render to your Vercel frontend URL.
- Format: `https://your-app.vercel.app` (no trailing slash).
- Multiple origins: `https://app.vercel.app,https://staging.vercel.app`.

### PDF generation fails

- Check Render logs for reportlab/matplotlib errors.
- Ensure `MATPILOT_STORAGE_PATH` points to a writable directory.

---

## 8. Known Limitations (Pre-Alpha)

- **No database persistence** — all data is lost on backend restart. PostgreSQL support is planned.
- **No authentication** — the API is open. Authentication will be added before production release.
- **In-memory storage** — uploaded files and analysis results are not persisted across restarts.
- **COD API dependency** — phase identification relies on crystallography.net being available.
