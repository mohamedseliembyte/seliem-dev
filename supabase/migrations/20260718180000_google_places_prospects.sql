alter table public.prospect_leads alter column sheet_row drop not null;
alter table public.prospect_leads add column if not exists source text not null default 'google_sheet';
alter table public.prospect_leads add column if not exists google_place_id text;
alter table public.prospect_leads add column if not exists places_updated_at timestamptz;

create unique index if not exists prospect_leads_google_place_id_unique
  on public.prospect_leads (google_place_id) where google_place_id is not null;

alter table public.prospect_leads enable row level security;
revoke all on table public.prospect_leads from anon, authenticated;
