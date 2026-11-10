'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-client'
import { googlePopupSignIn, exchangeGoogleToken } from '@/lib/google-auth'
import { downloadAgreementPdf } from '@/lib/agreement-pdf'
import { downloadInvoicePdf } from '@/lib/invoice-pdf'

type Lead = {
  id: string
  created_at: string
  type: string
  business_name: string | null
  project_name: string | null
  budget: string | null
  goals: string | null
  message: string
  status: string
  domain_status: string | null
}
type Convo = { id: string; status: string; summary: string | null; created_at: string }
type Msg = { conversation_id: string; role: string; content: string; created_at: string }
type Payment = { id: string; lead_id: string; description: string; amount: number; status: string; created_at: string }
type Agreement = { id: string; lead_id: string; scope: string; price: number; content: string; status: string; created_at: string; accepted_at: string | null }
type CareSub = { id: string; lead_id: string | null; plan: string | null; billing_interval: string | null; amount: number | null; status: string; current_period_end: string | null; cancel_at_period_end: boolean }
type Invoice = { id: string; invoice_no: number | null; lead_id: string | null; items: { description: string; amount: number }[]; total: number; currency: string | null; status: string; notes: string | null; due_date: string | null; created_at: string; paid_at: string | null }

const GOLD = '#c9a84c'
const PAYPAL_HANDLE = process.env.NEXT_PUBLIC_PAYPAL_HANDLE || ''
// Mirrors the public pricing (components/sections/Pricing.tsx). The amount
// actually charged comes from the Stripe price, looked up server-side.
const CARE_PLANS = [
  { key: 'basic', name: 'Basic', month: 30, year: 300, blurb: 'Monitoring, updates, 30 min of edits' },
  { key: 'pro', name: 'Pro', month: 79, year: 790, blurb: 'Up to 2 hours of edits, analytics summary' },
  { key: 'ultra', name: 'Ultra', month: 149, year: 1490, blurb: 'Up to 5 hours of edits, conversion work' },
] as const
const LIVE_SUB = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete']
const SUB_LABEL: Record<string, string> = {
  active: 'Active', trialing: 'Trial', past_due: 'Payment failed — retrying', unpaid: 'Unpaid', incomplete: 'Awaiting payment', canceled: 'Ended', incomplete_expired: 'Expired', paused: 'Paused',
}
const STATUS_LABEL: Record<string, string> = {
  new: 'Received', contacted: 'In touch', qualified: 'In discussion', won: 'Active client', lost: 'Closed',
}

