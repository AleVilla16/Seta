-- Da incollare in Supabase › SQL Editor › New query, poi "Run".
create table if not exists public.app_state (
  id          text primary key,
  data        jsonb not null,
  rev         bigint not null default 1,
  updated_at  timestamptz not null default now()
);

-- Blocca l'accesso diretto dal browser: i dati passano solo
-- dalla funzione /api/state su Vercel, che usa la chiave service_role.
alter table public.app_state enable row level security;
