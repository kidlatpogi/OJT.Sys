-- ============================================================================
-- Calendar & Daily Activity Memories Migration
-- Bucket: 'calendar-images'
-- Table:  'public.calendar_entries'
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE STORAGE BUCKET
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'calendar-images',
  'calendar-images',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. STORAGE ROW LEVEL SECURITY POLICIES (storage.objects)
-- ----------------------------------------------------------------------------
-- Allow public read access to calendar images
drop policy if exists "Public can view calendar images" on storage.objects;
create policy "Public can view calendar images"
  on storage.objects for select
  using (bucket_id = 'calendar-images');

-- Allow authenticated users to upload only into their own folder (userId/...)
drop policy if exists "Authenticated users can upload own calendar images" on storage.objects;
create policy "Authenticated users can upload own calendar images"
  on storage.objects for insert
  with check (
    bucket_id = 'calendar-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update/overwrite own images
drop policy if exists "Authenticated users can update own calendar images" on storage.objects;
create policy "Authenticated users can update own calendar images"
  on storage.objects for update
  using (
    bucket_id = 'calendar-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'calendar-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete own images
drop policy if exists "Authenticated users can delete own calendar images" on storage.objects;
create policy "Authenticated users can delete own calendar images"
  on storage.objects for delete
  using (
    bucket_id = 'calendar-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 3. CREATE CALENDAR ENTRIES TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  image_url text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- Index for fast user month range queries
create index if not exists idx_calendar_entries_user_date
  on public.calendar_entries (user_id, date desc);

-- Automatic updated_at trigger (public.handle_updated_at function exists in schema.sql)
drop trigger if exists set_calendar_entries_updated_at on public.calendar_entries;
create trigger set_calendar_entries_updated_at
  before update on public.calendar_entries
  for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 4. TABLE ROW LEVEL SECURITY POLICIES (public.calendar_entries)
-- ----------------------------------------------------------------------------
alter table public.calendar_entries enable row level security;

drop policy if exists "Users can view own calendar entries" on public.calendar_entries;
create policy "Users can view own calendar entries"
  on public.calendar_entries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own calendar entries" on public.calendar_entries;
create policy "Users can insert own calendar entries"
  on public.calendar_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own calendar entries" on public.calendar_entries;
create policy "Users can update own calendar entries"
  on public.calendar_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own calendar entries" on public.calendar_entries;
create policy "Users can delete own calendar entries"
  on public.calendar_entries for delete
  using (auth.uid() = user_id);
