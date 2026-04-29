-- =====================================================================
-- Tabelas auxiliares da Sankhya espelhadas no Supabase.
--
-- Por que: a aplicacao mostra ao lado de cada liberacao (tsilib) e de
-- cada nota (tgfcab) campos amigaveis - nome do usuario solicitante,
-- descricao do tipo de operacao (TOP), descricao da natureza, etc.
-- O backend (artifacts/api-server/src/routes/releases.ts) ja faz o
-- "join" via supabase-js, mas cada uma dessas tabelas precisa existir
-- no Supabase com pelo menos os codigos usados nos dados.
--
-- Como rodar (uma unica vez):
--   1) Abra o painel do Supabase -> SQL Editor
--   2) Cole este arquivo inteiro e execute
--   3) Preencha as colunas de descricao via Table Editor / SQL Editor
--      (ou substitua o seed por um INSERT do dump completo da Sankhya)
--
-- Os identificadores ficam em LOWERCASE (a Sankhya usa UPPERCASE, mas
-- no Supabase as outras tabelas (tgfcab, tgfite, tsilib, tgfpar, tgfpro,
-- tgfven, tgfemp) tambem foram criadas em lowercase). Manter o padrao
-- evita ter que lembrar de aspas duplas em cada query.
-- =====================================================================

-- ---------------------------------------------------------------------
-- tsiusu - Usuarios da Sankhya
-- Substitui o uso de "sankhya_users" do migration 001. O backend foi
-- atualizado para preferir tsiusu.nomeusu e cair para sankhya_users.nome
-- so quando a linha nao existir aqui.
-- ---------------------------------------------------------------------
create table if not exists public.tsiusu (
  codusu   smallint primary key,
  nomeusu  varchar  not null default '',
  email    varchar
);

-- Seed com os codigos de usuario que ja aparecem em tsilib/tgfcab hoje.
-- Preencha nomeusu/email depois.
insert into public.tsiusu (codusu, nomeusu) values
  (6,  ''),
  (17, ''),
  (40, ''),
  (55, ''),
  (69, ''),
  (70, ''),
  (79, ''),
  (98, '')
on conflict (codusu) do nothing;

-- ---------------------------------------------------------------------
-- tgftop - Tipos de operacao (TOP)
-- Usado para mostrar a descricao da operacao da nota (codtipoper).
-- ---------------------------------------------------------------------
create table if not exists public.tgftop (
  codtipoper smallint primary key,
  descroper  varchar  not null default '',
  tipmov     char,
  ativo      char     default 'S'
);

-- ---------------------------------------------------------------------
-- tgfnat - Naturezas
-- Usado para mostrar a descricao da natureza da nota (codnat).
-- ---------------------------------------------------------------------
create table if not exists public.tgfnat (
  codnat      integer primary key,
  descrnat    varchar not null default '',
  ativo       char    default 'S',
  receitadesp char
);
