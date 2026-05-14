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
- [PWA — App instalável](#pwa--app-instalável)
- [Fluxo da aplicação](#fluxo-da-aplicação)
- [Banco de dados — guia de manutenção](#banco-de-dados--guia-de-manutenção)
- [Tela de Liberações — como funciona por dentro](#tela-de-liberações--como-funciona-por-dentro)
- [Tela de Produtos — Toggle de Rastreio de Lote](#tela-de-produtos--toggle-de-rastreio-de-lote)
- [Manutenção avançada — receitas de cozinha](#manutenção-avançada--receitas-de-cozinha)
- [Histórico de atualizações](#histórico-de-atualizações)
- [Scripts disponíveis](#scripts-disponíveis)
- [Deploy](#deploy)

---

## Stack

| Camada    | Tecnologia |
|-----------|-----------|
| Frontend  | React 18, Vite 5, TailwindCSS 4, wouter (router), TanStack Query, sonner (toasts), lucide-react (ícones), vite-plugin-pwa (PWA/Workbox) |
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
│  └─ api-server/           ← BACKEND   (essencial)
├─ lib/
│  ├─ api-client-react/     ← cliente HTTP/React Query gerado a partir do OpenAPI
│  ├─ api-zod/              ← schemas Zod gerados a partir do OpenAPI
│  └─ api-spec/             ← especificação OpenAPI + gerador (orval)
├─ package.json             ← workspaces + scripts raiz
├─ tsconfig.base.json       ← config TS compartilhada
├─ tsconfig.json            ← agregador para `tsc --build`
├─ .env                     ← suas variáveis de ambiente (não comitar!)
└─ .replit                  ← configuração de workflows e deploy do Replit
```

### `artifacts/sankhya-suporte/` — Frontend (React + Vite)

```
sankhya-suporte/
├─ index.html               ← meta tags PWA + fontes
├─ vite.config.ts           ← porta, proxy /backend → :3002, VitePWA
├─ tsconfig.json
├─ package.json
└─ src/
   ├─ main.tsx
   ├─ App.tsx               ← rotas (wouter), layout/menu, providers globais
   ├─ index.css             ← Tailwind + estilos globais
   ├─ lib/
   │  └─ auth.tsx           ← AuthProvider, useAuth, papéis (SA/human/etc)
   ├─ components/
   │  ├─ export-reports.tsx
   │  └─ pwa-install-prompt.tsx  ← card de instalação PWA
   └─ pages/
      ├─ login.tsx
      ├─ dashboard.tsx
      ├─ clients.tsx
      ├─ products.tsx       ← listagem + toggle de rastreio de lote
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
   │  └─ roles.ts           ← tipos de papel + helpers (canWrite, isAdmin)
   └─ routes/
      ├─ index.ts           ← agrega todos os routers em /api
      ├─ auth.ts            ← /auth/*, requireAuth, seed de usuários iniciais
      ├─ clients.ts         ← /clients
      ├─ products.ts        ← /products, PATCH /products/:id/toggle-lote
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

> ⚠️ **Atenção:** as rotas `/releases/*` e `/products/:id/toggle-lote` **não estão
> no `openapi.yaml`** (foram implementadas usando `fetch()` cru direto no front).
> Se quiser ganhar tipagem automática, declare-as no OpenAPI e rode o codegen — mas
> hoje NÃO é obrigatório.

### `lib/api-client-react/` — Cliente HTTP/React Query (essencial)

Gerado pelo orval. Exporta hooks (`useListProducts`, `useGetProduct`, `useListClients`,
etc.) usados pelas páginas do frontend. O arquivo `custom-fetch.ts`:
- `setBaseUrl()` aponta para `/api`
- `setAuthTokenGetter()` anexa o JWT no header `Authorization`
- Reescreve `/api/...` → `/backend/...`

### `lib/api-zod/` — Schemas de validação (essencial)

Schemas Zod gerados a partir do mesmo OpenAPI. O `ListProductsResponseItem` inclui o
campo `temrastrolote` (adicionado manualmente) para que o `parse()` não stripa o valor
retornado pelo backend.

---

## O que é essencial vs. opcional

| Caminho                              | Status     | Pode remover? |
|--------------------------------------|------------|---------------|
| `artifacts/sankhya-suporte/`         | Essencial  | ❌ |
| `artifacts/api-server/`              | Essencial  | ❌ |
| `lib/api-client-react/`              | Essencial  | ❌ |
| `lib/api-zod/`                       | Essencial  | ❌ |
| `lib/api-spec/`                      | Build-time | ⚠️ remover só se nunca for regerar a API |

---

## PWA — App instalável

O app é uma **Progressive Web App** totalmente instalável. No Chrome/Edge o navegador
exibe o ícone de instalação na barra de endereços; no mobile aparece o banner nativo
"Adicionar à tela inicial".

### Como funciona

| Peça | Arquivo | O que faz |
|------|---------|-----------|
| Plugin Vite | `vite.config.ts` → `VitePWA(...)` | Gera `manifest.webmanifest` e `sw.js` automaticamente no build |
| Service Worker | gerado pelo Workbox via plugin | Cacheia shell do app + assets estáticos; rotas `/api` e `/backend` nunca vão para cache |
| Prompt de instalação | `src/components/pwa-install-prompt.tsx` | Card fixo no rodapé com botões "Instalar" / "Agora não". Aparece só quando o navegador dispara `beforeinstallprompt` |
| Meta tags | `index.html` | `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-*` para iOS |

### Estratégia de cache (Workbox)

| Tipo de recurso | Estratégia | Duração |
|----------------|------------|---------|
| JS / CSS / HTML / imagens | `precache` (build-time) | Até próximo deploy |
| Google Fonts CSS | `CacheFirst` | 1 ano |
| Google Fonts arquivos | `CacheFirst` | 1 ano |
| `/api/*` e `/backend/*` | **Sem cache** — sempre rede | — |

### Atualização automática

`registerType: "autoUpdate"` — quando um novo deploy é publicado, o SW é atualizado
em background. Na próxima vez que o usuário abrir o app, já estará na versão nova
sem nenhuma intervenção manual.

### Ícones

Usamos `public/sankhya.png` para todos os tamanhos. Se quiser ícones dedicados
por tamanho (melhor qualidade no splash screen do iOS), adicione em `public/`:

```
public/
├─ icon-192.png    ← 192×192 px
└─ icon-512.png    ← 512×512 px
```

E atualize o array `icons` em `vite.config.ts`.

### Prompt de instalação — comportamento

1. Aparece apenas quando o navegador considerar o app instalável.
2. Clicar "Agora não" salva `pwa-install-dismissed=1` no `localStorage` e não exibe mais.
3. Para testar no Chrome: DevTools → Application → Manifest → "Add to homescreen".

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
SDK `@supabase/supabase-js` com a chave **`service_role`** para passar por cima da
Row-Level Security.

> ⚠️ A `service_role` ignora RLS. Por isso ela **só pode estar no backend** —
> nunca no frontend.

### Tabelas usadas

| Tabela          | Origem                  | Status        | Usada por                                            |
|-----------------|-------------------------|---------------|------------------------------------------------------|
| `app_users`     | App (criada por nós)    | **Obrigatória** | `auth.ts` → `/login`, autenticação, papéis           |
| `sankhya_users` | App (mapping codusu→nome) | **Obrigatória** | `releases.ts` → resolve nomes de solicitante/liberador |
| `tgfpar`        | Sankhya (parceiros)     | Obrigatória   | `clients.ts` → `/clientes`, dashboard               |
| `tgfpro`        | Sankhya (produtos)      | Obrigatória   | `products.ts` → listagem + toggle `temrastrolote`   |
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

### Modelo de relacionamento

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
| `routes/auth.ts`                                 | `app_users`| login (bcrypt + JWT), middleware `requireAuth`, seed |
| `routes/clients.ts`                              | `tgfpar`   | listar clientes |
| `routes/products.ts`                             | `tgfpro`   | listar produtos + toggle `temrastrolote` |
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
`only_read` vê tudo mas **não vê o botão "Liberar"** no UI nem consegue chamar o
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

## Tela de Produtos — Toggle de Rastreio de Lote

A tela de **Produtos** (`/produtos`) exibe a listagem da `tgfpro` e, em cada linha,
oferece dois botões: **Ver** (abre painel de detalhes) e o botão de toggle de lote
(alterna o rastreamento de lote do produto direto no banco).

### O que o botão faz

O campo `temrastrolote` (tipo `character varying`) na tabela `tgfpro` controla se o
produto exige rastreio de lote no Sankhya. O botão alterna entre dois estados:

| Valor no banco | Significado              | Label exibido               | Cor do botão |
|----------------|--------------------------|-----------------------------|--------------|
| `'S'`          | Rastreio **habilitado**  | Desabilitar Rastreio de Lote | Verde        |
| `'N'`          | Rastreio **desabilitado**| Habilitar Rastreio de Lote  | Vermelho     |

> O campo `temrastrolote` é carregado na listagem de produtos (via `serialize()` no
> backend), então o botão já exibe a cor e o label corretos no carregamento da página,
> sem precisar interagir antes.

### Rota de backend

**Arquivo:** `artifacts/api-server/src/routes/products.ts`

```
PATCH /products/:id/toggle-lote
```

Não requer body. O `id` é o `codprod` do produto.

**Fluxo interno:**

```
1. Valida :id (número inteiro positivo)
2. SELECT temrastrolote FROM tgfpro WHERE codprod = :id
3. Inverte: 'N' → 'S'  |  qualquer outro valor → 'N'
4. UPDATE tgfpro SET temrastrolote = <novoValor> WHERE codprod = :id
5. Retorna { temrastrolote: "S" | "N" }
```

**Respostas:**

| Status | Corpo                                        | Quando ocorre |
|--------|----------------------------------------------|---------------|
| 200    | `{ temrastrolote: "S" \| "N" }`              | Sucesso       |
| 400    | `{ error: "ID inválido" }`                   | `:id` não é número positivo |
| 404    | `{ error: "Produto não encontrado" }`        | `codprod` não existe na `tgfpro` |
| 500    | `{ error: "...", detail: "<msg Supabase>" }` | Falha no banco — mensagem detalhada para diagnóstico |

### Frontend

**Arquivo:** `artifacts/sankhya-suporte/src/pages/products.tsx`

O estado `loteStatus` é inicializado via `useEffect` a partir dos dados da API assim
que `useListProducts()` retorna, garantindo que a cor e o label sejam corretos já no
primeiro render:

```tsx
useEffect(() => {
  if (!data) return;
  setLoteStatus((prev) => {
    const next = { ...prev };
    for (const item of data) {
      if (!(item.id in next)) next[item.id] = item.temrastrolote;
    }
    return next;
  });
}, [data]);
```

**Notificações** via `toast` do **sonner** (montado globalmente em `App.tsx`):
- `toast.success(...)` com a ação executada
- `toast.error(body.detail ?? body.error)` em caso de falha, com a mensagem real do Supabase

### Arquivos-chave

| Arquivo | O que contém |
|---------|--------------|
| `artifacts/api-server/src/routes/products.ts` | `serialize()` inclui `temrastrolote` · Endpoint `PATCH /products/:id/toggle-lote` |
| `lib/api-zod/src/generated/api.ts` | `ListProductsResponseItem` com `temrastrolote` (adicionado manualmente) |
| `lib/api-zod/src/generated/types/product.ts` | `interface Product` com `temrastrolote: "S" \| "N"` |
| `lib/api-client-react/src/generated/api.schemas.ts` | `interface Product` com `temrastrolote` (para tipagem do hook React) |
| `artifacts/sankhya-suporte/src/pages/products.tsx` | `loteStatus` state + `useEffect` + botão com cor/label dinâmicos |

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
(valores válidos: `SA`, `human`, `robot`, `only_read`).

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
**sem precisar reiniciar o backend**.

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

Exporte do Sankhya e importe no Supabase:

```sql
-- No Sankhya:
SELECT CODUSU, NOMEUSU AS NOME, EMAIL, ATIVO FROM TSIUSU WHERE ATIVO = 'S';
```

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

2. Importar e montar em `routes/index.ts`:

   ```ts
   import notasRouter from "./notas";
   router.use(notasRouter);
   ```

3. Reiniciar o workflow `Start application`.

4. (Opcional) atualizar `lib/api-spec/openapi.yaml` com a nova rota e rodar o
   codegen do orval pra ganhar o hook React no frontend.

### 7. Adicionar um novo campo no modal de Detalhes

1. **Backend (`releases.ts`):** adiciona o nome da coluna no `cabSelect` ou `iteSelect`.
2. **Frontend (`releases.tsx`):** adiciona o campo no tipo `NoteHeader` ou `NoteItem`.
3. **Frontend (`releases.tsx`):** adiciona o `<div>` no JSX do modal.

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

```sql
-- Solicitante/liberador aparece como "Usuário #123"?
SELECT COUNT(*) FROM sankhya_users;
-- Se = 0, popule a tabela (receita 5 acima)

-- Parceiro aparece só como número?
SELECT COUNT(*) FROM tgfpar WHERE codparc = <codigo do parceiro da nota>;

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

- **Replit**: o workspace cria checkpoints automáticos a cada tarefa.
- **Git**: `git log` lista, `git revert <hash>` desfaz uma mudança específica.
- **Vercel**: cada deploy fica salvo. Em **Deployments** → `...` do deploy bom →
  **Promote to Production** — rollback instantâneo.

### Arquivos essenciais (se você só pudesse abrir 10)

Em ordem de criticidade:

1. `.env` — sem ele nada roda (Supabase + JWT).
2. `artifacts/api-server/src/app.ts` — Express + cliente Supabase.
3. `artifacts/api-server/src/routes/auth.ts` — login + middleware `requireAuth`.
4. `artifacts/api-server/src/routes/index.ts` — agregador de rotas.
5. `artifacts/api-server/src/routes/releases.ts` — **a rota mais complexa**
   (12 tabelas, fan-out paralelo, enriquecimento opcional).
6. `artifacts/api-server/src/routes/products.ts` — listagem + toggle `temrastrolote`.
7. `artifacts/sankhya-suporte/src/lib/auth.tsx` — guarda JWT + contexto.
8. `artifacts/sankhya-suporte/src/pages/releases.tsx` — modal de detalhes completo.
9. `artifacts/sankhya-suporte/src/App.tsx` — rotas + menu.
10. `artifacts/sankhya-suporte/vite.config.ts` — proxy `/backend` → API + config PWA.

---

## Histórico de atualizações

### PWA + Limpeza de código morto

**PWA:**
- Instalado `vite-plugin-pwa` (Workbox) no frontend.
- `vite.config.ts` configurado com manifest completo (nome, cores, ícones, orientação).
- `index.html` recebeu meta tags `theme-color`, `apple-touch-icon` e `apple-mobile-web-app-*`.
- Criado `src/components/pwa-install-prompt.tsx` — card de instalação no padrão visual do site, com dismiss persistido em `localStorage`.
- Service Worker com `autoUpdate`: usuário sempre recebe versão nova sem ação manual.
- Rotas de API excluídas do cache (`navigateFallbackDenylist`).

**Limpeza:**
- Removido `lib/log-activity.ts` (stub vazio, sem uso).
- Removida `canRead()` de `roles.ts` (redundante, nenhum chamador).
- Removidas `requireWrite()` e `requireAdmin()` de `auth.ts` (nenhuma rota as usava).
- Removida pasta `attached_assets/` (arquivos `.txt` de SQL colados no Replit).
- Removido alias `@assets` do `vite.config.ts`.

---

### Toggle de Rastreio de Lote na tela de Produtos

**Motivação:** permitir ativar/desativar o rastreio de lote de um produto
(`tgfpro.temrastrolote`) diretamente pelo app, sem precisar acessar o Sankhya.

**Backend (`artifacts/api-server/src/routes/products.ts`):**
- `serialize()` passou a incluir `temrastrolote` na resposta da listagem.
- Novo endpoint `PATCH /products/:id/toggle-lote`: lê o valor atual, inverte (`'N'` ↔ `'S'`) e persiste.
- Erros do Supabase são repassados no campo `detail` para facilitar diagnóstico.

**Schemas (`lib/api-zod`, `lib/api-client-react`):**
- `temrastrolote: "S" | "N"` adicionado manualmente ao `ListProductsResponseItem` (Zod)
  e ao `interface Product` (TypeScript) para que o campo não seja stripado pelo `parse()`.

**Frontend (`artifacts/sankhya-suporte/src/pages/products.tsx`):**
- `useEffect` inicializa `loteStatus` a partir dos dados da API: botão já renderiza
  com cor e label corretos no primeiro carregamento.
- Verde = rastreio habilitado ("Desabilitar Rastreio de Lote").
- Vermelho = rastreio desabilitado ("Habilitar Rastreio de Lote").
- Notificações via `toast.success` / `toast.error` do **sonner**.

---

### Detalhes enriquecidos na tela de Liberações

**Motivação:** o liberador precisava ver impostos, descrições e nomes (não só
códigos) na hora de aprovar uma liberação.

**Backend (`releases.ts`):**
- Helper `safeLoadMap` tolerante a tabela inexistente (`PGRST205`).
- 7 carregadores paralelos via `Promise.all`: parceiro, vendedor, empresa, operação,
  natureza, produto, tributação.
- Query do `tgfcab`: 15 → 40+ colunas (todos os valores fiscais).
- Query do `tgfite`: inclui `codtrib`, bases/alíquotas de ICMS, IPI, ICMS-ST, CST, CSOSN.

**Frontend (`releases.tsx`):**
- Tipos `NoteHeader` e `NoteItem` expandidos.
- Helpers `entityLabel()` e `fmtPerc()`.
- Modal ampliado para `max-w-4xl` com seção de impostos (16 campos) e tabela de
  itens com 6 colunas fiscais.

---

### Schema do Supabase — Correções de PK e tipos

- `ALTER TABLE tgfcab ADD CONSTRAINT tgfcab_pkey PRIMARY KEY (nunota)`
- `ALTER TABLE tgfite ADD CONSTRAINT tgfite_pkey PRIMARY KEY (nunota, sequencia)`
- Colunas monetárias: `bigint` → `numeric(15,2)`
- Colunas de data: `text` → `timestamp`

---

### Tabela `sankhya_users` — Mapeamento codusu → nome

Tabela criada para resolver `codususolicit`/`codusulib`/`codusu`/`codusuinc` em
nomes legíveis, sem precisar replicar a `tsiusu` inteira do Sankhya.

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
