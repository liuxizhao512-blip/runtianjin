-- Run Tianjin — Supabase schema
--
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query,
-- paste this whole file, then press Run. It is safe to run again.
--
-- Security model: every table has Row Level Security on, and every policy is
-- scoped to auth.uid(). A signed-in runner can only ever read and write their
-- own rows. The anon key in auth.js is public by design; these policies are
-- what actually protect the data.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  weekly_goal_km numeric(5, 1) not null default 20 check (weekly_goal_km >= 0 and weekly_goal_km <= 500),
  home_route text not null default 'haihe' check (home_route in ('haihe', 'nancui', 'shuishang', 'taida')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are self-readable" on public.profiles;
create policy "profiles are self-readable"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles are self-insertable" on public.profiles;
create policy "profiles are self-insertable"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles are self-updatable" on public.profiles;
create policy "profiles are self-updatable"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create the profile row automatically when someone signs up, so the app never
-- has to handle a missing row. display_name comes from the signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- runs
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  route text not null check (route in ('haihe', 'nancui', 'shuishang', 'taida')),
  distance_km numeric(5, 2) not null check (distance_km > 0 and distance_km <= 200),
  duration_min integer not null check (duration_min > 0 and duration_min <= 1440),
  ran_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists runs_user_ran_on_idx
  on public.runs (user_id, ran_on desc);

alter table public.runs enable row level security;

drop policy if exists "runs are self-readable" on public.runs;
create policy "runs are self-readable"
  on public.runs for select
  using (auth.uid() = user_id);

drop policy if exists "runs are self-insertable" on public.runs;
create policy "runs are self-insertable"
  on public.runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "runs are self-deletable" on public.runs;
create policy "runs are self-deletable"
  on public.runs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------- weekly totals
-- A view so the dashboard can ask for "my last 8 weeks" in one query instead of
-- pulling every run down and summing in the browser.
create or replace view public.weekly_totals
with (security_invoker = true) as
select
  user_id,
  date_trunc('week', ran_on)::date as week_start,
  count(*) as runs,
  sum(distance_km) as distance_km,
  sum(duration_min) as duration_min
from public.runs
group by user_id, date_trunc('week', ran_on);
