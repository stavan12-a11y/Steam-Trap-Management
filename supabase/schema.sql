-- ---------------------------------------------------------------------------
-- Steam Trap Management — Supabase setup
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- ---------------------------------------------------------------------------

create table if not exists public.steam_trap_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.steam_trap_state enable row level security;

drop policy if exists "authenticated read" on public.steam_trap_state;
create policy "authenticated read"
  on public.steam_trap_state for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert" on public.steam_trap_state;
create policy "authenticated insert"
  on public.steam_trap_state for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update" on public.steam_trap_state;
create policy "authenticated update"
  on public.steam_trap_state for update
  to authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.steam_trap_state;
