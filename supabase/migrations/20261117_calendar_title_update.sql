-- Migration: Add title column to calendar_entries table
-- Requirement R2: Title and Activity Notes Automation

alter table public.calendar_entries
  add column if not exists title text not null default 'What did you work on?';
