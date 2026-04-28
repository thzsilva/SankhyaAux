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
- Vite proxies both `/backend` and `/api` to `http://127.0.0.1:3002`.

### Important: `/api/*` is reserved by Replit's edge proxy
Replit's public edge proxy (the `*.replit.dev` domain in dev, and any custom domain in prod) intercepts paths starting with `/api*` for its own infrastructure and returns 502/404 — those requests never reach the dev server. Because of that, the frontend calls the backend under `/backend/*` instead:
- `artifacts/api-server/src/app.ts` mounts the router under both `/backend` and `/api` (the latter still works for direct localhost access and tests).
- `artifacts/sankhya-suporte/src/lib/auth.tsx` and `artifacts/sankhya-suporte/src/pages/releases.tsx` build URLs with `/backend`.
- `lib/api-client-react/src/custom-fetch.ts` rewrites `/api/...` → `/backend/...` so the generated OpenAPI client (which hardcodes `/api/...`) keeps working without regeneration.

If we ever regenerate the client and want to drop the rewrite, set `servers: [{ url: /backend }]` in `lib/api-spec/openapi.yaml` and regen.
- Environment variables live in `.env` (Supabase URL/keys, JWT secret).

## Migrations

`migrations/001_sankhya_users.sql` cria a tabela opcional `public.sankhya_users` (codusu PK, nome) usada para mostrar o nome do usuario solicitante/liberador ao lado do `codusu` da Sankhya. Roda uma vez no SQL Editor do Supabase. O backend funciona normalmente sem ela (so nao mostra os nomes).

## Identificadores no Supabase (case-sensitive)

As tabelas do dump da Sankhya foram criadas no Supabase em **lowercase**: `tgfcab`, `tgfite`, `tsilib`. As colunas tambem sao todas lowercase. A unica excecao e `VGFLIBEVE` (e suas colunas `EVENTO`, `DESCRICAO`), que foi criada em UPPERCASE entre aspas. Em chamadas via supabase-js (que serializa tudo para PostgREST), os identificadores precisam casar exatamente — nao confundir com a convencao do Oracle Sankhya original que usa UPPERCASE. O codigo em `artifacts/api-server/src/routes/releases.ts` segue essa regra: tudo lowercase, exceto `VGFLIBEVE`.

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

## Vercel deployment
The repo is also ready to deploy on Vercel:
- `vercel.json` (root) — sets the build command to build only the frontend (`npm run build --workspace @workspace/sankhya-suporte`), points the static output at `artifacts/sankhya-suporte/dist/public`, and rewrites both `/api/*` and `/backend/*` to the single serverless function `/api/index`.
- `api/index.ts` (root) — Vercel discovers any file under `/api` as a serverless function. This file just re-exports the existing Express app from `artifacts/api-server/src/app.ts` (Express apps are themselves `(req, res)` handlers, so no adapter is needed).
- Required env vars on Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`), `JWT_SECRET`. Set them under Project Settings → Environment Variables for Production/Preview/Development.

Caveats:
- Vercel functions are stateless and short-lived (max 30s with the configured `maxDuration`). Any future cron / sync job that needs to run continuously cannot live on Vercel — use a separate worker/service.
- `seedUsersIfEmpty` only runs in the long-lived Express server (`index.ts → app.listen`). On Vercel it is not invoked, which is fine because seeding already happened in the source DB.
- `lib/api-server/src/lib/log-activity.ts` is a no-op stub — see "Notes from import".
