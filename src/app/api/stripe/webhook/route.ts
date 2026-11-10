import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe, isCarePlan } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendTelegramMessage, escapeHtml } from '@/lib/telegram'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Stripe → seliem.dev. The ONLY place a card payment is recorded as paid.
//
// Subscribed events (create the endpoint with scripts/stripe-setup.mjs):
//   checkout.session.completed, checkout.session.async_payment_succeeded,
//   checkout.session.async_payment_failed,
//   customer.subscription.created / updated / deleted,
//   invoice.paid, invoice.payment_failed,
//   charge.refunded, charge.dispute.created, radar.early_fraud_warning.created
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const supabase = getSupabaseAdmin()
  if (!stripe || !secret || !supabase) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const raw = await req.text()
    event = stripe.webhooks.constructEvent(raw, signature, secret)
  } catch (err) {
    console.error('[stripe-webhook] bad signature:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Stripe redelivers on any non-2xx and occasionally duplicates. Skip events
  // already handled; record only after success so a failure is retried.
  const { data: seen, error: seenErr } = await supabase.from('stripe_events').select('id').eq('id', event.id).maybeSingle()
  if (seenErr) {
    // Database unreachable: fail so Stripe retries rather than losing the event.
    console.error('[stripe-webhook] db unavailable:', seenErr.message)
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })
  }
  if (seen) return NextResponse.json({ received: true, duplicate: true })

  try {
    await handleEvent(stripe, supabase, event)
  } catch (err) {
    console.error(`[stripe-webhook] ${event.type} ${event.id} failed:`, err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  await supabase.from('stripe_events').insert({ id: event.id, type: event.type })
  return NextResponse.json({ received: true })
}

async function handleEvent(stripe: Stripe, supabase: SupabaseClient, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object
      // With delayed payment methods, `completed` arrives while still unpaid;
      // the money is confirmed later by `async_payment_succeeded`.
      if (session.payment_status === 'unpaid') return
      if (session.mode === 'payment') await settleOneTime(supabase, session)
      if (session.mode === 'subscription' && typeof session.subscription === 'string') {
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        await syncSubscription(supabase, sub)
      }
      return
    }

    case 'checkout.session.async_payment_failed': {
      const session = event.data.object
      await sendTelegramMessage(
        `⚠️ <b>Card payment failed</b>\n\n` +
        `${escapeHtml(session.customer_details?.email ?? 'Unknown client')} — ` +
        `$${((session.amount_total ?? 0) / 100).toLocaleString()}\nIt is still marked unpaid.`,
      )
      return
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await syncSubscription(supabase, event.data.object, event.type)
      return
    }

    case 'invoice.paid': {
      const inv = event.data.object
      const subId = subscriptionIdOf(inv)
      if (!subId || inv.billing_reason === 'subscription_create') return // the first charge is announced by syncSubscription
      await sendTelegramMessage(
        `🔁 <b>Care plan renewed</b>\n\n${escapeHtml(inv.customer_email ?? inv.customer_name ?? 'Client')} — ` +
        `$${(inv.amount_paid / 100).toLocaleString()}`,
      )
      return
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object
      if (!subscriptionIdOf(inv)) return
      // Stripe retries and emails the client (Settings → Billing → Revenue recovery).
      // The subscription's status change arrives as customer.subscription.updated.
      await sendTelegramMessage(
        `⚠️ <b>Care plan payment failed</b>\n\n${escapeHtml(inv.customer_email ?? 'Client')} — ` +
        `$${(inv.amount_due / 100).toLocaleString()}\nStripe will retry automatically.` +
        (inv.hosted_invoice_url ? `\n${escapeHtml(inv.hosted_invoice_url)}` : ''),
      )
      return
    }

    case 'charge.refunded': {
      const charge = event.data.object
      const pi = idOf(charge.payment_intent)
      const fullyRefunded = charge.amount_refunded >= charge.amount
      if (pi && fullyRefunded) {
        // Flag the row so the admin can see the money went back. Status is left
        // as-is: whether the work is owed again is a judgement call.
        for (const table of ['invoices', 'payments'] as const) {
          await supabase.from(table).update({ paid_via: 'stripe_refunded' }).eq('stripe_payment_intent_id', pi)
        }
      }
      await sendTelegramMessage(
        `↩️ <b>Refund ${fullyRefunded ? 'issued' : '(partial)'}</b>\n\n` +
        `$${(charge.amount_refunded / 100).toLocaleString()} of $${(charge.amount / 100).toLocaleString()}` +
        (charge.billing_details?.email ? ` — ${escapeHtml(charge.billing_details.email)}` : ''),
      )
      return
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object
      await sendTelegramMessage(
        `🚨 <b>Payment disputed</b>\n\n$${(dispute.amount / 100).toLocaleString()} — reason: ${escapeHtml(dispute.reason)}\n` +
        `Respond in the Stripe Dashboard before the deadline or the money is lost.`,
      )
      return
    }

    case 'radar.early_fraud_warning.created': {
      const w = event.data.object
      await sendTelegramMessage(
        `🚨 <b>Early fraud warning</b>\n\nCharge ${escapeHtml(idOf(w.charge) ?? '')} — ${escapeHtml(w.fraud_type)}\n` +
        `Consider refunding it now to avoid a dispute fee.`,
      )
      return
    }

    default:
      return
  }
}

