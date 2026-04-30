# AkuWallet — agent context

This file is for AI assistants working on this repo. It summarizes structure, where things live, and the expected “happy path” for frontend↔backend communication.

## Repo structure

- `backend/`: FastAPI app
  - `main.py`: FastAPI app entry; includes routers; CORS middleware is configured here.
  - `routers/`: API endpoints (`auth`, `transactions`, plus newer modules like `accounts`, `investments`, `settings`, `networth`, `smart_import`).
  - `services/`: backend services (e.g. FX / exchange rates).
  - `database.py`, `models.py`: DB access + models.
  - `migrations/`: DB migrations (if present).

- `frontend/`: Next.js app router
  - `app/`: route segments (e.g. `app/dashboard/...`)
  - `components/`: UI + dashboard components
  - `lib/`: api clients, contexts, hooks, types, etc.
  - `next.config.mjs`: rewrites `/api/:path*` → backend.

## Frontend ↔ Backend communication (important)

- The frontend should call the backend **via the Next.js proxy**:
  - In the browser: use relative URLs like `fetch('/api/networth')`, not `http://localhost:8000/networth`.
  - This is powered by `frontend/next.config.mjs` rewrite:
    - `source: '/api/:path*'`
    - `destination: process.env.BACKEND_URL || 'http://localhost:8000/:path*'`
- Server components may call the backend directly (using `process.env.BACKEND_URL`) when needed.

## Environment variables

- `BACKEND_URL`: backend base URL used by Next.js rewrites and (some) server-side calls.
  - Example: `BACKEND_URL=http://localhost:8000`

