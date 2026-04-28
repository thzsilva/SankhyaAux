# Sankhya Suporte (GreenCore)

Aplicação web para suporte interno: login com perfis (SA, leitura, robô, humano), painel,
relatórios, listagem de clientes, produtos e **liberações de notas (TSILIB)** com
detalhamento completo de impostos. Backend em Express + Supabase, frontend em
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
- [Tela de Liberações — como funciona por dentro](#tela-de-liberações--como-funciona-por-dentro)
- [Manutenção avançada — receitas de cozinha](#manutenção-avançada--receitas-de-cozinha)
- [Histórico de atualizações](#histórico-de-atualizações)
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
- API:      <http://localhost:3002> (consumida via proxy `/backend/*` do Vite)

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
│  └─ mockup-sandbox/       ← Sandbox de design (opcional)
├─ lib/
│  ├─ api-client-react/     ← cliente HTTP/React Query gerado a partir do OpenAPI
│  ├─ api-zod/              ← schemas Zod gerados a partir do OpenAPI
│  ├─ api-spec/             ← especificação OpenAPI + gerador (orval)
│  └─ db/                   ← schemas Drizzle (atualmente quase todo dead code)
├─ package.json             ← workspaces + scripts raiz
├─ tsconfig.base.json       ← config TS compartilhada
├─ tsconfig.json            ← agregador para `tsc --build`
├─ .env                     ← suas variáveis de ambiente (não comitar!)
└─ .replit                  ← configuração de workflows e deploy do Replit
```

### `artifacts/sankhya-suporte/` — Frontend (React + Vite)

```
sankhya-suporte/
├─ index.html
├─ vite.config.ts           ← porta, proxy /backend → :3002, allowedHosts
├─ tsconfig.json
├─ package.json
└─ src/
   ├─ main.tsx
   ├─ App.tsx               ← rotas (wouter), layout/menu, providers globais
   ├─ index.css             ← Tailwind + estilos globais
   ├─ lib/
   │  └─ auth.tsx           ← AuthProvider, useAuth, papéis (SA/human/etc)
   ├─ components/
   │  └─ export-reports.tsx
   └─ pages/
      ├─ login.tsx
      ├─ dashboard.tsx
      ├─ clients.tsx
      ├─ products.tsx
      ├─ reports.tsx
      ├─ releases.tsx       ← liberações (tsilib): lista + modal de detalhes ENRIQUECIDO
      └─ not-found.tsx
```

Todas as chamadas HTTP usam `@workspace/api-client-react` (gerado pelo orval) — exceto
`auth.tsx` e `releases.tsx`, que usam `fetch()` cru. O Vite faz proxy de `/backend/*`
para `http://127.0.0.1:3002`.

> ℹ️ **Por que `/backend` e não `/api`?** A borda da Replit reserva caminhos `/api*`
> para a infraestrutura interna dela. Por isso o frontend chama `/backend/*`.
> Em Vercel ambos prefixos funcionam (o `vercel.json` reescreve os dois para a função).

### `artifacts/api-server/` — Backend (Express)

```
api-server/
├─ package.json
├─ build.mjs                ← bundler esbuild (entrega dist/index.mjs)
├─ tsconfig.json
├─ supabase-users.sql       ← script SQL p/ criar a tabela app_users no Supabase
└─ src/
   ├─ index.ts              ← entrypoint
   ├─ app.ts                ← cria o Express + INSTANCIA o supabase (exportado!)
   ├─ lib/
   │  ├─ env.ts             ← carrega .env de múltiplas localizações
   │  ├─ logger.ts          ← instancia o pino
   │  ├─ roles.ts           ← tipos de papel + helpers (canWrite, isAdmin)
   │  └─ log-activity.ts    ← (não usado hoje — depende de lib/db)
   └─ routes/
      ├─ index.ts           ← agrega todos os routers em /api
      ├─ auth.ts            ← /auth/*, requireAuth, requireWrite, requireAdmin, seed
      ├─ clients.ts         ← /clients
      ├─ products.ts        ← /products
      ├─ dashboard.ts       ← /dashboard/...
      ├─ releases.ts        ← /releases (lista, solicitantes, details, release)
      └─ health.ts          ← /health
```

> 📌 **Onde fica o cliente Supabase:** **NÃO existe** `src/lib/supabase.ts`. A
> instância é criada e exportada direto de `src/app.ts`:
> ```ts
> import { supabase } from "../app";
> ```
> Toda rota que precisa falar com o banco importa daí.

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

> ⚠️ **Atenção:** as rotas `/releases/*` **não estão no `openapi.yaml`** (foram
> implementadas usando `fetch()` cru direto no front). Se quiser ganhar tipagem
> automática delas, declare-as no OpenAPI e rode o codegen — mas hoje NÃO é
> obrigatório.

### `lib/api-client-react/` — Cliente HTTP/React Query (essencial)

Gerado pelo orval. Exporta hooks (`useGetClients`, `useCreateProduct`, etc.) usados
pelas páginas do frontend. O arquivo `custom-fetch.ts`:
- `setBaseUrl()` aponta para `/api`
- `setAuthTokenGetter()` anexa o JWT no header `Authorization`
- Reescreve `/api/...` → `/backend/...`

### `lib/api-zod/` — Schemas de validação (essencial)

Schemas Zod gerados a partir do mesmo OpenAPI.

### `lib/db/` — Schemas Drizzle (dead code)

Hoje a persistência é 100% via Supabase JS. Manter ou remover, ver tabela abaixo.

---

## O que é essencial vs. opcional

| Caminho                              | Status     | Pode remover? |
|--------------------------------------|------------|---------------|
| `artifacts/sankhya-suporte/`         | Essencial  | ❌ |
| `artifacts/api-server/`              | Essencial  | ❌ |
| `lib/api-client-react/`              | Essencial  | ❌ |
| `lib/api-zod/`                       | Essencial  | ❌ |
| `lib/api-spec/`                      | Build-time | ⚠️ remover só se nunca for regerar a API |
| `lib/db/` + `log-activity.ts`        | Não usado  | ✅ se não for usar Drizzle |
| `artifacts/mockup-sandbox/`          | Não usado  | ✅ se não usa o Canvas do Replit |

---

## Fluxo da aplicação

1. Browser carrega `index.html` → `main.tsx` → `App.tsx`.
2. `AuthProvider` (em `lib/auth.tsx`) lê o JWT do `localStorage` (se houver) e chama
   `GET /backend/auth/me` pra validar.
3. Se não autenticado → redireciona pra `/login`.
4. `Login.tsx` faz `POST /backend/auth/login` → backend consulta `app_users` no
   Supabase usando a **service_role key**, valida bcrypt, retorna `{ token, user }`.
5. O token é guardado e injetado nas próximas requisições.
6. Páginas (`clients`, `products`, `dashboard`, `reports`) usam hooks gerados.
   `releases.tsx` usa `fetch()` cru pra falar com `/backend/releases/*`.

---

## Banco de dados — guia de manutenção

### Visão geral

O app **não tem schema próprio de Sankhya** — ele lê/escreve em tabelas que vêm
da Sankhya e ficam armazenadas no **Supabase (Postgres)**. O backend Express usa o
SDK `@supabase/supabase-js` (não Drizzle nem Prisma) com a chave **`service_role`**
para passar por cima da Row-Level Security.

> ⚠️ A `service_role` ignora RLS. Por isso ela **só pode estar no backend** —
> nunca no frontend.

### Tabelas usadas

| Tabela          | Origem                  | Status        | Usada por                                            |
|-----------------|-------------------------|---------------|------------------------------------------------------|
| `app_users`     | App (criada por nós)    | **Obrigatória** | `auth.ts` → `/login`, autenticação, papéis           |
| `sankhya_users` | App (mapping codusu→nome) | **Obrigatória** | `releases.ts` → resolve nomes de solicitante/liberador |
| `tgfpar`        | Sankhya (parceiros)     | Obrigatória   | `clients.ts` → `/clientes`, dashboard               |
| `tgfpro`        | Sankhya (produtos)      | Obrigatória   | `products.ts` → `/produtos`, dashboard              |
| `tgfven`        | Sankhya (vendedores)    | Recomendada   | `releases.ts` → modal de detalhes (apelido vendedor) |
| `tsilib`        | Sankhya (liberações)    | Obrigatória   | `releases.ts` → lista, ação "liberar"               |
| `TGFCAB`        | Sankhya (cabeçalho de nota) | Obrigatória | `releases.ts` → detalhes da liberação              |
| `TGFITE`        | Sankhya (itens da nota) | Obrigatória   | `releases.ts` → detalhes da liberação              |
| `VGFLIBEVE`     | Sankhya (eventos)       | Obrigatória   | `releases.ts` → traduz evento numérico em texto    |
| `tgftop`        | Sankhya (tipo operação) | **Opcional**  | `releases.ts` → mostra descrição da TOP            |
| `tgfnat`        | Sankhya (natureza)      | **Opcional**  | `releases.ts` → mostra descrição da natureza       |
| `tgftrb`        | Sankhya (tributação)    | **Opcional**  | `releases.ts` → CST/CSOSN/descrição por item       |
| `tgfemp`        | Sankhya (empresa)       | **Opcional**  | `releases.ts` → nome fantasia da empresa            |

> 💡 **As tabelas marcadas "Opcional" são tolerantes a ausência:** se não
> existirem no Supabase, o backend captura o erro `PGRST205` (relation not
> found), loga em `warn` e segue retornando os campos sem enriquecimento. O
> front mostra o código numérico no lugar da descrição. Não quebra o app.

### Padrão de nomenclatura no Postgres

| Tabela         | Como foi criada               | Como o código chama                       |
|----------------|-------------------------------|-------------------------------------------|
| `app_users`    | Sem aspas → minúsculo          | `supabase.from("app_users")`              |
| `sankhya_users`| Sem aspas → minúsculo          | `supabase.from("sankhya_users")`          |
| `tgfpar`, `tgfpro`, `tgfven`, `tsilib`, `tgftop`, `tgfnat`, `tgftrb`, `tgfemp` | Sem aspas → minúsculo | `supabase.from("tgfpar")` |
| `TGFCAB`, `TGFITE`, `VGFLIBEVE` | **Com aspas** → MAIÚSCULO LITERAL | `supabase.from("TGFCAB")` |

> ⚠️ **Pegadinha clássica:** os 3 últimos foram criados com nome entre aspas
> duplas no SQL, então o Postgres preserva o case **exato**. Por isso o
> backend chama `supabase.from("TGFCAB")` (e colunas como `"NUNOTA"`,
> `"DESCRICAO"`). Se algum dia padronizar tudo em minúsculo, ajuste o
> `releases.ts` na hora.

### Modelo de relacionamento (atualizado)

```
                              ┌─────────────────┐
                              │   app_users     │  (autenticação interna)
                              └─────────────────┘

                              ┌─────────────────┐
                              │  sankhya_users  │  (codusu → nome humano)
                              │  PK: codusu     │
                              └────────┬────────┘
                                       │ resolve nomes para:
                                       │ - tsilib.codususolicit
                                       │ - tsilib.codusulib
                                       │ - tgfcab.codusu
                                       │ - tgfcab.codusuinc

  ┌────────────┐                       ┌─────────────┐
  │   tgfpar   │◄── codparc ───────────│   tsilib    │── tabela='TGFCAB' ──┐
  │ (parceiros)│                       │ (liberações)│   nuchave = NUNOTA  │
  └────────────┘                       │             │                     ▼
                                       │   evento ───┼──► VGFLIBEVE   ┌──────────┐
                                       └─────────────┘   .EVENTO      │  TGFCAB  │
                                                         .DESCRICAO   │ (nota)   │
                                                                      │          │
                                                                      │ codparc ─┼──► tgfpar
                                                                      │ codvend ─┼──► tgfven
                                                                      │ codemp  ─┼──► tgfemp (opcional)
                                                                      │ codtipoper ► tgftop (opcional)
                                                                      │ codnat  ─┼──► tgfnat (opcional)
                                                                      └────┬─────┘
                                                                           │ NUNOTA (1:N)
                                                                           ▼
                                                                      ┌──────────┐
                                                                      │  TGFITE  │
                                                                      │ (itens)  │
                                                                      │          │
                                                                      │ codprod ─┼──► tgfpro
                                                                      │ codtrib ─┼──► tgftrb (opcional)
                                                                      └──────────┘
```

### Como uma consulta acontece, do clique até o Postgres

Exemplo: clicar em "Detalhes" de uma liberação.

```
[Frontend]                                       [Backend]                        [Supabase]
─────────                                        ────────                         ─────────
releases.tsx renderiza
  └─ openDetails(row) → fetch GET /backend/releases/:nuchave/:seq/details
                ──────► proxy Vite → :3002
                            │
                            ├─ pinoHttp loga req
                            ├─ requireAuth (decode JWT)
                            ├─ rota /releases/:nuchave/:seq/details (releases.ts)
                            │
                            │  Passo 1: SELECT * FROM tsilib  ───────────────────► tsilib
                            │  Passo 2: SELECT * FROM "VGFLIBEVE" ───────────────► VGFLIBEVE
                            │  Passo 3: SELECT (40+ cols) FROM tgfcab ───────────► tgfcab
                            │           SELECT (15+ cols) FROM tgfite ───────────► tgfite
                            │  Passo 4: 7 SELECTs paralelos (Promise.all):
                            │           sankhya_users / tgfpar / tgfven / tgfemp /
                            │           tgftop / tgfnat / tgfpro / tgftrb
                            │  Passo 5: monta { release, event, note, items, usuarios }
                            │           - note ganha .parceiro, .vendedor, .empresa, .operacao, .natureza
                            │           - cada item ganha .produto, .tributacao
                            │
                            └─ res.json(payload)
                ◄─── 200 OK
modal renderiza:
- cabeçalho da nota (parceiro/vendedor/operação/natureza por nome)
- bloco de impostos do cabeçalho (16 valores)
- tabela de itens com CST/CSOSN, base ICMS, % ICMS, vlr ICMS, vlr IPI, ICMS-ST
```

### Onde ficam as queries no código

| Arquivo                                          | Tabelas    | O que faz |
|--------------------------------------------------|------------|-----------|
| `routes/auth.ts`                                 | `app_users`| login (bcrypt + JWT), middlewares, seed |
| `routes/clients.ts`                              | `tgfpar`   | listar clientes |
| `routes/products.ts`                             | `tgfpro`   | listar produtos |
| `routes/dashboard.ts`                            | `tgfpar`, `tgfpro`, `tsilib` | contagens |
| `routes/releases.ts`                             | `tsilib`, `TGFCAB`, `TGFITE`, `VGFLIBEVE`, `sankhya_users`, `tgfpar`, `tgfven`, `tgfpro`, e (opcionalmente) `tgftop`, `tgfnat`, `tgftrb`, `tgfemp` | lista, solicitantes, **details enriquecido** com 7 entidades em paralelo, ação `release` (UPDATE em `tsilib`) |

---

## Tela de Liberações — como funciona por dentro

Esta é a tela mais complexa do app. Ela combina 4 endpoints e 12 tabelas
diferentes para mostrar tudo o que o liberador precisa pra decidir.

### Endpoints

| Método | Path                                        | Quem usa     | O que faz |
|--------|---------------------------------------------|--------------|-----------|
| GET    | `/backend/releases?status=&codususolicit=`  | tabela principal | Lista liberações com filtro de status (`pending`/`released`/`all`) e solicitante. Já vem com `solicitante_nome`. |
| GET    | `/backend/releases/solicitantes`            | dropdown      | Lista distinta de `codususolicit` + nome (de `sankhya_users`). |
| GET    | `/backend/releases/:nuchave/:seq/details`   | modal         | Carrega tudo: liberação + evento + cabeçalho da nota + itens + 4 usuários + descrições de parceiro/vendedor/operação/natureza/empresa/tributação. |
| POST   | `/backend/releases/:nuchave/:seq/release`   | botão liberar | Marca a liberação como aprovada (UPDATE em `tsilib`). Exige `obslib` no body. |

### Permissão para liberar

Apenas roles `SA`, `human` e `robot` podem chamar o `POST .../release`. A role
`leitura` vê tudo mas **não vê o botão "Liberar"** no UI nem consegue chamar o
endpoint (retorna 403). Implementado em `releases.ts`:

```ts
const role = req.user?.role;
if (role !== "robot" && role !== "human" && role !== "SA") {
  res.status(403).json({ error: "Sem permissao para liberar" });
  return;
}
```

### Regra de valor liberado

O sistema **sempre** libera o valor exatamente igual ao `vlratual` que o Sankhya
solicitou. Qualquer valor enviado pelo cliente é ignorado de propósito, pra
não permitir over/under-release. Trecho:

```ts
const vlrLiberado = Number(existing.vlratual ?? 0);
```

### O que acontece num `POST /release`

Atualiza 4 colunas em `tsilib`:

```sql
UPDATE tsilib
   SET dhlib = NOW(),
       codusulib = <id do usuário logado>,
       vlrliberado = <vlratual da própria linha>,
       obslib = '<observação preenchida>'
 WHERE nuchave = ? AND sequencia = ?;
```

### O que aparece no modal de detalhes

1. **Cabeçalho da solicitação (tsilib):** tabela, evento, limite, atual,
   solicitante (nome resolvido), liberador (se já foi liberada), observações.
2. **Cabeçalho da nota (tgfcab):** nº/série da nota, empresa (nome), parceiro
   (nome + CNPJ), vendedor (apelido), tipo de operação (descrição da TOP),
   natureza (descrição), datas, responsável, inclusor, valor total.
3. **Impostos do cabeçalho (16 valores):** Base ICMS, Vlr ICMS, Base IPI, Vlr
   IPI, Base ICMS-ST, Vlr ICMS-ST, PIS, COFINS, ISS, IRF, INSS, frete, desconto,
   outros, juros, seguro.
4. **Itens (tgfite):** sequência, produto (nome + referência + código), qtd, un,
   vlr unit., desconto, total, **CST/CSOSN + descrição da tributação**, base
   ICMS, % ICMS, vlr ICMS, vlr IPI, ICMS-ST.

---

## Manutenção avançada — receitas de cozinha

### 1. Olhar dados direto no banco

No painel do **Supabase** → **SQL Editor** → cola e roda:

```sql
-- Liberações pendentes
SELECT * FROM tsilib WHERE dhlib IS NULL ORDER BY dhsolicit DESC LIMIT 20;

-- Mapeamento de usuário do Sankhya → nome (popular esta tabela é importante!)
SELECT * FROM sankhya_users ORDER BY codusu;

-- Buscar parceiro
SELECT * FROM tgfpar WHERE codparc = 1234;

-- Quais liberações foram feitas por mim hoje?
SELECT * FROM tsilib
 WHERE dhlib::date = CURRENT_DATE
   AND codusulib = (SELECT id FROM app_users WHERE email = 'meu@email.com');
```

### 2. Adicionar/alterar/remover um usuário do app

Tabela `app_users`. Campos: `email`, `password_hash`, `name`, `role`
(valores válidos: `SA`, `human`, `robot`, `leitura`).

Pra gerar bcrypt da senha (terminal do Replit):

```bash
node -e "console.log(require('bcryptjs').hashSync('minhasenha', 10))"
```

Cola o resultado em `password_hash`. **Não armazene senha em texto puro.**

Pra trocar a senha de alguém via SQL Editor:

```sql
UPDATE app_users
   SET password_hash = '$2a$10$...gerado-acima...'
 WHERE email = 'fulano@greencore.com';
```

Ou direto com `crypt()` (a extensão `pgcrypto` já está habilitada no Supabase):

```sql
UPDATE app_users
   SET password_hash = crypt('NovaSenha123', gen_salt('bf', 10))
 WHERE email = 'fulano@greencore.com';
```

### 3. Reverter uma liberação feita por engano

```sql
UPDATE tsilib
   SET dhlib = NULL,
       codusulib = 0,
       vlrliberado = 0,
       obslib = NULL
 WHERE nuchave = 364499 AND sequencia = 1;
```

A linha volta pra "Pendentes" no app.

### 4. Popular as tabelas auxiliares (tgftop, tgfnat, tgftrb, tgfemp)

São **opcionais** — sem elas o app funciona, mas o liberador vê só códigos no
lugar de descrições. Pra popular, exporte do Sankhya:

```sql
-- No Sankhya (Oracle/SQL Server):
SELECT CODTIPOPER, MAX(DHALTER) AS DHALTER, DESCROPER, ATIVO
  FROM TGFTOP
 GROUP BY CODTIPOPER, DESCROPER, ATIVO;

SELECT CODNAT, DESCRNAT, ATIVO FROM TGFNAT;

SELECT CODTRIB, DESCRTRIB, CST, CSOSN FROM TGFTRB;

SELECT CODEMP, NOMEFANT, RAZAOSOCIAL FROM TGFEMP;
```

E importe no Supabase via SQL Editor (`INSERT INTO ...`) ou via importação de
CSV. **Estrutura mínima esperada pelo `releases.ts`:**

| Tabela    | Colunas obrigatórias                  |
|-----------|---------------------------------------|
| `tgftop`  | `codtipoper` (PK), `descroper`        |
| `tgfnat`  | `codnat` (PK), `descrnat`             |
| `tgftrb`  | `codtrib` (PK), `descrtrib`, `cst`, `csosn` |
| `tgfemp`  | `codemp` (PK), `nomefant`, `razaosocial` |

Após popular, o modal de detalhes passa a mostrar os nomes automaticamente —
**sem precisar reiniciar o backend** (cada request consulta a tabela em tempo
real).

### 5. Popular `sankhya_users`

A `sankhya_users` é **a tabela mais importante pra UX**. Sem ela todos os
usuários aparecem como "Usuário #123" em vez de pelo nome.

Estrutura mínima:

```sql
CREATE TABLE IF NOT EXISTS public.sankhya_users (
  codusu  smallint PRIMARY KEY,
  nome    varchar(60) NOT NULL,
  email   varchar(100),
  ativo   char(1) DEFAULT 'S'
);
```

População inicial (exporte do Sankhya `TSIUSU`):

```sql
-- No Sankhya:
SELECT CODUSU, NOMEUSU AS NOME, EMAIL, ATIVO FROM TSIUSU WHERE ATIVO = 'S';
```

Cole no Supabase como um bloco de `INSERT INTO sankhya_users (codusu,nome,email,ativo) VALUES (...)`
ou faça import de CSV.

### 6. Adicionar uma nova rota que consulta uma tabela nova

Passo a passo (ex.: nova rota `/notas` lendo `tgfcab`):

1. Criar `artifacts/api-server/src/routes/notas.ts` no padrão de `clients.ts`:

   ```ts
   import { Router } from "express";
   import { supabase } from "../app";
   import { logger } from "../lib/logger";
   import { requireAuth } from "./auth";

   const router = Router();

   router.get("/notas", requireAuth, async (_req, res) => {
     const { data, error } = await supabase
       .from("tgfcab")
       .select("nunota,numnota,dtneg,vlrnota")
       .order("dtneg", { ascending: false })
       .limit(100);

     if (error) {
       logger.error({ err: error }, "Failed to query notas");
       res.status(500).json({ error: "Erro ao buscar notas" });
       return;
     }
     res.json(data ?? []);
   });

   export default router;
   ```

2. Importar e mountar em `routes/index.ts`:

   ```ts
   import notasRouter from "./notas";
   router.use(notasRouter);
   ```

3. Reiniciar o workflow `Start application`.

4. (Opcional) atualizar `lib/api-spec/openapi.yaml` com a nova rota e rodar o
   codegen do orval pra ganhar o hook React no frontend.

### 7. Adicionar um novo campo no modal de Detalhes

Passos (em ordem):

1. **Backend (`releases.ts`):** adiciona o nome da coluna no `cabSelect` ou
   `iteSelect` (dependendo se é do cabeçalho ou item).
2. **Frontend (`releases.tsx`):** adiciona o campo no tipo `NoteHeader` ou
   `NoteItem`.
3. **Frontend (`releases.tsx`):** adiciona o `<div>` no JSX do modal mostrando o
   campo via `fmtMoney(details.note.<campo>)` ou similar.

Exemplo: adicionar `vlrtotal` no resumo de impostos:

```ts
// No backend, em cabSelect:
"vlrtotal",

// No frontend, em NoteHeader:
vlrtotal?: number | string | null;

// No JSX:
<div>
  <p className="text-xs text-slate-500">Total geral</p>
  <p className="font-medium">{fmtMoney(details.note.vlrtotal)}</p>
</div>
```

### 8. Diagnosticar "não vejo dado nenhum" no app

Checklist em ordem:

1. **Tabela existe e tem dado?** Roda no SQL Editor.
2. **RLS bloqueando?** Se a `service_role` tiver correta, RLS é ignorada.
   Se você acidentalmente colocou a chave `anon` em `SUPABASE_SERVICE_ROLE_KEY`,
   tudo vem vazio. Confere o `.env`.
3. **Rota responde?**
   ```bash
   curl -s http://localhost:5000/backend/clients | head -c 500
   ```
4. **Logs do backend** (`pino-http` loga toda request).
5. **Mapeamento quebrado?** Se a Sankhya mudou nome de coluna, o `.map(...)` no
   backend devolve `undefined`. Atualiza o nome em `releases.ts`/`clients.ts`.

### 9. Diagnosticar "modal de detalhes mostra códigos em vez de nomes"

Significa que uma das tabelas auxiliares não foi populada (ou foi populada
errado). Ordem de investigação:

```sql
-- Solicitante/liberador aparece como "Usuário #123"?
SELECT COUNT(*) FROM sankhya_users;
-- Se = 0, popule a tabela (receita 5 acima)

-- Parceiro aparece só como número?
SELECT COUNT(*) FROM tgfpar WHERE codparc = <codigo do parceiro da nota>;
-- Se = 0, falta sincronizar tgfpar com Sankhya

-- Tipo de operação / natureza / tributação só como código?
SELECT 'tgftop' AS t, COUNT(*) FROM tgftop
UNION ALL SELECT 'tgfnat', COUNT(*) FROM tgfnat
UNION ALL SELECT 'tgftrb', COUNT(*) FROM tgftrb
UNION ALL SELECT 'tgfemp', COUNT(*) FROM tgfemp;
-- Se alguma = 0 ou ERRO, popule (receita 4 acima)
```

Os logs do backend ajudam: ele loga em `warn` toda vez que uma tabela auxiliar
falha ao carregar.

### 10. Voltando atrás: como reverter mudanças

- **Replit**: o workspace cria checkpoints automáticos a cada tarefa. Restaura
  código + (se necessário) banco.
- **Git**: `git log` lista, `git revert <hash>` desfaz uma mudança específica.
- **Vercel**: cada deploy fica salvo. Em **Deployments** → `...` do deploy bom →
  **Promote to Production** — rollback instantâneo.

### Arquivos essenciais (se você só pudesse abrir 10)

Em ordem de criticidade:

1. `.env` — sem ele nada roda (Supabase + JWT).
2. `artifacts/api-server/src/app.ts` — Express + cliente Supabase.
3. `artifacts/api-server/src/routes/auth.ts` — login + middleware.
4. `artifacts/api-server/src/routes/index.ts` — agregador de rotas.
5. `artifacts/api-server/src/routes/releases.ts` — **a rota mais complexa**
   (12 tabelas, fan-out paralelo, enriquecimento opcional).
6. `artifacts/api-server/src/routes/clients.ts` / `products.ts` /
   `dashboard.ts` — outras consultas ao Supabase.
7. `artifacts/sankhya-suporte/src/lib/auth.tsx` — guarda JWT + contexto.
8. `artifacts/sankhya-suporte/src/pages/releases.tsx` — modal de detalhes
   completo (parceiro, impostos, itens com tributação).
9. `artifacts/sankhya-suporte/src/App.tsx` — rotas + menu.
10. `artifacts/sankhya-suporte/vite.config.ts` — proxy `/backend` → API.

---

## Histórico de atualizações

### Refator do `releases.ts` — Detalhes enriquecidos (atual)

**Motivação:** o liberador precisava ver impostos, descrições e nomes (não só
códigos) na hora de aprovar uma liberação. Antes só apareciam números.

**Mudanças no backend (`artifacts/api-server/src/routes/releases.ts`):**

- Adicionado helper genérico `safeLoadMap` que **tolera tabela inexistente**
  (erro `PGRST205` do PostgREST). Isso permite ir adicionando as 4 tabelas
  opcionais (`tgftop`, `tgfnat`, `tgftrb`, `tgfemp`) gradualmente sem precisar
  de deploy coordenado.
- 7 carregadores paralelos via `Promise.all` na rota `/details`:
  `loadSankhyaUserNames`, `loadParceiros`, `loadVendedores`, `loadEmpresas`,
  `loadTiposOperacao`, `loadNaturezas`, `loadProdutos`, `loadTributacoes`.
  Antes: ~3 queries sequenciais. Agora: ~10 queries paralelas (mesma ou menor
  latência total porque rodam em paralelo).
- A query do `tgfcab` cresceu de **15 colunas** para **40+ colunas**, incluindo
  todos os valores fiscais (Base/Vlr ICMS, IPI, ICMS-ST, ISS, PIS, COFINS,
  IRF, INSS, frete, descontos, outros, juros, seguro).
- A query do `tgfite` cresceu para incluir `codtrib`, base/% ICMS, base/% IPI,
  ICMS-ST, ISS por item, CST IPI, CSOSN.
- Resposta enriquecida: `note.parceiro`, `note.vendedor`, `note.empresa`,
  `note.operacao`, `note.natureza`, e cada item ganha `produto` e `tributacao`
  (CST/CSOSN/descrição).

**Mudanças no frontend (`artifacts/sankhya-suporte/src/pages/releases.tsx`):**

- Tipos `NoteHeader` e `NoteItem` expandidos com todos os novos campos.
- Helper novo `entityLabel(code, name)` para mostrar `"Nome (#código)"` com
  fallback gracioso pro código quando o nome não veio.
- Helper novo `fmtPerc()` para alíquotas.
- Modal aumentado pra `max-w-4xl`.
- **Cabeçalho da nota** agora mostra: nº/série, empresa (nome), parceiro
  (nome + CNPJ), vendedor (apelido), tipo de operação (descrição), natureza
  (descrição), datas, responsável, inclusor, valor total.
- **Nova seção "Impostos e valores"** com 16 campos do cabeçalho fiscal.
- **Tabela de itens** ganhou 6 colunas novas: CST/CSOSN + descrição,
  base ICMS, % ICMS, vlr ICMS, vlr IPI, ICMS-ST.

**Compatibilidade:** os campos antigos (`note.codparc`, `note.codvend`...)
continuam vindo direto da row. Os novos (`note.parceiro`, `note.vendedor`...)
são adicionais. Se as 4 tabelas opcionais não existirem, o front cai pro
código numérico — sem quebrar.

**Como subir:**

1. Substitua o conteúdo de `artifacts/api-server/src/routes/releases.ts`.
2. Substitua o conteúdo de `artifacts/sankhya-suporte/src/pages/releases.tsx`.
3. Reinicie o workflow `Start application` (ou aguarde hot-reload).
4. (Opcional, recomendado) crie e popule `tgftop`, `tgfnat`, `tgftrb`,
   `tgfemp` no Supabase (receita 4 do guia de manutenção).

### Schema do Supabase — Correções de PK e tipos

**Motivação:** as tabelas `tgfcab` e `tgfite` foram importadas sem PRIMARY KEY,
e várias colunas de valor monetário estavam como `bigint` (truncava centavos).

**Mudanças aplicadas:**

- `ALTER TABLE tgfcab ADD CONSTRAINT tgfcab_pkey PRIMARY KEY (nunota)`
- `ALTER TABLE tgfite ADD CONSTRAINT tgfite_pkey PRIMARY KEY (nunota, sequencia)`
- Corrigidos tipos: `vlrnota`, `vlricms`, `vlripi`, etc. → `numeric(15,2)`
- Corrigidas datas armazenadas como `text` → `timestamp`

### Tabela `sankhya_users` — Mapeamento codusu → nome

Tabela criada para permitir resolver `codususolicit`/`codusulib`/`codusu`/
`codusuinc` em nomes legíveis no app, sem precisar replicar a `tsiusu` inteira
do Sankhya. Estrutura:

```sql
CREATE TABLE public.sankhya_users (
  codusu smallint PRIMARY KEY,
  nome   varchar(60) NOT NULL,
  email  varchar(100),
  ativo  char(1) DEFAULT 'S'
);
```

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
`[deployment]` com tudo pronto.
