'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-client'
import { googlePopupSignIn, exchangeGoogleToken } from '@/lib/google-auth'

type Lead = {
  id: string
  created_at: string
  type: string
  business_name: string | null
  budget: string | null
  goals: string | null
  message: string
  status: string
  domain_status: string | null
}
type Convo = { id: string; status: string; summary: string | null; created_at: string }
type Msg = { conversation_id: string; role: string; content: string; created_at: string }

const GOLD = '#c9a84c'
const STATUS_LABEL: Record<string, string> = {
  new: 'Received', contacted: 'In touch', qualified: 'In discussion', won: 'Active client', lost: 'Closed',
}

export default function AccountPage() {
  const supabase = getSupabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [data, setData] = useState<{ leads: Lead[]; conversations: Convo[]; messages: Msg[] } | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const load = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/account', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
  }, [])

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
      const { error } = await exchangeGoogleToken(supabase, g.idToken)
      if (error) setAuthError(String((error as { message?: string }).message ?? error))
    } catch (e) {
      if (e instanceof Error && e.message === 'popup_blocked') {
        supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/account` } })
      }
    }
  }
  const signOut = () => supabase.auth.signOut()

  if (loading) return <Shell><p className="text-gray-500">Loading…</p></Shell>

  if (!session) return (
    <Shell>
      <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-8 text-center">
        <Image src="/logo.png" alt="Seliem.dev" width={48} height={48} className="mx-auto mb-4 rounded-xl" />
        <h1 className="text-xl font-bold" style={{ color: GOLD }}>Your Account</h1>
        <p className="mt-1 mb-6 text-sm text-gray-400">Sign in to see your inquiries and conversations.</p>
        <button onClick={signIn} className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:opacity-90">
          Sign in with Google
        </button>
        {authError && <p className="mt-4 text-xs text-red-400">{authError}</p>}
      </div>
    </Shell>
  )

  const leads = data?.leads ?? []
  const convosFor = () => data?.conversations ?? []
  const msgsFor = (cid: string) => (data?.messages ?? []).filter((m) => m.conversation_id === cid)

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: GOLD }}>My Account</h1>
            <p className="text-sm text-gray-500">{session.user.email}</p>
          </div>
          <button onClick={signOut} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-gray-400 hover:text-white">Sign out</button>
        </div>

        {leads.length === 0 && convosFor().length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#141414] p-8 text-center">
            <p className="text-gray-400">No inquiries yet.</p>
            <Link href="/#contact" className="mt-3 inline-block text-sm" style={{ color: GOLD }}>Start a project →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600">Your Inquiries</h2>
            {leads.map((l) => (
              <div key={l.id} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-100">{l.business_name && l.business_name !== 'N/A' ? l.business_name : 'Your project'}</span>
                  <span className="rounded-full bg-[#2a2414] px-2.5 py-0.5 text-xs" style={{ color: GOLD }}>{STATUS_LABEL[l.status] ?? l.status}</span>
                </div>
                {l.goals && <p className="mt-2 text-sm text-gray-400">{l.goals}</p>}
                <p className="mt-2 line-clamp-3 text-sm text-gray-500">{l.message}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                  {l.budget && <span>💰 {l.budget}</span>}
                  <span>{new Date(l.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {convosFor().length > 0 && (
              <>
                <h2 className="pt-4 text-xs font-semibold uppercase tracking-widest text-gray-600">Your Conversations</h2>
                {convosFor().map((c) => (
                  <div key={c.id} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                      {c.status === 'lead_captured' && <span className="rounded-full bg-[#1a2a1a] px-2.5 py-0.5 text-xs text-green-400">Submitted ✓</span>}
                    </div>
                    <div className="space-y-2">
                      {msgsFor(c.id).slice(-6).map((m, i) => (
                        <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-sm ${m.role === 'user' ? 'bg-[#c9a84c] text-black' : 'bg-[#1c1c1c] text-gray-200'}`} style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0a0a0a] px-5 py-16 text-gray-300">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm" style={{ color: GOLD }}>← Back to Seliem.dev</Link>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  )
}
