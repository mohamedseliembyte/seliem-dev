-- =============================================================================
-- 0006_lead_read_state.sql  —  Unread tracking for the admin inbox
-- =============================================================================
--
-- ⚠️  REVIEW BEFORE RUNNING. DO NOT APPLY AUTOMATICALLY. ⚠️
--
-- Adds leads.read_at. NULL = the admin has never opened this lead → shows as
-- unread. Opening a lead sets read_at = now(). A lead is also re-flagged unread
-- (in the API layer) when a visitor chat message arrives newer than read_at, and
-- saveLead resets read_at to NULL when a follow-up inquiry merges into an
-- existing lead. Idempotent.
--
-- Tip: to start with a clean (all-read) inbox instead of a wall of unread on
-- first deploy, run once after applying:
--   update public.leads set read_at = now() where read_at is null;
--
-- HOW TO RUN (after review):
--   Supabase SQL editor → paste & run, OR  supabase db push  (CLI). Test first.
-- =============================================================================

alter table public.leads
  add column if not exists read_at timestamptz;

create index if not exists idx_leads_read_at on public.leads (read_at);

-- Speeds up the per-lead "newest visitor message" lookup the admin GET does.
create index if not exists idx_messages_convo_role_created
  on public.messages (conversation_id, role, created_at);
