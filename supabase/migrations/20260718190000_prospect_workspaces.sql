alter table public.prospect_leads add column if not exists notes text;
alter table public.prospect_leads add column if not exists pitch_script jsonb;
alter table public.prospect_leads add column if not exists pitch_generated_at timestamptz;
alter table public.prospect_leads enable row level security;
revoke all on table public.prospect_leads from anon, authenticated;
