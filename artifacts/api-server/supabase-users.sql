-- Run this once in Supabase Dashboard > SQL Editor
-- It creates the users table for the Sankhya Support app login.

create table if not exists public.app_users (
  id           bigserial primary key,
  email        text not null unique,
  name         text not null,
  password_hash text not null,
  role         text not null default 'human'
                check (role in ('SA','only_read','robot','human')),
  created_at   timestamptz not null default now()
);

-- Lock the table down: only the service_role key (used by the API server)
-- can read or write. The browser anon key has no access.
alter table public.app_users enable row level security;
revoke all on public.app_users from anon, authenticated;
