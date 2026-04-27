-- ============================================================================
-- Sphoorthy Online Exam Portal — Admin role table setup
-- Run this ONCE in Supabase → SQL Editor for project cqjjbvccldipkqqtqzqc.
-- ============================================================================

-- 1) Create the admins table (idempotent — safe to re-run)
create table if not exists public.admins (
  email       text primary key,
  is_super    boolean not null default false,
  added_by    text,
  created_at  timestamptz not null default now()
);

-- 1b) Self-heal older versions of the table that may be missing columns
alter table public.admins
  add column if not exists is_super   boolean not null default false,
  add column if not exists added_by   text,
  add column if not exists created_at timestamptz not null default now();

-- 2) Enable Row Level Security so the table is locked down by policy
alter table public.admins enable row level security;

-- 3) Allow the anon role (used by the web app) to read, insert, update,
--    and delete admin rows. Authorization on WHO can mutate is enforced
--    inside the app: only signed-in super-admins see the management UI.
--
--    NOTE: For stronger security move admin mutations behind a server
--    that verifies a Firebase ID token + super-admin status before using
--    the Supabase service-role key. The current setup matches the rest
--    of this client-only app.
drop policy if exists "admins_anon_select" on public.admins;
create policy "admins_anon_select"
  on public.admins for select
  to anon
  using (true);

drop policy if exists "admins_anon_insert" on public.admins;
create policy "admins_anon_insert"
  on public.admins for insert
  to anon
  with check (true);

drop policy if exists "admins_anon_update" on public.admins;
create policy "admins_anon_update"
  on public.admins for update
  to anon
  using (true)
  with check (true);

drop policy if exists "admins_anon_delete" on public.admins;
create policy "admins_anon_delete"
  on public.admins for delete
  to anon
  using (true);

-- 4) Seed the first super-admin (Dr. Bala Ramallam)
insert into public.admins (email, is_super, added_by)
values ('drbalaramallam@sphoorthyengg.ac.in', true, 'system')
on conflict (email) do update
  set is_super = excluded.is_super;
