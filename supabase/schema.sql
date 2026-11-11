-- ============================================================================
-- OJT Document Automator & Attendance System (SECA 003, 004, 005)
-- Supabase PostgreSQL Schema + Row Level Security (RLS)
-- Run this inside Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. PROFILES TABLE (User Onboarding & Internship Configuration)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  student_id text default '',
  program text not null default 'BSIT-MWA',
  company_name text not null default '',
  branch_department text default '',
  supervisor_name text not null default '',
  supervisor_position text default '',
  trainor_name text default '',
  start_date date,
  target_hours numeric not null default 500,
  daily_start_time time not null default '09:00:00',
  daily_end_time time not null default '18:00:00',
  lunch_break_minutes integer not null default 0,
  auto_time_out boolean not null default true,
  academic_term text not null default 'TERM 2 AY 2025 - 2026',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If upgrading an existing database, run:
alter table public.profiles add column if not exists auto_time_out boolean not null default true;

-- 2. ATTENDANCE LOGS TABLE (Daily Punch Clock + Tasks + AI Past-Tense Summary)
create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  time_in timestamptz,
  time_out timestamptz,
  hours_worked numeric not null default 0,
  tasks_selected jsonb not null default '[]'::jsonb,
  custom_tasks text not null default '',
  ai_summary text not null default '',
  ai_provider text default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- 3. WEEKLY SUMMARIES TABLE (SECA 004 & SECA 005 Rollups)
create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_number integer not null,
  start_date date not null,
  end_date date not null,
  consolidated_text text not null default '',
  total_weekly_hours numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_number, start_date)
);

-- Indexes for fast mobile queries
create index if not exists idx_attendance_logs_user_date on public.attendance_logs (user_id, date desc);
create index if not exists idx_weekly_summaries_user_dates on public.weekly_summaries (user_id, start_date desc);

-- Updated_at trigger helper
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists set_attendance_logs_updated_at on public.attendance_logs;
create trigger set_attendance_logs_updated_at
  before update on public.attendance_logs
  for each row execute function public.handle_updated_at();

drop trigger if exists set_weekly_summaries_updated_at on public.weekly_summaries;
create trigger set_weekly_summaries_updated_at
  before update on public.weekly_summaries
  for each row execute function public.handle_updated_at();

-- Auto-create profile row on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    student_id,
    program,
    company_name,
    branch_department,
    supervisor_name,
    supervisor_position,
    target_hours
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'student_id', ''),
    coalesce(new.raw_user_meta_data ->> 'program', 'BSIT-MWA'),
    coalesce(new.raw_user_meta_data ->> 'company_name', ''),
    coalesce(new.raw_user_meta_data ->> 'branch_department', ''),
    coalesce(new.raw_user_meta_data ->> 'supervisor_name', ''),
    coalesce(new.raw_user_meta_data ->> 'supervisor_position', ''),
    coalesce((new.raw_user_meta_data ->> 'target_hours')::numeric, 500)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.weekly_summaries enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Attendance logs policies
create policy "Users can view own attendance logs"
  on public.attendance_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own attendance logs"
  on public.attendance_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own attendance logs"
  on public.attendance_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own attendance logs"
  on public.attendance_logs for delete
  using (auth.uid() = user_id);

-- Weekly summaries policies
create policy "Users can view own weekly summaries"
  on public.weekly_summaries for select
  using (auth.uid() = user_id);

create policy "Users can insert own weekly summaries"
  on public.weekly_summaries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weekly summaries"
  on public.weekly_summaries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own weekly summaries"
  on public.weekly_summaries for delete
  using (auth.uid() = user_id);

