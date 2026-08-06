-- Project suspension: a kill switch for non-payment.
--
-- Deliberately advisory rather than destructive. Pausing records the decision,
-- flags it to the client in their account, and lets a delivered site check its
-- own status — it never deletes anything, so resuming is instant once they pay.

alter table public.leads
  add column if not exists project_status text not null default 'active',
  add column if not exists paused_at timestamptz,
  add column if not exists paused_reason text,
  -- Opaque per-project key so a delivered site can ask "am I still active?"
  -- without exposing the lead id or needing admin auth.
  add column if not exists project_key uuid default gen_random_uuid();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_project_status_check') then
    alter table public.leads
      add constraint leads_project_status_check
      check (project_status in ('active', 'paused'));
  end if;
end $$;

create unique index if not exists leads_project_key_idx on public.leads (project_key) where project_key is not null;
create index if not exists leads_project_status_idx on public.leads (project_status) where project_status <> 'active';
