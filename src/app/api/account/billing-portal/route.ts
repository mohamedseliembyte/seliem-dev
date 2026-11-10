import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authorizeClient } from '@/lib/account-auth'
import { getStripe, siteUrl } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// POST — open the Stripe Customer Portal so a client can update their card,
// switch or cancel their care plan, and download receipts. Returns { url }.
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Card payments are not set up yet.' }, { status: 503 })

  const auth = await authorizeClient(req)
  if (auth.response) return auth.response
  const { supabase, email } = auth

  const { data: leads } = await supabase
    .from('leads')
    .select('id, stripe_customer_id, created_at')
    .ilike('email', email)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
  const customer = leads?.[0]?.stripe_customer_id
  if (!customer) return NextResponse.json({ error: 'No billing account yet. It is created with your first card payment.' }, { status: 404 })

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${siteUrl(req)}/account`,
      ...(process.env.STRIPE_PORTAL_CONFIGURATION_ID ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID } : {}),
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe] portal failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Could not open billing. Please try again.' }, { status: 502 })
  }
}
