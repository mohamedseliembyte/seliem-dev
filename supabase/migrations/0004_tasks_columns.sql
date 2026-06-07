-- =============================================================================
-- 0004_tasks_columns.sql  —  Ensure the tasks table has the columns the admin
--                            task UI / API use.
-- =============================================================================
--
-- ⚠️  REVIEW BEFORE RUNNING. DO NOT APPLY AUTOMATICALLY. ⚠️
--
-- The tasks table already exists and feeds the CEO briefing (it reads status
-- and due_date). This migration is idempotent ("add column if not exists") and
-- only ensures the remaining columns the new /api/admin/tasks route relies on.
-- It does NOT drop or recreate the table.
--
--   title        — short task description (required by the UI)
--   status       — 'open' | 'done'  (briefing counts status='open')
--   due_date     — optional deadline
--   lead_id      — optional link to a lead
--   completed_at — set when a task is marked done
--   created_at   — creation timestamp
--
-- If your tasks table uses different column names, reconcile them before running.
--
-- HOW TO RUN (after review):
--   Supabase SQL editor → paste & run, OR  supabase db push  (CLI). Test first.
-- =============================================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid()
);

alter table public.tasks
  add column if not exists title        text,
  add column if not exists status       text not null default 'open',
  add column if not exists due_date      timestamptz,
  add column if not exists lead_id       uuid,
  add column if not exists completed_at  timestamptz,
  add column if not exists created_at    timestamptz not null default now();

create index if not exists idx_tasks_status   on public.tasks (status);
create index if not exists idx_tasks_lead_id  on public.tasks (lead_id);