// ── One-time payments ───────────────────────────────────────────────────────
// Resolve the session to our row by the session id we stored when creating it;
// metadata is only a fallback (e.g. the DB write after creation failed).
async function settleOneTime(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const paymentIntent = idOf(session.payment_intent)
  const paid = {
    status: 'paid',
    paid_at: new Date().toISOString(),
    paid_via: 'stripe',
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntent,
  }

  for (const table of ['invoices', 'payments'] as const) {
    let { data: row, error: findErr } = await supabase.from(table).select('id, status, lead_id').eq('stripe_checkout_session_id', session.id).maybeSingle()
    if (findErr) throw new Error(`${table} lookup: ${findErr.message}`)
    if (!row && session.metadata?.id && session.metadata.kind === (table === 'invoices' ? 'invoice' : 'payment')) {
      ;({ data: row, error: findErr } = await supabase.from(table).select('id, status, lead_id').eq('id', session.metadata.id).maybeSingle())
      if (findErr) throw new Error(`${table} lookup: ${findErr.message}`)
    }
    if (!row) continue
    if (row.status === 'paid') return // already settled (e.g. marked by hand)

    const { error } = await supabase.from(table).update(paid).eq('id', row.id)
    if (error) throw new Error(`${table} update: ${error.message}`)

    const { data: lead } = await supabase.from('leads').select('name, business_name').eq('id', row.lead_id).maybeSingle()
    await sendTelegramMessage(
      `💳 <b>Paid by card</b>\n\n${escapeHtml(lead?.business_name || lead?.name || session.customer_details?.email || 'Client')} — ` +
      `$${((session.amount_total ?? 0) / 100).toLocaleString()}\n(${table === 'invoices' ? 'invoice' : 'payment request'} marked paid)`,
    )
    return
  }

  // Money arrived but matched nothing — make sure a human looks at it.
  await sendTelegramMessage(
    `⚠️ <b>Unmatched card payment</b>\n\nCheckout ${escapeHtml(session.id)} for ` +
    `$${((session.amount_total ?? 0) / 100).toLocaleString()} did not match an invoice or payment. Check Stripe.`,
  )
}

// ── Subscriptions ───────────────────────────────────────────────────────────
async function syncSubscription(supabase: SupabaseClient, sub: Stripe.Subscription, eventType?: string) {
  const customerId = idOf(sub.customer) ?? ''
  // Resolve the client through the Stripe Customer we created for them.
  const { data: lead } = await supabase.from('leads').select('id, name, business_name').eq('stripe_customer_id', customerId).maybeSingle()
  const leadId = lead?.id ?? sub.metadata?.lead_id ?? null

  const item = sub.items.data[0]
  const price = item?.price
  const lookupPlan = price?.lookup_key?.match(/^care_(\w+)_(month|year)$/)?.[1]
  const plan = isCarePlan(lookupPlan) ? lookupPlan : (sub.metadata?.plan ?? null)

  const { data: before, error: beforeErr } = await supabase.from('care_subscriptions').select('status, cancel_at_period_end').eq('stripe_subscription_id', sub.id).maybeSingle()

  if (beforeErr) throw new Error(`care_subscriptions lookup: ${beforeErr.message}`)

  const record = {
    lead_id: leadId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    plan,
    billing_interval: price?.recurring?.interval ?? null,
    amount: price?.unit_amount != null ? price.unit_amount / 100 : null,
    status: sub.status,
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('care_subscriptions').upsert(record, { onConflict: 'stripe_subscription_id' })
  if (error) throw new Error(`care_subscriptions upsert: ${error.message}`)

  const who = escapeHtml(lead?.business_name || lead?.name || 'A client')
  const label = `${plan ? plan[0].toUpperCase() + plan.slice(1) : 'Care'} plan`
  if (sub.status === 'active' && before?.status !== 'active' && before?.status !== 'past_due') {
    await sendTelegramMessage(`🎉 <b>New care plan</b>\n\n${who} — ${label}, $${record.amount ?? '?'}/${record.billing_interval ?? ''}`)
  } else if (eventType === 'customer.subscription.deleted') {
    await sendTelegramMessage(`👋 <b>Care plan ended</b>\n\n${who} — ${label}`)
  } else if (sub.cancel_at_period_end && before && !before.cancel_at_period_end) {
    await sendTelegramMessage(`🕓 <b>Care plan set to cancel</b>\n\n${who} — ${label}, ends ${record.current_period_end?.slice(0, 10) ?? 'at period end'}`)
  }
}

function subscriptionIdOf(inv: Stripe.Invoice): string | null {
  return idOf(inv.parent?.subscription_details?.subscription ?? null)
}

function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null
  return typeof v === 'string' ? v : v.id
}
