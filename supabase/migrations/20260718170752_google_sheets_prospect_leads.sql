create extension if not exists pg_trgm with schema extensions;

create table if not exists public.google_integrations (
  id text primary key default 'google_sheets',
  account_email text not null,
  refresh_token text not null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_integrations enable row level security;
revoke all on table public.google_integrations from anon, authenticated;

create table if not exists public.prospect_leads (
  id uuid primary key default gen_random_uuid(),
  source_sheet_id text not null,
  sheet_row integer not null,
  priority text,
  business text not null,
  niche text,
  city text,
  state text,
  phone text,
  address text,
  website text,
  maps_url text,
  sheet_status text,
  status text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_sheet_id, sheet_row)
);

alter table public.prospect_leads enable row level security;
revoke all on table public.prospect_leads from anon, authenticated;

create index if not exists prospect_leads_priority_idx on public.prospect_leads (priority);
create index if not exists prospect_leads_niche_idx on public.prospect_leads (niche);
create index if not exists prospect_leads_state_idx on public.prospect_leads (state);
create index if not exists prospect_leads_status_idx on public.prospect_leads (status);
create index if not exists prospect_leads_business_trgm_idx
  on public.prospect_leads using gin (business extensions.gin_trgm_ops);

create table if not exists public.google_sheet_syncs (
  id uuid primary key default gen_random_uuid(),
  source_sheet_id text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  row_count integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.google_sheet_syncs enable row level security;
revoke all on table public.google_sheet_syncs from anon, authenticated;

create table if not exists public.admin_rate_limits (
  actor_hash text not null,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (actor_hash, action, window_started_at)
);

alter table public.admin_rate_limits enable row level security;
revoke all on table public.admin_rate_limits from anon, authenticated;

create or replace function public.consume_admin_rate_limit(
  p_actor_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if length(p_actor_hash) < 16 or length(p_action) > 64
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.admin_rate_limits (actor_hash, action, window_started_at, request_count)
  values (p_actor_hash, p_action, v_window, 1)
  on conflict (actor_hash, action, window_started_at)
  do update set request_count = public.admin_rate_limits.request_count + 1
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_admin_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_admin_rate_limit(text, text, integer, integer) to service_role;
