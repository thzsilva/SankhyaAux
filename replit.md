# Sankhya Suporte Workspace

Monorepo (npm workspaces) with a React + Vite frontend and an Express + Supabase API backend.

## Structure
- `artifacts/sankhya-suporte` — React + Vite frontend (`@workspace/sankhya-suporte`)
- `artifacts/api-server` — Express API server (`@workspace/api-server`)
- `lib/*` — shared packages (`api-client-react`, `api-spec`, `api-zod`, `db`)

## Replit setup
- Workflow `Start application` runs `npm run dev`, which uses `concurrently` to launch:
  - API server on port `3002` (localhost)
  - Vite frontend on port `5000` (host `0.0.0.0`, `allowedHosts: true`)
- Vite proxies `/api` to `http://127.0.0.1:3002`.
- Environment variables live in `.env` (Supabase URL + publishable key are set; `SUPABASE_SERVICE_ROLE_KEY` is a placeholder — the server falls back to the publishable key, so user-seeding may fail until a real service-role key is provided).

## Deployment
Configured as a `vm` deployment:
- Build: `npm run workspaces:build`
- Run: API server (`PORT=3002`) + Vite preview (`PORT=5000`) launched together.
