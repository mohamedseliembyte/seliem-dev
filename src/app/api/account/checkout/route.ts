import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { authorizeClient, loadOwnedLead } from '@/lib/account-auth'
import {
  getStripe, getOrCreateCustomer, siteUrl, toCents, isCarePlan, carePlanLookupKey,
  INTEGRATION_IDENTIFIER, type CareInterval,
} from '@/lib/stripe'

export const dynamic = 'force-dynamic'

type Body =
  | { kind: 'invoice'; id: string }
  | { kind: 'payment'; id: string }
  | { kind: 'care'; lead_id: string; plan: string; interval: string }

// Statuses that count as "already has a care plan", so a client can't start a
// second subscription by accident. They manage the existing one in the portal.
const LIVE_SUB_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete']

// POST — create a Stripe Checkout Session for something the signed-in client
// owes (an invoice or payment request) or for a care-plan subscription.
// Returns { url } for the browser to redirect to. Payment is confirmed only by
// the webhook (/api/stripe/webhook), never by the return page.
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Card payments are not set up yet.' }, { status: 503 })

  const auth = await authorizeClient(req)
  if (auth.response) return auth.response
  const { supabase, email } = auth

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const origin = siteUrl(req)

  try {
    if (body.kind === 'invoice' || body.kind === 'payment') {
      const table = body.kind === 'invoice' ? 'invoices' : 'payments'
      const { data: row } = await supabase
        .from(table)
        .select(body.kind === 'invoice'
          ? 'id, invoice_no, lead_id, items, total, currency, status, stripe_checkout_session_id'
          : 'id, lead_id, description, amount, currency, status, stripe_checkout_session_id')
        .eq('id', body.id)
        .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any
      if (!r?.lead_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const lead = await loadOwnedLead(supabase, r.lead_id, email)
      if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const payable = body.kind === 'invoice' ? r.status === 'sent' : r.status === 'pending'
      if (!payable) return NextResponse.json({ error: 'This is not awaiting payment.' }, { status: 409 })

      // Re-use a still-open session so a double click can't create two charges.
      if (r.stripe_checkout_session_id) {
        try {
          const existing = await stripe.checkout.sessions.retrieve(r.stripe_checkout_session_id)
          if (existing.status === 'open' && existing.url) return NextResponse.json({ url: existing.url })
          if (existing.status === 'complete') {
            return NextResponse.json({ error: 'This payment is already being processed.' }, { status: 409 })
          }
        } catch { /* expired or deleted — make a new one */ }
      }

      const currency = String(r.currency || 'usd').toLowerCase()
      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
      if (body.kind === 'invoice') {
        const items = (Array.isArray(r.items) ? r.items : []) as { description: string; amount: number }[]
        lineItems = items
          .map((it) => ({ name: String(it.description || '').trim(), cents: toCents(it.amount) }))
          .filter((it): it is { name: string; cents: number } => Boolean(it.name) && it.cents !== null)
          .map((it) => ({ quantity: 1, price_data: { currency, unit_amount: it.cents, product_data: { name: it.name } } }))
        const totalCents = toCents(r.total)
        const sum = lineItems.reduce((t, li) => t + (li.price_data?.unit_amount ?? 0), 0)
        if (!totalCents || lineItems.length === 0 || sum !== totalCents) {
          return NextResponse.json({ error: 'This invoice needs a correction before it can be paid online.' }, { status: 422 })
        }
      } else {
        const cents = toCents(r.amount)
        if (!cents) return NextResponse.json({ error: 'Invalid amount' }, { status: 422 })
        lineItems = [{ quantity: 1, price_data: { currency, unit_amount: cents, product_data: { name: String(r.description || 'Payment') } } }]
      }

      const customer = await getOrCreateCustomer(stripe, supabase, lead)
      const ref = { kind: body.kind, id: r.id, lead_id: lead.id }
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer,
        client_reference_id: r.id,
        line_items: lineItems,
        metadata: ref,
        payment_intent_data: {
          metadata: ref,
          description: body.kind === 'invoice' ? `Seliem.dev invoice #${r.invoice_no}` : String(r.description || 'Payment'),
        },
        integration_identifier: body.kind === 'invoice' ? INTEGRATION_IDENTIFIER.invoice : INTEGRATION_IDENTIFIER.payment,
        success_url: `${origin}/account?checkout=success`,
        cancel_url: `${origin}/account?checkout=cancelled`,
      }, { idempotencyKey: `checkout-${body.kind}-${r.id}-${r.stripe_checkout_session_id ?? 'first'}` })

      await supabase.from(table).update({ stripe_checkout_session_id: session.id }).eq('id', r.id)
      return NextResponse.json({ url: session.url })
    }

    if (body.kind === 'care') {
      if (!isCarePlan(body.plan)) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
      const interval: CareInterval = body.interval === 'year' ? 'year' : 'month'
      const lead = await loadOwnedLead(supabase, body.lead_id, email)
      if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const { data: live } = await supabase
        .from('care_subscriptions')
        .select('id')
        .eq('lead_id', lead.id)
        .in('status', LIVE_SUB_STATUSES)
        .limit(1)
      if ((live ?? []).length > 0) {
        return NextResponse.json({ error: 'You already have a care plan. Use “Manage billing” to change it.' }, { status: 409 })
      }

      const lookupKey = carePlanLookupKey(body.plan, interval)
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
      const price = prices.data[0]
      if (!price) {
        console.error(`[stripe] no active price with lookup key ${lookupKey} — run scripts/stripe-setup.mjs`)
        return NextResponse.json({ error: 'That plan is not available online yet.' }, { status: 503 })
      }

      const customer = await getOrCreateCustomer(stripe, supabase, lead)
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer,
        client_reference_id: lead.id,
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { kind: 'care', lead_id: lead.id, plan: body.plan },
        subscription_data: { metadata: { lead_id: lead.id, plan: body.plan } },
        integration_identifier: INTEGRATION_IDENTIFIER.carePlan,
        success_url: `${origin}/account?checkout=success`,
        cancel_url: `${origin}/account?checkout=cancelled`,
      })
      return NextResponse.json({ url: session.url })
    }

    return NextResponse.json({ error: 'Unknown kind' }, { status: 400 })
  } catch (err) {
    console.error('[stripe] checkout failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 })
  }
}
