# Supabase Storage & Database Setup for Calendar Activity Tracker

This guide details the schema and storage configuration for the Calendar Activity Tracker feature in the OJT Tracking System.

## Overview
The Calendar feature allows trainees to log daily visual activities by uploading one primary photo per calendar date.
- **Storage Bucket**: `calendar-images` (Public bucket with 5MB upload limit, JPEG/PNG/WebP/HEIC support).
- **Database Table**: `public.calendar_entries` (Tracks `user_id`, `date`, `image_url`, `description`, and timestamps with unique constraint on `(user_id, date)`).
- **Security**: Row Level Security (RLS) is enabled on both the database table and the storage objects bucket so users can only insert, modify, or delete their own data and images.

---

## 1. Automated Migration
The migration file is located in `supabase/migrations/20261117_calendar_feature.sql`.

To apply using Supabase CLI:
```bash
supabase db push
# or
supabase migration up
```

Alternatively, run the SQL script below in the **Supabase Dashboard -> SQL Editor**.

---

## 2. SQL Migration Script

```sql
-- ============================================================================
-- Calendar & Daily Activity Memories Migration
-- Bucket: 'calendar-images'
-- Table:  'public.calendar_entries'
-- ============================================================================

-- 1. Create Storage Bucket for Calendar Images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'calendar-images',
  'calendar-images',
  true,
  5242880, -- 5 MB limit
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Storage Row Level Security Policies
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

-- 3. Create Calendar Entries Table
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

-- Automatic updated_at trigger
drop trigger if exists set_calendar_entries_updated_at on public.calendar_entries;
create trigger set_calendar_entries_updated_at
  before update on public.calendar_entries
  for each row execute function public.handle_updated_at();

-- 4. Calendar Entries Table Row Level Security Policies
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
```

---

## 3. Storage Directory Layout
Images uploaded through the application are stored under:
```text
calendar-images/
└── <user_id>/
    └── <YYYY-MM-DD>_<timestamp>.jpg
```
Example:
`https://sgbyrowbzczzlfkkghii.supabase.co/storage/v1/object/public/calendar-images/c2f1837d-4bcd-4209-9152-68626a0f4685/2026-09-03_1731845391000.jpg`

- Timestamp suffix prevents stale browser/CDN caching upon replacing a photo.
- Folder prefix `<user_id>` satisfies the RLS folder check `(storage.foldername(name))[1] = auth.uid()::text`.

---

## 4. Verification Queries
Run these queries in Supabase SQL editor to confirm setup:
```sql
-- Check storage bucket
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'calendar-images';

-- Check table columns
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'calendar_entries';

-- Check active RLS policies
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('calendar_entries', 'objects');
```
