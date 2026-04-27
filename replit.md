# Sankhya Suporte Workspace

Monorepo (npm workspaces) with a React + Vite frontend and an Express + Supabase API backend.

## Structure
- `artifacts/sankhya-suporte` — React + Vite frontend (`@workspace/sankhya-suporte`)
- `artifacts/api-server` — Express API server (`@workspace/api-server`)
- `lib/*` — shared packages (`api-client-react`, `api-spec`, `api-zod`)

## Replit setup
- Workflow `Start application` runs `npm run dev`, which uses `concurrently` to launch:
  - API server on port `3002` (localhost)
  - Vite frontend on port `5000` (host `0.0.0.0`, `allowedHosts: true`)
- Vite proxies `/api` to `http://127.0.0.1:3002`.
- Environment variables live in `.env` (Supabase URL/keys, JWT secret).

## Notes from import
- The api-server originally referenced a `@workspace/db` package that is not present in `lib/`.
  - Removed the dependency from `artifacts/api-server/package.json`.
  - Stubbed `artifacts/api-server/src/lib/log-activity.ts` to a no-op (the only consumer of `@workspace/db`, and it was never called from anywhere in the codebase).
- Added production static-file serving in `artifacts/api-server/src/app.ts`. When `NODE_ENV=production`, the Express server serves the built Vite frontend (from `artifacts/sankhya-suporte/dist/public`) and falls back to `index.html` for client-side routes, while still serving the API under `/api/*`.

## Deployment
Configured as `autoscale`:
- Build: `npm run build --workspace @workspace/sankhya-suporte && npm run build --workspace @workspace/api-server`
- Run: `NODE_ENV=production PORT=5000 node --enable-source-maps artifacts/api-server/dist/index.mjs`

The single Express process serves both the API and the built frontend on port 5000.
