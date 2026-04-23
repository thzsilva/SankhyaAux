# Green Core System

Sistema web para operacao interna com foco em **consulta de dados**.  
Esta versao foi simplificada para manter apenas o essencial, com estrutura limpa e pronta para evolucao.

## Visao Geral

O projeto entrega uma interface moderna e responsiva para:

- visualizar indicadores no Dashboard;
- consultar Produtos (somente leitura);
- consultar Clientes (somente leitura).

Nao existem operacoes de criacao, edicao ou exclusao para Produtos e Clientes nesta versao.

## Objetivo do Projeto

- reduzir complexidade tecnica;
- eliminar codigo morto e duplicado;
- facilitar onboarding de novos desenvolvedores;
- padronizar organizacao e nomenclaturas;
- manter base escalavel para novos modulos.

## Tecnologias Utilizadas

### Frontend

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 4
- TanStack React Query
- Wouter (roteamento)
- Sonner (notificacoes)
- Lucide React (icones)

### Backend

- Node.js + Express
- Drizzle ORM
- PostgreSQL
- Zod (contratos e validacoes)

### Integrações

- Supabase (variaveis e estrutura preparadas para uso)

## Estrutura do Projeto

```text
Green-Core-System/
  artifacts/
    api-server/          # API REST
      src/routes/        # Endpoints por modulo
    sankhya-suporte/     # Frontend principal
      src/
        pages/           # Dashboard, Produtos, Clientes, Not Found
        App.tsx          # Layout e roteamento principal
        main.tsx         # Bootstrap da aplicacao
```

Arquitetura adotada:

- **UI simples e componentizacao objetiva**: paginas autoexplicativas;
- **acesso a dados centralizado por hooks gerados do client da API**;
- **rotas enxutas** no backend com foco em leitura para Produtos e Clientes.

## Instalacao

### 1) Clonar o projeto

```bash
git clone <url-do-repositorio>
cd Green-Core-System/Green-Core-System
```

### 2) Instalar dependencias

```bash
npm install
```

### 3) Configurar variaveis de ambiente

Crie/ajuste os `.env` necessarios:

- raiz do monorepo (`.env`) para API e banco;
- frontend em `artifacts/sankhya-suporte/.env`.

Exemplo frontend:

```env
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave_anon>
VITE_SUPABASE_PUBLISHABLE_KEY=<chave_publica>
```

### 4) Rodar localmente

Na raiz do monorepo:

```bash
npm run dev
```

Esse comando sobe API e frontend em paralelo.

## Banco de Dados

## Estrutura das tabelas (resumo)

- `clients`
- `products`
- `releases`
- `tickets`
- `activity_logs`

## Como conectar no Supabase

1. Crie um projeto no Supabase.
2. Obtenha URL e chaves publicas.
3. Configure as variaveis no `.env` do frontend.
4. Ajuste credenciais de banco/API no backend conforme ambiente.

## Rodar migrations

Use os comandos do pacote de banco do workspace (quando aplicavel ao seu ambiente):

```bash
npm run --workspace @workspace/db push
```

Para cenarios de migration versionada, siga o fluxo adotado no pacote `@workspace/db`.

## Funcionalidades

## Dashboard

- indicadores principais do sistema;
- navegacao rapida para os modulos de consulta.

## Produtos (somente consulta)

- listagem paginada;
- busca por codigo, nome e referencia;
- filtros simples por categoria;
- visualizacao de detalhes;
- sem criar/editar/excluir.

## Clientes (somente consulta)

- listagem paginada;
- busca por codigo, nome e CPF/CNPJ;
- filtro simples por inicial do nome;
- visualizacao de detalhes;
- sem criar/editar/excluir.

## Parte Tecnica

## Fluxo de autenticacao

Nesta versao simplificada, nao ha fluxo de autenticacao ativo no frontend.  
A estrutura pode receber autenticacao (JWT/cookies/Supabase Auth) sem refatoracao ampla.

## Consumo de dados

- frontend consome endpoints REST por hooks gerados em `@workspace/api-client-react`;
- cache e estado assíncrono tratados via React Query;
- loading e erros exibidos em cada modulo.

## Componentizacao

- paginas com responsabilidades claras;
- layout unico compartilhado em `App.tsx`;
- menor acoplamento com bibliotecas UI pesadas.

## Estado global

- React Query para estado servidor;
- estado local com `useState` para filtros/paginacao/detalhes.

## Rotas

Frontend:

- `/` Dashboard
- `/produtos`
- `/clientes`

Backend (consulta para modulos principais):

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/clients`
- `GET /api/clients/:id`

## Seguranca

- validacoes de entrada no backend com Zod;
- resposta padronizada para erros;
- recomendacao de adicionar autenticacao e controle de permissao por perfil.

## Deploy

Fluxo recomendado:

1. Build dos workspaces:

```bash
npm run build
```

2. Publicar API (container, VPS, serverless ou plataforma PaaS).
3. Publicar frontend (Vercel, Netlify, Nginx, etc.).
4. Configurar variaveis de ambiente em ambiente de producao.

## Manutencao Futura

Para adicionar novas funcionalidades sem baguncar o projeto:

1. criar novo modulo com rota e pagina dedicadas;
2. manter separacao entre regra de negocio (API) e apresentacao (frontend);
3. reaproveitar padrao de listagem/filtros/paginacao;
4. evitar adicionar bibliotecas sem necessidade real;
5. incluir testes e validacoes a cada novo endpoint.

## Resultado da Simplificacao

Esta versao entrega:

- base mais leve e de facil entendimento;
- modulos de Produtos e Clientes 100% leitura;
- menos dependencias e menos codigo legado;
- estrutura pronta para crescer com previsibilidade.
