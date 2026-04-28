# Sankhya Suporte (GreenCore)

Aplicação web para suporte interno: login com perfis (SA, leitura, robô, humano), painel,
relatórios, listagem de clientes e produtos. Backend em Express + Supabase, frontend em
React + Vite, organizado como monorepo (npm workspaces).

---

## Sumário

- [Stack](#stack)
- [Como rodar (resumo rápido)](#como-rodar-resumo-rápido)
- [Variáveis de ambiente (.env)](#variáveis-de-ambiente-env)
- [Estrutura de pastas — o que cada coisa faz](#estrutura-de-pastas--o-que-cada-coisa-faz)
- [Pacotes em `lib/`](#pacotes-em-lib)
- [O que é essencial vs. opcional](#o-que-é-essencial-vs-opcional)
- [Fluxo da aplicação](#fluxo-da-aplicação)
- [Scripts disponíveis](#scripts-disponíveis)
- [Deploy](#deploy)

---

## Stack

| Camada    | Tecnologia |
|-----------|-----------|
| Frontend  | React 18, Vite 5, TailwindCSS 4, wouter (router), TanStack Query, sonner (toasts), lucide-react (ícones) |
| Backend   | Node 20, Express 5, JWT, bcryptjs, pino (logs), dotenv |
| Banco     | Supabase (Postgres + REST/SDK). Tabela `app_users` para login |
| Build     | esbuild (server) + Vite (web), npm workspaces, cross-env, concurrently |

---

## Como rodar (resumo rápido)

```bash
npm install
# crie/edite o .env (veja a próxima seção)
npm run dev
```

- Frontend: <http://localhost:5000>
- API:      <http://localhost:3002> (consumida via proxy `/api/*` do Vite)

Login de teste (criados automaticamente no Supabase na primeira vez que o servidor sobe):

| E-mail                     | Senha       | Papel       |
|----------------------------|-------------|-------------|
| `admin@greencore.com`      | `admin123`  | SA          |
| `usuario@greencore.com`    | `usuario123`| humano      |
| `leitura@greencore.com`    | `leitura123`| somente leitura |
| `robot@greencore.com`      | `robot123`  | robô        |

---

## Variáveis de ambiente (`.env`)

Crie um arquivo `.env` na **raiz do projeto** (mesma pasta do `package.json`).
Cada variável em **uma única linha**, sem aspas, sem espaços em volta do `=`:

```env
# Supabase — frontend (Vite injeta no browser)
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxx
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx

# Supabase — backend (NUNCA exponha no frontend)
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...sua-chave-service-role-completa

# JWT do backend (qualquer string longa aleatória)
JWT_SECRET=troque_por_uma_string_longa_aleatoria_pelo_menos_32_chars
```

**Onde achar cada chave no Supabase:** Dashboard → seu projeto → *Project Settings → API*:
- `anon` / `publishable` → `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`
- `service_role` (secreto!) → `SUPABASE_SERVICE_ROLE_KEY`

**Importante:** a tabela `app_users` tem RLS ativada e bloqueia a chave publishable.
Se a `SUPABASE_SERVICE_ROLE_KEY` estiver errada/faltando, o login retorna **500**.

---

## Estrutura de pastas — o que cada coisa faz

```
.
├─ artifacts/
│  ├─ sankhya-suporte/      ← FRONTEND (essencial)
│  ├─ api-server/           ← BACKEND   (essencial)
│  └─ mockup-sandbox/       ← Sandbox de design (opcional, ver abaixo)
├─ lib/
│  ├─ api-client-react/     ← cliente HTTP/React Query gerado a partir do OpenAPI
│  ├─ api-zod/              ← schemas Zod gerados a partir do OpenAPI
│  ├─ api-spec/             ← especificação OpenAPI + gerador (orval)
│  └─ db/                   ← schemas Drizzle (atualmente quase todo dead code, ver abaixo)
├─ package.json             ← workspaces + scripts raiz
├─ tsconfig.base.json       ← config TS compartilhada
├─ tsconfig.json            ← agregador para `tsc --build`
├─ .env                     ← suas variáveis de ambiente (não comitar!)
└─ .replit                  ← configuração de workflows e deploy do Replit
```

### `artifacts/sankhya-suporte/` — Frontend (React + Vite)

```
sankhya-suporte/
├─ index.html               ← HTML raiz que o Vite serve
├─ vite.config.ts           ← porta, proxy /api → :3002, allowedHosts
├─ tsconfig.json
├─ package.json
└─ src/
   ├─ main.tsx              ← bootstrapping do React, monta <App/>
   ├─ App.tsx               ← rotas (wouter), layout/menu, providers globais
   ├─ index.css             ← Tailwind + estilos globais
   ├─ lib/
   │  └─ auth.tsx           ← AuthProvider, useAuth, papéis (SA/human/etc), login/logout, persistência do JWT
   ├─ components/
   │  └─ export-reports.tsx ← botão/diálogo de exportação de relatórios
   └─ pages/
      ├─ login.tsx          ← tela de login
      ├─ dashboard.tsx      ← painel inicial (cards, resumos)
      ├─ clients.tsx        ← lista/CRUD de clientes
      ├─ products.tsx       ← lista/CRUD de produtos
      ├─ reports.tsx        ← relatórios
      └─ not-found.tsx      ← 404
```

Todas as chamadas HTTP usam `@workspace/api-client-react` (gerado pelo orval a partir do
OpenAPI). O Vite faz proxy de `/api/*` para `http://127.0.0.1:3002`.

### `artifacts/api-server/` — Backend (Express)

```
api-server/
├─ package.json
├─ build.mjs                ← bundler esbuild (entrega dist/index.mjs)
├─ tsconfig.json
├─ supabase-users.sql       ← script SQL p/ criar a tabela app_users no Supabase
├─ .env                     ← (legado — a env real fica na raiz, ver lib/env.ts)
└─ src/
   ├─ index.ts              ← entrypoint: lê PORT, sobe app.listen, dispara seed
   ├─ app.ts                ← cria o Express, configura cors/json/logs, monta /api
   ├─ lib/
   │  ├─ env.ts             ← ⭐ carrega .env de várias localizações (raiz, server, dist)
   │  ├─ logger.ts          ← instancia o pino
   │  ├─ roles.ts           ← tipos de papel + helpers (canWrite, isAdmin)
   │  └─ log-activity.ts    ← (não usado hoje — depende de lib/db)
   └─ routes/
      ├─ index.ts           ← agrega todos os routers em /api
      ├─ auth.ts            ← /auth/login, /auth/me, middlewares requireAuth/requireWrite/requireAdmin, seed
      ├─ clients.ts         ← /clients
      ├─ products.ts        ← /products
      ├─ dashboard.ts       ← /dashboard/...
      └─ health.ts          ← /health
```

### `artifacts/mockup-sandbox/` — Sandbox de design (OPCIONAL)

Projeto **separado** com Vite + Radix UI + shadcn-style components, usado apenas para
prototipar telas no Canvas do Replit (preview de componentes em iframe). **Não é
necessário para a aplicação rodar nem fazer deploy**. Pode ignorar se você não usa o
Canvas. Se quiser remover, basta apagar a pasta — nenhum código de produção depende
dela.

---

## Pacotes em `lib/`

São pacotes compartilhados via workspaces (`file:../../lib/...`).

### `lib/api-spec/` — Contrato da API (essencial p/ regenerar clientes)

```
api-spec/
├─ openapi.yaml             ← contrato OpenAPI da API (fonte da verdade)
├─ orval.config.ts          ← gera api-client-react e api-zod a partir do openapi.yaml
└─ package.json
```

Quando você muda `openapi.yaml`, rode o codegen do orval para regenerar
`lib/api-client-react/src/generated/` e `lib/api-zod/src/generated/`.

### `lib/api-client-react/` — Cliente HTTP/React Query (essencial)

Gerado pelo orval. Exporta hooks (`useGetClients`, `useCreateProduct`, etc.) usados
pelas páginas do frontend. O arquivo `custom-fetch.ts` é o fetch base com:
- `setBaseUrl()` para apontar para `/api`
- `setAuthTokenGetter()` para anexar o JWT no header `Authorization`

### `lib/api-zod/` — Schemas de validação (essencial)

Schemas Zod gerados a partir do mesmo OpenAPI, para validação de payloads.

### `lib/db/` — Schemas Drizzle (atualmente quase todo dead code)

```
db/src/schema/
├─ activity.ts, clients.ts, products.ts, releases.ts,
   sync.ts, tgfpar.ts, tgfpro.ts, tickets.ts, users.ts
```

**Estado atual:** o único arquivo do servidor que importa `@workspace/db` é
`api-server/src/lib/log-activity.ts`, que **não é chamado em lugar nenhum**. Toda a
persistência hoje é feita via Supabase JS (não via Drizzle/Postgres direto).

Você tem duas opções:
1. **Manter** se planeja migrar para Drizzle/Postgres direto no futuro.
2. **Remover** se não vai usar: apaga `lib/db/`, remove `log-activity.ts` e tira o
   `@workspace/db` do `dependencies` de `artifacts/api-server/package.json`.

---

## O que é essencial vs. opcional

| Caminho                              | Status     | Pode remover? |
|--------------------------------------|------------|---------------|
| `artifacts/sankhya-suporte/`         | Essencial  | ❌ |
| `artifacts/api-server/`              | Essencial  | ❌ |
| `lib/api-client-react/`              | Essencial  | ❌ (frontend usa) |
| `lib/api-zod/`                       | Essencial  | ❌ (re-exportado pelo client) |
| `lib/api-spec/`                      | Build-time | ⚠️ remover só se nunca for regerar a API |
| `lib/db/` + `log-activity.ts`        | Não usado  | ✅ se não pretende usar Drizzle |
| `artifacts/mockup-sandbox/`          | Não usado  | ✅ se não usa o Canvas do Replit |
| `artifacts/api-server/.env`          | Legado     | ✅ a env real fica na raiz |
| `artifacts/api-server/sqlite.db`     | Resíduo    | ✅ não é usado (app usa Supabase) |
| `pnpm-lock.yaml`                     | Resíduo    | ✅ o projeto usa npm (`package-lock.json`) |

---

## Fluxo da aplicação

1. Browser carrega `index.html` → `main.tsx` → `App.tsx`.
2. `AuthProvider` (em `lib/auth.tsx`) lê o JWT do `localStorage` (se houver) e chama
   `GET /api/auth/me` para validar.
3. Se não autenticado → redireciona para `/login`.
4. `Login.tsx` faz `POST /api/auth/login` → backend consulta a tabela `app_users` no
   Supabase usando a **service_role key**, valida bcrypt, retorna `{ token, user }`.
5. O token é guardado e injetado em todas as próximas requisições via `custom-fetch.ts`.
6. Páginas (`clients`, `products`, `dashboard`, `reports`) usam hooks do
   `@workspace/api-client-react` para buscar dados protegidos.

---

## Scripts disponíveis

Na raiz:

| Script                | O que faz |
|-----------------------|-----------|
| `npm run dev`         | Sobe API (3002) e Web (5000) ao mesmo tempo via `concurrently` + `cross-env` |
| `npm run build`       | Roda typecheck + build de todos os workspaces |
| `npm run typecheck`   | Type-check completo (libs + workspaces) |

---

## Deploy

Configurado como deployment do tipo **VM** no Replit:

- **Build:** `npm run workspaces:build` (gera `dist/` do server e do web)
- **Run:** sobe API + `vite preview` em paralelo

Pra publicar, é só clicar em **Publish** no Replit. O `.replit` já contém a seção
`[deployment]` com tudo pronto...
