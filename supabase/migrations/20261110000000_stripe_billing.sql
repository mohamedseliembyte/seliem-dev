-- Stripe billing: card checkout for invoices and payment requests, plus
-- recurring care-plan subscriptions. PayPal links keep working alongside.
--
-- Run in the Supabase SQL editor (or `supabase db push`) BEFORE setting
-- STRIPE_SECRET_KEY in Vercel. Every statement is idempotent.

-- One Stripe Customer per client record.
alter table public.leads
  add column if not exists stripe_customer_id text;
create unique index if not exists leads_stripe_customer_idx
  on public.leads (stripe_customer_id) where stripe_customer_id is not null;

-- The Checkout Session / PaymentIntent that settled each payable row. The
-- webhook resolves events back to a row through these IDs.
alter table public.invoices
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_via text;
alter table public.payments
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_via text;

create index if not exists invoices_stripe_session_idx on public.invoices (stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create index if not exists invoices_stripe_pi_idx on public.invoices (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index if not exists payments_stripe_session_idx on public.payments (stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create index if not exists payments_stripe_pi_idx on public.payments (stripe_payment_intent_id) where stripe_payment_intent_id is not null;

-- Care-plan subscriptions mirrored from Stripe. Stripe is the source of truth;
-- this table is kept in sync by the webhook so the admin and account pages can
-- read it without calling Stripe.
create table if not exists public.care_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  lead_id                uuid references public.leads(id) on delete set null,
  stripe_subscription_id text not null unique,
  stripe_customer_id     text not null,
  plan                   text,            -- basic | pro | ultra
  billing_interval       text,            -- month | year
  amount                 numeric(10,2),
  status                 text not null,   -- Stripe subscription status
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists care_subscriptions_lead_idx on public.care_subscriptions (lead_id);
alter table public.care_subscriptions enable row level security;
-- No anon/authenticated policies: server-only (service role bypasses RLS).

-- Webhook idempotency: Stripe retries deliveries, so each event id is
-- processed once.
create table if not exists public.stripe_events (
  id           text primary key,
  type         text not null,
  received_at  timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
