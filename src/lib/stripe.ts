import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Server-only Stripe client ───────────────────────────────────────────────
// STRIPE_SECRET_KEY should be a *restricted* key (rk_live_… / rk_test_…) with
// only the permissions listed in README → "Billing (Stripe)". Never import this
// into a client component.
//
// The API version is the one pinned by the installed SDK, so types and
// payloads always agree. Upgrade the two together.

let cached: Stripe | null = null

export function getStripe(): Stripe | null {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  cached = new Stripe(key, { appInfo: { name: 'seliem.dev' } })
  return cached
}

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** Public origin for Checkout return URLs. Prefers an explicit env var. */
export function siteUrl(req?: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (req) return req.nextUrl.origin
  return 'https://seliem.dev'
}

/** Dollars (numeric from Postgres) → integer cents, rejecting garbage. */
export function toCents(amount: unknown): number | null {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

// Tags every Checkout Session so flows can be compared in the Dashboard.
// The 8-letter suffix is fixed so the label stays stable across deploys.
export const INTEGRATION_IDENTIFIER = {
  invoice: 'seliem-invoice-qpvhtmkd',
  payment: 'seliem-payment-rwzcnfbe',
  carePlan: 'seliem-careplan-jxlsguoa',
} as const

// ── Care-plan catalogue ─────────────────────────────────────────────────────
// Prices live in Stripe (created by scripts/stripe-setup.mjs) and are found by
// lookup key, so changing a price never needs a deploy. Keep these keys in
// sync with that script and the public pricing in components/sections/Pricing.
export const CARE_PLANS = ['basic', 'pro', 'ultra'] as const
export type CarePlan = (typeof CARE_PLANS)[number]
export type CareInterval = 'month' | 'year'

export function carePlanLookupKey(plan: CarePlan, interval: CareInterval) {
  return `care_${plan}_${interval}`
}

export function isCarePlan(v: unknown): v is CarePlan {
  return typeof v === 'string' && (CARE_PLANS as readonly string[]).includes(v)
}

// ── Customers ───────────────────────────────────────────────────────────────
// One Stripe Customer per lead, stored on leads.stripe_customer_id. Created on
// first checkout so every payment, subscription and portal session for that
// client shares one billing history.
export async function getOrCreateCustomer(
  stripe: Stripe,
  supabase: SupabaseClient,
  lead: { id: string; name: string | null; email: string | null; business_name?: string | null; stripe_customer_id?: string | null },
): Promise<string> {
  if (lead.stripe_customer_id) return lead.stripe_customer_id
  const customer = await stripe.customers.create(
    {
      email: lead.email ?? undefined,
      name: lead.business_name || lead.name || undefined,
      metadata: { lead_id: lead.id },
    },
    { idempotencyKey: `customer-for-lead-${lead.id}` },
  )
  const { error } = await supabase.from('leads').update({ stripe_customer_id: customer.id }).eq('id', lead.id)
  if (error) console.error('[stripe] could not store customer id:', error.message)
  return customer.id
}
