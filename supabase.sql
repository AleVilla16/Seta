-- Da eseguire una volta in Supabase > SQL Editor
create table if not exists turni_state (
  id text primary key,
  data jsonb not null,
  rev text not null,
  updated_at timestamptz not null default now()
);
-- Nessuna policy: solo il server (chiave service_role) può leggere e scrivere.
alter table turni_state enable row level security;
