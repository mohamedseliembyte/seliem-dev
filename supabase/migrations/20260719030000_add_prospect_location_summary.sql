create index if not exists prospect_leads_state_city_idx
  on public.prospect_leads (state, city);

create or replace function public.prospect_location_summary(p_state text default null)
returns table (state text, city text, lead_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    upper(trim(p.state)) as state,
    case
      when p_state is null then null::text
      else coalesce(nullif(trim(p.city), ''), 'Unknown city')
    end as city,
    count(*)::bigint as lead_count
  from public.prospect_leads p
  where nullif(trim(p.state), '') is not null
    and (p_state is null or upper(trim(p.state)) = upper(trim(p_state)))
  group by 1, 2
  order by lead_count desc, state asc, city asc;
$$;

revoke execute on function public.prospect_location_summary(text)
  from public, anon, authenticated;
grant execute on function public.prospect_location_summary(text)
  to service_role;
