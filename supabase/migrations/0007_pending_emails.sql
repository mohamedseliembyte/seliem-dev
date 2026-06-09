-- =============================================================================
-- 0007_pending_emails.sql  —  Confirmation-gated AI-drafted client emails
-- =============================================================================
--
-- ⚠️  REVIEW BEFORE RUNNING. DO NOT APPLY AUTOMATICALLY. ⚠️
--
-- The admin AI assistant can DRAFT an email to an existing client, but nothing
-- is sent until the admin explicitly approves (Telegram inline button or the
-- web confirm card). A draft is one row here; approval flips it to 'sent' and
-- fires Resend. The recipient is always re-read from the linked lead at send
-- time, so the AI can never address mail to an arbitrary/free-text address.
--
-- Security model (see also src/lib/notify-client.ts sendPendingEmail):
--   • Only a human in a trusted channel (Telegram chat locked to TELEGRAM_CHAT_ID,
--     or a JWT + ADMIN_EMAIL web request) can flip a draft to 'sent'.
--   • Single-use atomic claim prevents replay / double-send.
--   • Drafts expire after 30 minutes.
--   • RLS on, no anon/authenticated policies — only the server-side service-role
--     client (which bypasses RLS) ever touches this table.
--
-- HOW TO RUN (after review):
--   Supabase SQL editor → paste & run, OR  supabase db push  (CLI). Test first.
-- =============================================================================

create table if not exists public.pending_emails (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.leads(id) on delete set null,
  to_email      text not null,
  to_name       text,
  subject       text not null,
  body          text not null,
  channel       text not null default 'telegram',
  requested_by  text,
  status        text not null default 'pending'
                  check (status in ('pending', 'sent', 'cancelled', 'expired', 'failed')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '30 minutes'),
  sent_at       timestamptz
);

create index if not exists idx_pending_emails_status on public.pending_emails (status, expires_at);
create index if not exists idx_pending_emails_lead on public.pending_emails (lead_id, sent_at);

alter table public.pending_emails enable row level security;
-- No anon/authenticated policies: server-only (service-role bypasses RLS).