export default function AccountPage() {
  const supabase = getSupabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [data, setData] = useState<{ leads: Lead[]; conversations: Convo[]; messages: Msg[]; payments?: Payment[]; agreements?: Agreement[]; invoices?: Invoice[]; careSubscriptions?: CareSub[]; billing?: { stripe: boolean } } | null>(null)
  const [signing, setSigning] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [paying, setPaying] = useState<string | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  // Back from Stripe Checkout. The webhook records the payment, so "success"
  // here only means "submitted" — the paid badge appears once Stripe confirms.
  // (Read lazily: the first render is the loading screen, so no hydration gap.)
  const [checkoutNotice, setCheckoutNotice] = useState<'success' | 'cancelled' | null>(() => {
    if (typeof window === 'undefined') return null
    const c = new URL(window.location.href).searchParams.get('checkout')
    return c === 'success' || c === 'cancelled' ? c : null
  })
  const [careInterval, setCareInterval] = useState<'month' | 'year'>('month')

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('checkout')) {
      url.searchParams.delete('checkout')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  const load = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/account', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
  }, [])

  // Redirects to Stripe-hosted Checkout or the Customer Portal.
  const goToStripe = async (endpoint: string, body: Record<string, string> | null, key: string) => {
    if (!session) return
    setPaying(key); setBillingError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.url) { window.location.assign(json.url); return }
      setBillingError(json.error || 'Something went wrong. Please try again.')
    } catch { setBillingError('Network error. Please try again.') }
    setPaying(null)
  }
  const payByCard = (kind: 'invoice' | 'payment', id: string) => goToStripe('/api/account/checkout', { kind, id }, `${kind}:${id}`)
  const startCarePlan = (leadId: string, plan: string) => goToStripe('/api/account/checkout', { kind: 'care', lead_id: leadId, plan, interval: careInterval }, `care:${plan}`)
  const openPortal = () => goToStripe('/api/account/billing-portal', null, 'portal')

  const signAgreement = async (agreementId: string) => {
    if (!session) return
    setSigning(agreementId)
    try {
      const res = await fetch('/api/account/sign-agreement', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreement_id: agreementId }),
      })
      if (res.ok) await load(session.access_token)
    } catch { /* ignore */ }
    setSigning(null)
  }

  useEffect(() => {
    let mounted = true
    async function init() {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {})
        window.history.replaceState({}, '', '/account')
      }
      const { data: s } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(s.session); setLoading(false)
      if (s.session) load(s.session.access_token)
    }
    init()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (!mounted) return; setSession(s); if (s) load(s.access_token); else setData(null) })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [supabase, load])

  const signIn = async () => {
    try {
      const g = await googlePopupSignIn()
      const { error } = await exchangeGoogleToken(supabase, g.idToken, g.nonce)
      if (error) setAuthError(String((error as { message?: string }).message ?? error))
    } catch (e) {
      if (e instanceof Error && e.message === 'popup_blocked') {
        supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/account` } })
      }
    }
  }
  const signOut = () => supabase.auth.signOut()

  if (loading) return (
    <Shell>
      <div className="flex items-center gap-3 text-gray-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#c9a84c]/30 border-t-[#c9a84c]" />
        Loading your account…
      </div>
    </Shell>
  )

  if (!session) return (
    <Shell>
      <div className="mx-auto max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#171717] to-[#0e0e0e] p-8 text-center shadow-2xl shadow-black/50">
        <Image src="/logo.png" alt="Seliem.dev" width={56} height={56} className="mx-auto mb-5 rounded-2xl ring-1 ring-[#c9a84c]/30" />
        <h1 className="text-2xl font-bold gold-text">Your Account</h1>
        <p className="mt-2 mb-7 text-sm text-gray-400">Sign in to view your projects, agreements, and conversations.</p>
        <button onClick={signIn} className="sheen w-full rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#f5d485] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-105 active:scale-[0.99]">
          Sign in with Google
        </button>
        {authError && <p className="mt-4 text-xs text-red-400">{authError}</p>}
      </div>
    </Shell>
  )

  const leads = data?.leads ?? []
  const stripeOn = Boolean(data?.billing?.stripe)
  const subs = data?.careSubscriptions ?? []
  const liveSubs = subs.filter((x) => LIVE_SUB.includes(x.status))
  // Care plans are offered once someone is an active client, on their latest project.
  const clientLead = leads.find((l) => l.status === 'won') ?? null
  const convosFor = () => data?.conversations ?? []
  const msgsFor = (cid: string) => (data?.messages ?? []).filter((m) => m.conversation_id === cid)
  const userName = (session.user.user_metadata?.full_name as string) || (session.user.user_metadata?.name as string) || session.user.email?.split('@')[0] || 'there'
  const userPic = (session.user.user_metadata?.avatar_url as string) || (session.user.user_metadata?.picture as string) || ''

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#141414] p-5">
          <div className="flex items-center gap-3">
            {userPic
              ? <img src={userPic} alt="" className="h-11 w-11 rounded-full ring-1 ring-[#c9a84c]/40" />
              : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#c9a84c]/15 text-lg font-bold text-[#c9a84c]">{userName.charAt(0).toUpperCase()}</span>}
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">Welcome back, {userName.split(' ')[0]}</h1>
              <p className="text-xs text-gray-500">{session.user.email}</p>
            </div>
          </div>
          <button onClick={signOut} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-gray-400 transition hover:border-white/30 hover:text-white">Sign out</button>
        </div>

        {checkoutNotice && (
          <div className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm ${checkoutNotice === 'success' ? 'border-green-500/30 bg-[#0f1a0f] text-green-300' : 'border-white/10 bg-[#141414] text-gray-400'}`}>
            <span>{checkoutNotice === 'success'
              ? 'Thank you — your payment went through. It can take a minute to show as paid here, and Stripe emails you a receipt.'
              : 'Checkout was cancelled. Nothing was charged.'}</span>
            <button onClick={() => setCheckoutNotice(null)} className="text-gray-500 hover:text-white" aria-label="Dismiss">✕</button>
          </div>
        )}
        {billingError && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-500/30 bg-[#1a0f0f] p-4 text-sm text-red-300">
            <span>{billingError}</span>
            <button onClick={() => setBillingError(null)} className="text-gray-500 hover:text-white" aria-label="Dismiss">✕</button>
          </div>
        )}

        {leads.length === 0 && convosFor().length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#141414] p-10 text-center">
            <p className="text-gray-400">No inquiries yet.</p>
            <Link href="/#contact" className="mt-4 inline-block rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#f5d485] px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-105">Start a project →</Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Inquiries */}
            <Section title="Your Inquiries" count={leads.length}>
              <div className="space-y-4">
                {leads.map((l) => (
                  <div key={l.id} className="card-lift rounded-2xl border border-white/10 bg-[#141414] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-100">{l.project_name || (l.business_name && l.business_name !== 'N/A' ? l.business_name : 'Your project')}</span>
                      <StatusPill status={l.status} />
                    </div>
                    {l.goals && <p className="mt-2 text-sm text-gray-400">{l.goals}</p>}
                    <p className="mt-2 line-clamp-3 text-sm text-gray-500">{l.message}</p>
                    <div className="mt-4 flex flex-wrap gap-3 border-t border-white/5 pt-3 text-xs text-gray-600">
                      {l.budget && <span>💰 {l.budget}</span>}
                      <span>📅 {new Date(l.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Agreements */}
            {(data?.agreements ?? []).length > 0 && (
              <Section title="Your Agreements" count={(data?.agreements ?? []).length}>
                <div className="space-y-4">
                  {(data?.agreements ?? []).map((a) => (
                    <div key={a.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-2xl font-bold gold-text">${Number(a.price).toLocaleString()}</span>
                        {a.status === 'accepted'
                          ? <span className="rounded-full bg-[#1a2a1a] px-3 py-1 text-xs font-semibold text-green-400">✓ Signed</span>
                          : <span className="rounded-full bg-[#2a2a14] px-3 py-1 text-xs font-semibold" style={{ color: GOLD }}>Awaiting signature</span>}
                      </div>
                      <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/5 bg-[#0a0a0a] p-4 text-sm leading-relaxed text-gray-300" style={{ fontFamily: 'inherit' }}>{a.content}</pre>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        {a.status !== 'accepted' ? (
                          <button
                            onClick={() => signAgreement(a.id)}
                            disabled={signing === a.id}
                            className="sheen flex-1 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#f5d485] py-3 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-50"
                          >
                            {signing === a.id ? 'Signing…' : '✍️ Accept & Sign'}
                          </button>
                        ) : (
                          <p className="flex-1 self-center text-xs text-gray-500">Signed on {a.accepted_at ? new Date(a.accepted_at).toLocaleString() : ''}</p>
                        )}
                        <button
                          onClick={() => downloadAgreementPdf({ ...a, clientName: userName })}
                          className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:border-[#c9a84c]/50 hover:text-white"
                        >
                          ⬇ Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Payments */}
            {(data?.invoices ?? []).length > 0 && (
              <Section title="Your Invoices" count={(data?.invoices ?? []).length}>
                <div className="space-y-4">
                  {(data?.invoices ?? []).map((inv) => (
                    <div key={inv.id} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-500">Invoice #{inv.invoice_no}</span>
                          <div className="text-2xl font-bold gold-text">${Number(inv.total).toLocaleString()}</div>
                        </div>
                        {inv.status === 'paid'
                          ? <span className="rounded-full bg-[#1a2a1a] px-3 py-1 text-xs font-semibold text-green-400">✓ Paid</span>
                          : <span className="rounded-full bg-[#2a2a14] px-3 py-1 text-xs font-semibold" style={{ color: GOLD }}>{inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString()}` : 'Due'}</span>}
                      </div>
                      <div className="space-y-1 border-t border-white/5 pt-3 text-sm text-gray-400">
                        {(inv.items ?? []).map((it, i) => (
                          <div key={i} className="flex justify-between gap-3">
                            <span>{it.description}</span>
                            <span className="shrink-0 text-gray-300">${Number(it.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        {inv.status === 'sent' && stripeOn && (
                          <button onClick={() => payByCard('invoice', inv.id)} disabled={paying !== null} className="sheen flex-1 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#f5d485] py-3 text-center text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-50">
                            {paying === `invoice:${inv.id}` ? 'Opening checkout…' : `Pay $${Number(inv.total).toLocaleString()}`}
                          </button>
                        )}
                        {inv.status === 'sent' && PAYPAL_HANDLE && (
                          <a href={`https://paypal.me/${PAYPAL_HANDLE}/${inv.total}`} target="_blank" rel="noreferrer" className={stripeOn
                            ? 'rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-gray-300 transition hover:border-[#c9a84c]/50 hover:text-white'
                            : 'sheen flex-1 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#f5d485] py-3 text-center text-sm font-semibold text-black transition hover:brightness-105'}>
                            {stripeOn ? 'PayPal' : `Pay $${Number(inv.total).toLocaleString()}`}
                          </a>
                        )}
                        <button onClick={() => downloadInvoicePdf({ ...inv, clientName: userName, clientEmail: session.user.email })} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:border-[#c9a84c]/50 hover:text-white">
                          ⬇ Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {(data?.payments ?? []).length > 0 && (
              <Section title="Your Payments" count={(data?.payments ?? []).length}>
                <div className="space-y-4">
                  {(data?.payments ?? []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#141414] p-5">
                      <div>
                        <div className="text-xl font-bold text-white">${Number(p.amount).toLocaleString()}</div>
                        <div className="text-sm text-gray-400">{p.description}</div>
                      </div>
                      <div className="text-right">
                        {p.status === 'paid' ? (
                          <span className="rounded-full bg-[#1a2a1a] px-3 py-1 text-xs font-semibold text-green-400">✓ Paid</span>
                        ) : p.status === 'canceled' ? (
                          <span className="rounded-full bg-[#2a1414] px-3 py-1 text-xs font-semibold text-red-400">Canceled</span>
                        ) : stripeOn ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <button onClick={() => payByCard('payment', p.id)} disabled={paying !== null} className="sheen inline-block rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#f5d485] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-50">
                              {paying === `payment:${p.id}` ? 'Opening…' : 'Pay now'}
                            </button>
                            {PAYPAL_HANDLE && <a href={`https://paypal.me/${PAYPAL_HANDLE}/${p.amount}`} target="_blank" rel="noreferrer" className="text-xs text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline">or PayPal</a>}
                          </div>
                        ) : PAYPAL_HANDLE ? (
                          <a
                            href={`https://paypal.me/${PAYPAL_HANDLE}/${p.amount}`}
                            target="_blank"
                            rel="noreferrer"
                            className="sheen inline-block rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#f5d485] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-105"
                          >
                            Pay with PayPal
                          </a>
                        ) : (
                          <span className="rounded-full bg-[#2a2a14] px-3 py-1 text-xs font-semibold" style={{ color: GOLD }}>Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Care plan */}
            {stripeOn && (subs.length > 0 || clientLead) && (
              <Section title="Your Care Plan" count={liveSubs.length}>
                {subs.length > 0 && (
                  <div className="space-y-3">
                    {subs.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#141414] p-5">
                        <div>
                          <div className="font-semibold text-white">{sub.plan ? sub.plan[0].toUpperCase() + sub.plan.slice(1) : 'Care'} plan</div>
                          <div className="text-sm text-gray-400">
                            {sub.amount != null && `$${Number(sub.amount).toLocaleString()}/${sub.billing_interval === 'year' ? 'year' : 'month'}`}
                            {sub.current_period_end && LIVE_SUB.includes(sub.status) && (
                              <> · {sub.cancel_at_period_end ? 'ends' : 'renews'} {new Date(sub.current_period_end).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sub.status === 'active' ? 'bg-[#1a2a1a] text-green-400' : LIVE_SUB.includes(sub.status) ? 'bg-[#2a2a14] text-[#c9a84c]' : 'bg-white/5 text-gray-500'}`}>
                          {SUB_LABEL[sub.status] ?? sub.status}
                        </span>
                      </div>
                    ))}
                    <button onClick={openPortal} disabled={paying !== null} className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:border-[#c9a84c]/50 hover:text-white disabled:opacity-50">
                      {paying === 'portal' ? 'Opening…' : 'Manage billing — card, plan, receipts'}
                    </button>
                  </div>
                )}
                {liveSubs.length === 0 && clientLead && (
                  <div className={subs.length > 0 ? 'mt-6' : ''}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-400">Keep your site monitored, updated and improving. Cancel any time.</p>
                      <div className="flex shrink-0 rounded-full border border-white/10 p-1 text-xs">
                        {(['month', 'year'] as const).map((iv) => (
                          <button key={iv} onClick={() => setCareInterval(iv)} className={`rounded-full px-3 py-1 font-semibold transition ${careInterval === iv ? 'bg-[#c9a84c] text-black' : 'text-gray-400 hover:text-white'}`}>
                            {iv === 'month' ? 'Monthly' : 'Annual'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {CARE_PLANS.map((plan) => (
                        <button key={plan.key} onClick={() => startCarePlan(clientLead.id, plan.key)} disabled={paying !== null}
                          className="rounded-2xl border border-white/10 bg-[#141414] p-4 text-left transition hover:border-[#c9a84c]/50 disabled:opacity-50">
                          <div className="font-semibold text-white">{plan.name}</div>
                          <div className="mt-1 text-xl font-bold gold-text">${plan[careInterval].toLocaleString()}<span className="text-xs font-normal text-gray-500">/{careInterval === 'month' ? 'mo' : 'yr'}</span></div>
                          <div className="mt-2 text-xs text-gray-500">{paying === `care:${plan.key}` ? 'Opening checkout…' : plan.blurb}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Conversations */}
            {convosFor().length > 0 && (
              <Section title="Your Conversations" count={convosFor().length}>
                <div className="space-y-4">
                  {convosFor().map((c) => (
                    <div key={c.id} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                        {c.status === 'lead_captured' && <span className="rounded-full bg-[#1a2a1a] px-2.5 py-0.5 text-xs text-green-400">Submitted ✓</span>}
                      </div>
                      <div className="space-y-2">
                        {msgsFor(c.id).slice(-6).map((m, i) => (
                          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                                m.role === 'user'
                                  ? 'rounded-br-sm bg-gradient-to-r from-[#c9a84c] to-[#f5d485] text-black'
                                  : m.role === 'human'
                                  ? 'rounded-bl-sm border border-[#c9a84c]/30 bg-[#1a1810] text-gray-100'
                                  : 'rounded-bl-sm bg-[#1c1c1c] text-gray-200'
                              }`}
                              style={{ whiteSpace: 'pre-wrap' }}
                            >
                              {m.role === 'human' && <div className="mb-0.5 text-[10px] font-medium text-[#c9a84c]">Seliem.dev team</div>}
                              {m.content}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => window.dispatchEvent(new Event('open-chat'))}
                        className="mt-4 w-full rounded-xl border border-[#c9a84c]/40 bg-[#c9a84c]/10 py-2.5 text-sm font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c]/20"
                      >
                        💬 Continue this conversation
                      </button>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#c9a84c] to-[#f5d485]" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</h2>
        {count !== undefined && <span className="text-xs text-gray-600">({count})</span>}
      </div>
      {children}
    </section>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    new: { bg: '#1a2a1a', text: '#6d6' },
    contacted: { bg: '#2a2a14', text: GOLD },
    qualified: { bg: '#142a2a', text: '#6bd' },
    won: { bg: '#1a2a1a', text: '#4d4' },
    lost: { bg: '#2a1414', text: '#d66' },
  }
  const c = map[status] ?? map.new
  return <span className="rounded-full px-3 py-0.5 text-xs font-medium" style={{ background: c.bg, color: c.text }}>{STATUS_LABEL[status] ?? status}</span>
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="hero-grid min-h-screen bg-[#0a0a0a] px-5 py-16 text-gray-300">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#c9a84c] transition hover:brightness-110">← Back to Seliem.dev</Link>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  )
}
