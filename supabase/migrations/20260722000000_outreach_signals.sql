-- Outreach signals: preview-page view tracking + follow-up dates.
-- View counts are denormalized onto the lead so the admin list can sort/badge
-- without a join; follow_up_at powers the "due" queue.

alter table public.prospect_leads
  add column if not exists preview_views integer not null default 0,
  add column if not exists preview_last_viewed_at timestamptz,
  add column if not exists follow_up_at date;

create index if not exists prospect_leads_follow_up_idx on public.prospect_leads (follow_up_at) where follow_up_at is not null;
create index if not exists prospect_leads_preview_views_idx on public.prospect_leads (preview_last_viewed_at desc) where preview_views > 0;

-- Atomic increment for the public /api/track-view ping. security definer so the
-- server route can call it; execute is revoked from public roles.
create or replace function public.increment_preview_view(pid uuid)
returns void language sql security definer set search_path = public as $$
  update public.prospect_leads
    set preview_views = preview_views + 1, preview_last_viewed_at = now()
    where id = pid;
$$;

revoke all on function public.increment_preview_view(uuid) from anon, authenticated;
