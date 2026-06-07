-- =============================================================================
-- 0001_enable_rls.sql  —  Enable Row Level Security (RLS)
-- =============================================================================
--
-- ⚠️  DO NOT RUN THIS BLINDLY IN PRODUCTION. REVIEW AND TEST FIRST. ⚠️
--
-- WHAT THIS DOES
--   Enables RLS on every business table and adds policies so that ONLY the
--   service-role key (used by the server-side admin Supabase client in
--   src/lib/supabase.ts) has access. The anon key and signed-in (authenticated)
--   users get NO direct table access by default.
--
-- WHY
--   Today these tables are reachable by anyone holding the anon key if RLS is
--   off. All app reads/writes already go through API routes that use the
--   SUPABASE_SECRET_KEY (service role), which BYPASSES RLS — so locking the
--   tables down should not break those server-side paths.
--
-- IMPORTANT — TEST BEFORE APPLYING
--   The service role bypasses RLS entirely, so the policies below are mostly a
--   safety net to keep the anon/authenticated roles out. Before applying:
--     1. Confirm NOTHING in the app reads these tables directly from the
--        browser using the anon key or a user session (i.e. all access is via
--        /api/* routes using getSupabaseAdmin()). The client account page and
--        chat widget call API routes, not the DB directly — verify this still
--        holds for any feature you have added.
--     2. If you DO add client-side reads of a user's own rows later, add
--        scoped "authenticated" policies (e.g. USING (auth.uid() = owner_id))
--        for just those rows — do not loosen the table-wide lockdown.
--
-- HOW TO RUN (after review)
--   Option A — Supabase SQL editor: paste this file and run.
--   Option B — Supabase CLI:        supabase db push   (with this file in
--                                    supabase/migrations/)
--   Always run against a staging project / backup first.
-- =============================================================================

-- Enable RLS on every business table. Once enabled, the absence of a permissive
-- policy means anon/authenticated are denied by default; service_role bypasses.
alter table if exists public.leads          enable row level security;
alter table if exists public.conversations  enable row level security;
alter table if exists public.messages       enable row level security;
alter table if exists public.payments       enable row level security;
alter table if exists public.agreements     enable row level security;
alter table if exists public.tasks          enable row level security;

-- Explicit "service role has full access" policies. These are belt-and-braces:
-- the service role already bypasses RLS, but declaring the policy documents the
-- intended access model and survives future role/grant changes.
do $$
declare
  t text;
begin
  foreach t in array array['leads','conversations','messages','payments','agreements','tasks']
  loop
    execute format('drop policy if exists %I on public.%I', 'service_role_full_access', t);
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      'service_role_full_access', t
    );
  end loop;
end $$;

-- Note: we intentionally create NO policies for the anon or authenticated roles.
-- That means those roles are fully denied direct table access. Add narrowly
-- scoped policies later if/when the client reads its own rows directly.
