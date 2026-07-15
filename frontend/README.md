# MatPilot frontend

Production Next.js 15 interface for MatPilot, the cloud workspace for materials characterization.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. Use `npm run build` for a production build and `npm run lint` for static linting.

## Structure

- `app/` — App Router routes and page layouts
- `components/` — shared UI, navigation, visualizations, and viewer
- `api/`, `lib/`, `services/` — API boundary, API client, and mock implementations
- `types/`, `hooks/`, `utils/` — shared application primitives
- `features/`, `styles/`, `assets/`, `public/` — feature, presentation, and static-asset boundaries

## Backend integration

`NEXT_PUBLIC_API_URL` is the only backend location setting. Pages currently use typed mock services in `services/mock-service.ts`; move each request to `apiClient` from `lib/api-client.ts` when the FastAPI endpoint is ready. No page hardcodes a backend URL.
