-- =============================================================================
-- 0002_agreement_expiry.sql  —  Agreement expiry support
-- =============================================================================
--
-- ⚠️  REVIEW BEFORE RUNNING. DO NOT APPLY AUTOMATICALLY. ⚠️
--
-- Adds expiry tracking to the agreements table so unsigned agreements can be
-- reminded (day 25) and auto-expired (day 30) by the agreement-reminders cron
-- (src/app/api/cron/agreement-reminders/route.ts).
--
-- Columns added:
--   expires_at          — when the agreement lapses if still unsigned.
--                         Defaults to 30 days after creation for new rows.
--   expiry_reminded_at  — set when the day-25 reminder email is sent, so the
--                         cron never emails the same client twice.
--
-- The cron treats status = 'expired' as a terminal state for unsigned, lapsed
-- agreements (alongside the existing 'sent' / 'accepted' values).
--
-- HOW TO RUN (after review):
--   Supabase SQL editor → paste & run, OR  supabase db push  (CLI).
--   Test on staging / a backup first.
-- =============================================================================

alter table public.agreements
  add column if not exists expires_at         timestamptz,
  add column if not exists expiry_reminded_at timestamptz;

-- New rows default to expiring 30 days out. (Postgres DEFAULT can't reference
-- another column, so we approximate created_at + 30d with now() + 30d at insert.)
alter table public.agreements
  alter column expires_at set default (now() + interval '30 days');

-- Backfill existing unsigned agreements: 30 days from when they were created.
update public.agreements
  set expires_at = created_at + interval '30 days'
  where expires_at is null;

create index if not exists idx_agreements_expires_at on public.agreements (expires_at);
