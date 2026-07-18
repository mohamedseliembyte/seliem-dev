alter table public.leads add column if not exists project_name text;
alter table public.leads enable row level security;
