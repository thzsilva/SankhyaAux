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

Os arquivos em `migrations/` sao SQL para rodar **uma unica vez** no SQL Editor do Supabase (cole o conteudo inteiro e execute). Eles nao rodam automaticamente — o app nao tem orquestrador de migration.

- `migrations/001_sankhya_users.sql` — **descontinuado.** Criava `public.sankhya_users` como mapeamento manual de `codusu -> nome` antes de termos a `tsiusu` espelhada. O backend nao le mais essa tabela; pode ser ignorado em instalacoes novas, e em instalacoes antigas voce pode dropar `public.sankhya_users` quando quiser (`drop table public.sankhya_users;`).
- `migrations/002_sankhya_lookup_tables.sql` — cria as tabelas auxiliares espelhadas da Sankhya, todas com PK e identificadores em lowercase (mesmo padrao de `tgfcab`, `tgfite`, `tsilib`):
  - `public.tsiusu` (codusu PK, nomeusu, email) — **fonte unica** dos nomes de usuario (solicitante, liberador, responsavel/inclusor da nota).
  - `public.tgftop` (codtipoper PK, descroper, tipmov, ativo) — descricao do tipo de operacao (TOP) usada em `tgfcab.codtipoper`.
  - `public.tgfnat` (codnat PK, descrnat, ativo, receitadesp) — descricao da natureza usada em `tgfcab.codnat`.

  Depois de rodar o SQL, popule as colunas de descricao via Table Editor ou via `INSERT … ON CONFLICT (pk) DO UPDATE` com o dump completo da Sankhya. Codigos novos que aparecerem em liberacoes futuras precisam ser inseridos manualmente nessas tabelas (idealmente com um sync periodico do ERP).

## Como o enriquecimento das liberacoes funciona

A tela de detalhes da liberacao (`GET /api/releases/:nuchave/:sequencia/details`) e montada em `artifacts/api-server/src/routes/releases.ts`. Para cada liberacao ela carrega em paralelo (via `safeLoadMap`) as tabelas auxiliares e devolve um objeto enriquecido para o front:

| Campo no front | Tabela Supabase | Coluna PK | Coluna mostrada |
|---|---|---|---|
| `usuarios.solicitante.nome`, `usuarios.liberador.nome`, `usuarios.nota_responsavel.nome`, `usuarios.nota_inclusor.nome` | `tsiusu` | `codusu` | `nomeusu` |
| `note.parceiro.nomeparc` | `tgfpar` | `codparc` | `nomeparc`, `razaosocial`, `cgc_cpf` |
| `note.vendedor.apelido` | `tgfven` | `codvend` | `apelido` |
| `note.empresa.nomefant` | `tgfemp` | `codemp` | `nomefant`, `razaosocial` |
| `note.operacao.descroper` | `tgftop` | `codtipoper` | `descroper` |
| `note.natureza.descrnat` | `tgfnat` | `codnat` | `descrnat` |
| `items[].produto.descrprod` | `tgfpro` | `codprod` | `descrprod`, `referencia` |
| `items[].tributacao.descrtrib` | `tgftrb` | `codtrib` | `descrtrib`, `cst`, `csosn` |
| `event.descricao` (cabecalho do card) | `VGFLIBEVE` (uppercase com aspas) | `EVENTO` | `DESCRICAO` |

O `safeLoadMap` e tolerante: se uma dessas tabelas nao existir no Supabase (codigo de erro PostgREST `PGRST205`), o campo correspondente vem `null` e o front cai para o codigo numerico — nada quebra. Por isso e seguro adicionar tabelas auxiliares uma de cada vez.

### Onde mexer quando precisar mudar coisa

- **Adicionar/atualizar nome de usuario, descricao de TOP ou de natureza:** rodar `INSERT … ON CONFLICT … DO UPDATE` direto em `public.tsiusu` / `public.tgftop` / `public.tgfnat` no SQL Editor do Supabase. Nao precisa mexer em codigo.
- **Mostrar uma coluna nova (ex.: `tgfpar.cep`) na tela de detalhes:**
  1. Adicionar a coluna no `select` de `loadParceiros` (ou do loader equivalente) em `artifacts/api-server/src/routes/releases.ts` e no tipo `ParceiroLite` no topo do arquivo.
  2. Renderizar o campo em `artifacts/sankhya-suporte/src/pages/releases.tsx` no card de detalhes (procure por `details.note.parceiro?.nomeparc` para ver o padrao).
- **Espelhar uma tabela nova da Sankhya (ex.: `tgfgru`, grupos de produto):**
  1. `CREATE TABLE public.<tabela> (…)` no SQL Editor (lowercase, com PK).
  2. Adicionar um loader novo em `releases.ts` no padrao do `loadParceiros`/`loadNaturezas` e incluir o resultado no `Promise.all` que enriquece o `note`/`items`.
  3. Adicionar o campo no tipo correspondente em `artifacts/sankhya-suporte/src/pages/releases.tsx` e renderizar.
- **Trocar a tabela usada para o nome do usuario:** alterar `loadSankhyaUserNames` em `artifacts/api-server/src/routes/releases.ts`. Hoje le so de `tsiusu.nomeusu`.

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
- `lib/api-server/src/lib/log-activity.ts` is a no-op stub — see "Notes from import"..
