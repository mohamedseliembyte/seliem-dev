-- =============================================================================
-- 0005_human_takeover.sql  —  Explicit AI-pause flag for live chat
-- =============================================================================
--
-- ⚠️  REVIEW BEFORE RUNNING. DO NOT APPLY AUTOMATICALLY. ⚠️
--
-- Adds conversations.human_takeover. Previously the AI was considered "paused"
-- whenever ANY 'human' message existed in a conversation, which meant once you
-- replied the AI could never resume. This boolean is the single source of truth:
--   true  = a human has taken over; the AI (Sage) stays quiet.
--   false = the AI handles the conversation.
-- Admin buttons and Telegram inline buttons toggle this flag, so you can jump in
-- and later hand the conversation back to the AI.
--
-- HOW TO RUN (after review):
--   Supabase SQL editor → paste & run, OR  supabase db push  (CLI). Test first.
-- =============================================================================

alter table public.conversations
  add column if not exists human_takeover boolean not null default false;
