-- Tabela de mapeamento "codigo do usuario Sankhya -> nome".
-- O Supabase do projeto nao tem a tabela TSIUSU da Sankhya espelhada,
-- entao usamos esta tabela para preencher os nomes que aparecem ao
-- lado de "codususolicit" / "codusu" nas telas de liberacoes e notas.
--
-- Como rodar (uma unica vez):
--   1) Abra o painel do Supabase -> SQL Editor
--   2) Cole este arquivo inteiro e execute
--
-- Depois, edite a coluna "nome" via SQL Editor ou via Table Editor para
-- preencher o nome real de cada usuario. Codigos novos que aparecerem em
-- novas liberacoes podem ser inseridos aqui depois.

create table if not exists public.sankhya_users (
  codusu integer primary key,
  nome text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Seed inicial com os codigos de usuario que ja aparecem em tsilib hoje.
-- O nome fica em branco para voce preencher depois.
insert into public.sankhya_users (codusu, nome) values
  (6,  ''),
  (17, ''),
  (40, ''),
  (55, ''),
  (69, ''),
  (79, ''),
  (98, '')
on conflict (codusu) do nothing;
