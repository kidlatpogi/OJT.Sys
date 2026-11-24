-- ============================================================================
-- Multiple Internship Programs Management & Customizable Work Checklists
-- Tables: public.internships
-- Columns added:
--   - profiles.work_checklist (jsonb)
--   - profiles.active_internship_id (uuid references internships)
--   - attendance_logs.internship_id (uuid references internships)
--   - calendar_entries.internship_id (uuid references internships)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD WORK_CHECKLIST COLUMN TO PROFILES
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists work_checklist jsonb not null default '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- 2. CREATE INTERNSHIPS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.internships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Internship 1',
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
  document_checklist jsonb not null default '[]'::jsonb,
  academic_term text not null default 'TERM 2 AY 2025 - 2026',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_internships_user_created
  on public.internships (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 3. INTERNSHIPS ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.internships enable row level security;

drop policy if exists "Users can view own internships" on public.internships;
create policy "Users can view own internships"
  on public.internships for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own internships" on public.internships;
create policy "Users can insert own internships"
  on public.internships for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own internships" on public.internships;
create policy "Users can update own internships"
  on public.internships for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own internships" on public.internships;
create policy "Users can delete own internships"
  on public.internships for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. LINK PROFILES, ATTENDANCE_LOGS, AND CALENDAR_ENTRIES TO INTERNSHIPS
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists active_internship_id uuid references public.internships (id) on delete set null;

alter table public.attendance_logs
  add column if not exists internship_id uuid references public.internships (id) on delete cascade;

create index if not exists idx_attendance_logs_internship
  on public.attendance_logs (internship_id);

alter table public.calendar_entries
  add column if not exists internship_id uuid references public.internships (id) on delete cascade;

create index if not exists idx_calendar_entries_internship
  on public.calendar_entries (internship_id);

-- ----------------------------------------------------------------------------
-- 5. DATA BACKFILL: MIGRATE EXISTING PROFILES TO INITIAL 'INTERNSHIP 1'
-- ----------------------------------------------------------------------------
insert into public.internships (
  user_id,
  title,
  company_name,
  branch_department,
  supervisor_name,
  supervisor_position,
  trainor_name,
  start_date,
  target_hours,
  daily_start_time,
  daily_end_time,
  lunch_break_minutes,
  auto_time_out,
  document_checklist,
  academic_term,
  status,
  created_at
)
select
  p.id,
  case 
    when p.company_name <> '' and p.company_name is not null and p.company_name not in ('N/A', 'NA')
    then 'Internship 1 (' || p.company_name || ')'
    else 'Internship 1'
  end,
  coalesce(p.company_name, ''),
  coalesce(p.branch_department, ''),
  coalesce(p.supervisor_name, ''),
  coalesce(p.supervisor_position, ''),
  coalesce(p.trainor_name, ''),
  p.start_date,
  coalesce(p.target_hours, 500),
  coalesce(p.daily_start_time, '09:00:00'),
  coalesce(p.daily_end_time, '18:00:00'),
  coalesce(p.lunch_break_minutes, 0),
  true,
  coalesce(p.document_checklist, '[]'::jsonb),
  coalesce(p.academic_term, 'TERM 2 AY 2025 - 2026'),
  'active',
  coalesce(p.created_at, now())
from public.profiles p
where not exists (
  select 1 from public.internships i where i.user_id = p.id
);

-- Set active_internship_id for profiles that don't have one
update public.profiles p
set active_internship_id = (
  select i.id from public.internships i
  where i.user_id = p.id
  order by i.created_at asc
  limit 1
)
where p.active_internship_id is null;

-- Link existing attendance logs to the user's active internship
update public.attendance_logs a
set internship_id = (
  select p.active_internship_id from public.profiles p
  where p.id = a.user_id
)
where a.internship_id is null;

-- Link existing calendar entries to the user's active internship
update public.calendar_entries c
set internship_id = (
  select p.active_internship_id from public.profiles p
  where p.id = c.user_id
)
where c.internship_id is null;
