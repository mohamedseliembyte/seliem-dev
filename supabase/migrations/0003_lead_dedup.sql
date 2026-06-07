-- =============================================================================
-- 0003_lead_dedup.sql  —  Lead deduplication flag
-- =============================================================================
--
-- ⚠️  REVIEW BEFORE RUNNING. DO NOT APPLY AUTOMATICALLY. ⚠️
--
-- Adds duplicate_count to leads. When a new inquiry arrives for an email that
-- already exists, the app merges it into the existing lead (appending the new
-- message and backfilling any missing details) instead of creating a duplicate,
-- and increments duplicate_count. The admin UI shows a "possible duplicate"
-- badge when duplicate_count > 0.
--
-- HOW TO RUN (after review):
--   Supabase SQL editor → paste & run, OR  supabase db push  (CLI). Test first.
-- =============================================================================

alter table public.leads
  add column if not exists duplicate_count integer not null default 0;
