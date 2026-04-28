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
- [Banco de dados — guia de manutenção](#banco-de-dados--guia-de-manutenção)
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
      ├─ releases.tsx       ← liberações (tabela tsilib): pendentes/liberadas + ação "liberar"
      └─ not-found.tsx      ← 404
```

Todas as chamadas HTTP usam `@workspace/api-client-react` (gerado pelo orval a partir do
OpenAPI) — exceto `auth.tsx` e `releases.tsx`, que usam `fetch()` cru. O Vite faz proxy
de `/backend/*` (e `/api/*` por compatibilidade) para `http://127.0.0.1:3002`.

> ℹ️ **Por que `/backend` e não `/api`?** A borda da Replit reserva caminhos `/api*`
> para a infraestrutura interna dela e nunca repassa pro servidor de dev (resultado:
> 502/404). Por isso o frontend chama `/backend/*` em produção. Em Vercel os dois
> prefixos funcionam — o `vercel.json` reescreve ambos para a função serverless. Veja
> a seção **Deploy** e o `replit.md` para o histórico completo dessa decisão.

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
   `GET /backend/auth/me` pra validar (o backend decodifica o JWT e devolve o usuário).
3. Se não autenticado → redireciona pra `/login`.
4. `Login.tsx` faz `POST /backend/auth/login` → backend consulta a tabela `app_users`
   no Supabase usando a **service_role key**, valida bcrypt, retorna `{ token, user }`.
5. O token é guardado e injetado em todas as próximas requisições via `custom-fetch.ts`
   (header `Authorization: Bearer ...`).
6. Páginas (`clients`, `products`, `dashboard`, `reports`) usam hooks do
   `@workspace/api-client-react` pra buscar dados. `releases.tsx` usa `fetch()` cru
   pra falar com `/backend/releases`.

---

## Banco de dados — guia de manutenção

### Visão geral

O app **não tem schema próprio** — ele lê/escreve direto em tabelas que vêm da
**Sankhya** e ficam armazenadas no **Supabase (Postgres)**. O backend Express
usa o **SDK `@supabase/supabase-js`** (não Drizzle nem Prisma) com a chave
**`service_role`** para passar por cima da Row-Level Security e ler tudo.

> ⚠️ A `service_role` ignora RLS. Por isso ela **só pode estar no backend** —
> nunca no frontend (o frontend só recebe os dados já tratados pelo Express).

### Tabelas usadas (e quem usa cada uma)

| Tabela     | Origem         | Usada por (rota → tela)                                              |
|------------|----------------|----------------------------------------------------------------------|
| `app_users`| App (criada por nós) | `auth.ts` → `/login` (autenticação, papéis)                  |
| `tgfpar`   | Sankhya (parceiros)  | `clients.ts` → `/clientes`, `dashboard.ts` (contagem)        |
| `tgfpro`   | Sankhya (produtos)   | `products.ts` → `/produtos`, `dashboard.ts` (contagem)       |
| `tsilib`   | Sankhya (liberações) | `releases.ts` → `/liberacoes` (listar + ação "liberar")      |

A tabela `app_users` é **a única que o app mantém** — todas as outras são
espelhos da Sankhya, alimentadas por algum job de sincronização externo
(que não vive neste repositório).

### Como uma consulta acontece, do clique até o Postgres

Exemplo: clicar em "Clientes" no menu.

```
[Frontend]                                       [Backend]                       [Supabase / Postgres]
─────────                                        ────────                        ─────────────────────
clients.tsx renderiza                                                            
  └─ useListClients()  (hook gerado pelo orval)                                  
       └─ customFetch(GET /api/clients)                                          
            (Authorization: Bearer <jwt>)                                        
                ──────► /backend/clients (proxy Vite)                            
                            │                                                    
                            ├─ pinoHttp loga req                                 
                            ├─ requireAuth (decode JWT, valida)                  
                            ├─ rota /clients (clients.ts)                        
                            │     supabase.from("tgfpar")                        
                            │       .select("*")                                 
                            │       .order("dtcad", { ascending:false })         
                            │           ────────────────────────────────► SELECT * FROM tgfpar
                            │                                                    ORDER BY dtcad DESC
                            │           ◄──────────────────────────────  (linhas)
                            ├─ map p/ shape esperado pelo OpenAPI                
                            ├─ ListClientsResponse.parse() valida com Zod        
                            └─ res.json(clients)                                 
                ◄─── 200 OK + JSON
react-query guarda em cache
componente renderiza tabela
```

Resumo do que cada parte faz:
- **`custom-fetch.ts`** (em `lib/api-client-react/src/`) anexa o JWT, reescreve
  `/api/...` → `/backend/...` (pra escapar da reserva de rota da Replit), e
  trata erros de forma uniforme.
- **`requireAuth`** (em `routes/auth.ts`) decodifica o JWT a cada request. Se
  inválido/expirado → 401.
- **`supabase.from(...)`** é o cliente JavaScript do Supabase. Toda a query
  fica em código JS (não SQL puro).
- **`*.parse()` dos schemas Zod** garante que o que sai do backend bate com o
  contrato do OpenAPI — se mudar a tabela e esquecer de atualizar o mapeamento,
  o `.parse()` quebra com um erro claro em vez de mandar dado torto pro front.

### Onde ficam as queries no código

| Arquivo                                          | Tabela     | O que faz                                              |
|--------------------------------------------------|------------|--------------------------------------------------------|
| `artifacts/api-server/src/routes/auth.ts`        | `app_users`| login (bcrypt + JWT), middlewares, seed inicial       |
| `artifacts/api-server/src/routes/clients.ts`     | `tgfpar`   | listar todos / buscar por id                          |
| `artifacts/api-server/src/routes/products.ts`    | `tgfpro`   | listar com filtro de busca / buscar por id            |
| `artifacts/api-server/src/routes/dashboard.ts`   | `tgfpar`, `tgfpro`, `tsilib` | contagens + agregações pro painel  |
| `artifacts/api-server/src/routes/releases.ts`    | `tsilib`   | listar pendentes/liberadas + ação `release` (UPDATE)  |

### Manutenção: tarefas comuns

#### 1. Olhar dados direto no banco (pra debugar)

No painel do **Supabase** → **SQL Editor** → cola e roda:
```sql
SELECT * FROM tsilib WHERE dhlib IS NULL ORDER BY dhsolicit DESC LIMIT 20;
SELECT * FROM tgfpar WHERE codparc = 1234;
SELECT email, role FROM app_users ORDER BY id;
```
Ou use a aba **Table Editor** pra navegar visualmente.

#### 2. Adicionar/alterar/remover um usuário do app

Tabela `app_users`. Os campos são `email`, `password_hash`, `name`, `role`
(valores válidos: `SA`, `human`, `robot`, `leitura`).

A senha precisa ser hash bcrypt. Pra gerar, no terminal do Replit:
```bash
node -e "console.log(require('bcryptjs').hashSync('minhasenha', 10))"
```
Cola o resultado em `password_hash`. **Não armazene senha em texto puro.**

Pra trocar uma senha existente:
```sql
UPDATE app_users
   SET password_hash = '$2a$10$...gerado-acima...'
 WHERE email = 'fulano@greencore.com';
```

#### 3. Reverter uma liberação feita por engano

Liberar marca 4 campos em `tsilib`. Pra reverter, no SQL Editor:
```sql
UPDATE tsilib
   SET dhlib = NULL,
       codusulib = 0,
       vlrliberado = 0,
       obslib = NULL
 WHERE nuchave = 364499 AND sequencia = 1;
```
Substituindo `nuchave`/`sequencia` pela linha desejada. Aí ela volta pra
"Pendentes" no app.

#### 4. Adicionar uma nova rota que consulta uma tabela nova

Passo a passo (ex.: nova rota `/notas` lendo `tgfcab`):

1. Criar `artifacts/api-server/src/routes/notas.ts` no mesmo padrão de
   `clients.ts` (importar `supabase`, `requireAuth`, retornar JSON).
2. Importar e mountar em `routes/index.ts`:
   ```ts
   import notasRouter from "./notas";
   router.use(notasRouter);
   ```
3. Reiniciar o workflow `Start application` (ou esperar o hot-reload do
   `npm run dev` recompilar via esbuild).
4. (Opcional, recomendado) atualizar `lib/api-spec/openapi.yaml` com a nova
   rota e rodar o codegen do orval pra ganhar o hook React no frontend.

#### 5. Diagnosticar "não vejo dado nenhum" no app

Checklist em ordem:
1. **Tabela existe e tem dado?** Roda no SQL Editor do Supabase.
2. **RLS bloqueando?** Se a chave `service_role` estiver correta, RLS é
   ignorada. Se você acidentalmente colocou a chave `anon`/`publishable` em
   `SUPABASE_SERVICE_ROLE_KEY`, tudo vem vazio. Confere no `.env`.
3. **Rota responde?** No terminal:
   ```bash
   curl -s http://localhost:5000/backend/clients | head -c 500
   ```
4. **Logs do backend.** O Express loga toda request via `pino-http`. Olha o
   workflow `Start application` no Replit (ou `vercel logs <url>` em prod).
5. **Mapeamento quebrado?** Se a Sankhya mudou nome de coluna, o `.map(...)`
   nas rotas (ex.: `row.codparc`) vira `undefined`. Atualiza o nome.

### Voltando atrás: como reverter mudanças

- **No Replit**: o workspace cria checkpoints automáticos a cada tarefa. Pra
  voltar, abre o histórico de checkpoints na barra lateral e escolhe um
  ponto. Restaura código + (se necessário) banco.
- **No Git**: cada checkpoint vira um commit. `git log` lista, `git revert
  <hash>` desfaz uma mudança específica criando um novo commit.
- **Em produção (Vercel)**: cada deploy fica salvo. Em **Deployments** na
  Vercel → clica nos `...` do deploy bom → **Promote to Production** —
  rollback instantâneo, sem precisar mexer no código.

### Arquivos essenciais (se você só pudesse abrir 10)

Em ordem de "se quebrar, o app inteiro para":

1. `.env` — sem ele nada roda (Supabase + JWT).
2. `artifacts/api-server/src/app.ts` — cria o Express, conecta ao Supabase.
3. `artifacts/api-server/src/routes/auth.ts` — login + middleware de
   autenticação que TODAS as outras rotas usam.
4. `artifacts/api-server/src/routes/index.ts` — agrega os routers.
5. `artifacts/api-server/src/routes/{clients,products,dashboard,releases}.ts`
   — onde estão as consultas de verdade ao Supabase.
6. `artifacts/sankhya-suporte/src/lib/auth.tsx` — guarda o JWT e expõe o
   contexto de usuário pra todas as páginas.
7. `artifacts/sankhya-suporte/src/App.tsx` — rotas + menu.
8. `artifacts/sankhya-suporte/vite.config.ts` — proxy `/backend` → API.
9. `lib/api-client-react/src/custom-fetch.ts` — fetch base, JWT, reescrita
   `/api`→`/backend`.
10. `vercel.json` — define como a Vercel builda e roteia em produção.

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
