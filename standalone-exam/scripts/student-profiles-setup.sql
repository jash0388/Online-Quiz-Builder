-- ============================================================================
-- Sphoorthy Online Exam Portal — Student profile table setup
-- Run this ONCE in Supabase → SQL Editor for project cqjjbvccldipkqqtqzqc.
-- ============================================================================

create table if not exists public.student_profiles (
  uid          text primary key,            -- Firebase Auth UID
  email        text not null,
  name         text not null,
  roll_number  text not null,
  phone        text not null,
  father_name  text not null,
  father_phone text not null,
  college      text not null default 'Sphoorthy Engineering College',
  completed_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

-- Permissive policies (matches the rest of this client-only app's pattern).
-- For stronger security, move profile mutations behind a server that verifies
-- a Firebase ID token before using the Supabase service-role key.
drop policy if exists "profiles_anon_select" on public.student_profiles;
create policy "profiles_anon_select"
  on public.student_profiles for select to anon using (true);

drop policy if exists "profiles_anon_insert" on public.student_profiles;
create policy "profiles_anon_insert"
  on public.student_profiles for insert to anon with check (true);

drop policy if exists "profiles_anon_update" on public.student_profiles;
create policy "profiles_anon_update"
  on public.student_profiles for update to anon using (true) with check (true);

drop policy if exists "profiles_anon_delete" on public.student_profiles;
create policy "profiles_anon_delete"
  on public.student_profiles for delete to anon using (true);
