#!/usr/bin/env node
// One-time (and safe to re-run) Stripe setup for seliem.dev.
//
// Creates, or finds if they already exist:
//   1. A Product for each care plan (Basic, Pro, Ultra), each with a monthly
//      and an annual Price carrying the lookup key the app uses
//      (care_<plan>_<month|year>).
//   2. A Customer Portal configuration (update card, switch plan, cancel at
//      period end, invoice history).
//   3. The webhook endpoint, subscribed to exactly the events the app handles.
//
// Usage (use a sandbox key first, then repeat with the live key):
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs --webhook-url https://seliem.dev/api/stripe/webhook
//
// This script needs write access to Products, Prices, Webhook endpoints and
// Billing portal configuration, so run it with a secret key from your own
// machine. The app itself should run on a restricted key (see README).

import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Set STRIPE_SECRET_KEY first.')
  process.exit(1)
}
const argUrl = process.argv.indexOf('--webhook-url')
const webhookUrl = argUrl > -1 ? process.argv[argUrl + 1] : null

const stripe = new Stripe(key)
const mode = key.includes('_live_') ? 'LIVE' : 'TEST'

// Keep in sync with src/components/sections/Pricing.tsx (displayed prices)
// and CARE_PLANS in src/lib/stripe.ts (keys). Amounts in cents.
const PLANS = [
  { plan: 'basic', name: 'Care Plan — Basic', description: 'Monitoring, routine updates, up to 30 minutes of small edits, monthly checkup, email support.', month: 3000, year: 30000 },
  { plan: 'pro', name: 'Care Plan — Pro', description: 'Everything in Basic, up to 2 hours of edits, analytics summary, lead-form and booking checks, priority support.', month: 7900, year: 79000 },
  { plan: 'ultra', name: 'Care Plan — Ultra', description: 'Everything in Pro, up to 5 hours of edits, monthly conversion improvement, automation health checks.', month: 14900, year: 149000 },
]

const EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
  'radar.early_fraud_warning.created',
]

async function findProduct(plan) {
  for await (const p of stripe.products.list({ active: true, limit: 100 })) {
    if (p.metadata?.seliem_care_plan === plan) return p
  }
  return null
}

async function ensurePrice(product, plan, interval, amount) {
  const lookup_key = `care_${plan}_${interval}`
  const existing = (await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 })).data[0]
  if (existing && existing.unit_amount === amount && existing.recurring?.interval === interval) {
    console.log(`  ✓ ${lookup_key} $${amount / 100}/${interval} (${existing.id})`)
    return existing
  }
  // Prices are immutable. A changed amount gets a new price that takes over
  // the lookup key; existing subscribers stay on their old price.
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: amount,
    recurring: { interval },
    lookup_key,
    transfer_lookup_key: Boolean(existing),
    tax_behavior: 'exclusive',
  })
  console.log(`  + ${lookup_key} $${amount / 100}/${interval} (${price.id})${existing ? ` replaces ${existing.id}` : ''}`)
  return price
}

console.log(`\nStripe setup — ${mode} mode\n`)

console.log('Care plans')
const portalProducts = []
for (const p of PLANS) {
  let product = await findProduct(p.plan)
  if (!product) {
    product = await stripe.products.create({
      name: p.name,
      description: p.description,
      metadata: { seliem_care_plan: p.plan },
    })
    console.log(`+ ${p.name} (${product.id})`)
  } else {
    console.log(`✓ ${p.name} (${product.id})`)
  }
  const m = await ensurePrice(product, p.plan, 'month', p.month)
  const y = await ensurePrice(product, p.plan, 'year', p.year)
  portalProducts.push({ product: product.id, prices: [m.id, y.id] })
}

console.log('\nCustomer Portal')
const portalSettings = {
  business_profile: {
    headline: 'Seliem.dev — manage your care plan',
    privacy_policy_url: 'https://seliem.dev/privacy',
    terms_of_service_url: 'https://seliem.dev/terms',
  },
  features: {
    customer_update: { enabled: true, allowed_updates: ['email', 'name', 'address', 'phone'] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: 'at_period_end', cancellation_reason: { enabled: true, options: ['too_expensive', 'unused', 'switched_service', 'other'] } },
    subscription_update: { enabled: true, default_allowed_updates: ['price'], products: portalProducts, proration_behavior: 'create_prorations' },
  },
  default_return_url: 'https://seliem.dev/account',
  metadata: { seliem: 'care' },
}
let portal = null
for await (const c of stripe.billingPortal.configurations.list({ active: true, limit: 100 })) {
  if (c.metadata?.seliem === 'care') portal = c
}
if (portal) {
  portal = await stripe.billingPortal.configurations.update(portal.id, portalSettings)
  console.log(`✓ ${portal.id} (updated)`)
} else {
  portal = await stripe.billingPortal.configurations.create(portalSettings)
  console.log(`+ ${portal.id}`)
}

let webhookSecret = null
if (webhookUrl) {
  console.log('\nWebhook')
  let existing = null
  for await (const w of stripe.webhookEndpoints.list({ limit: 100 })) {
    if (w.url === webhookUrl) existing = w
  }
  if (existing) {
    await stripe.webhookEndpoints.update(existing.id, { enabled_events: EVENTS, disabled: false })
    console.log(`✓ ${webhookUrl} (${existing.id}) — events updated.`)
    console.log('  Its signing secret is only shown at creation: copy it from Dashboard → Developers → Webhooks if you need it again.')
  } else {
    const created = await stripe.webhookEndpoints.create({ url: webhookUrl, enabled_events: EVENTS, description: 'seliem.dev billing' })
    webhookSecret = created.secret
    console.log(`+ ${webhookUrl} (${created.id})`)
  }
} else {
  console.log('\n(Skipped webhook — pass --webhook-url https://seliem.dev/api/stripe/webhook)')
}

console.log('\nAdd these to Vercel → seliem-dev → Settings → Environment Variables (Production):')
console.log(`  STRIPE_PORTAL_CONFIGURATION_ID=${portal.id}`)
if (webhookSecret) console.log(`  STRIPE_WEBHOOK_SECRET=${webhookSecret}   ← shown once, copy it now`)
console.log('  STRIPE_SECRET_KEY=<your restricted key, rk_...>\n')
