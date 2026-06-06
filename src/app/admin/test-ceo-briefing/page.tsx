'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-client'
import { googlePopupSignIn, exchangeGoogleToken } from '@/lib/google-auth'

const GOLD = '#c9a84c'

export default function TestCeoBriefingPage() {
  const supabase = getSupabaseBrowser()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  const signIn = async () => {
    try {
      const g = await googlePopupSignIn()
      await exchangeGoogleToken(supabase, g.idToken, g.nonce)
    } catch { /* ignore */ }
  }

  const runTest = async () => {
    if (!session) return
    setSending(true); setError(null); setPreview(null)
    try {
      const res = await fetch('/api/admin/ceo-briefing', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setPreview((data.message || '').replace(/<\/?b>/g, ''))
    } catch { setError('Network error') }
    finally { setSending(false) }
  }

  if (loading) return <Shell><p style={{ color: '#888' }}>Loading…</p></Shell>

  if (!session) return (
    <Shell>
      <p style={{ color: '#999', marginBottom: 16 }}>Sign in to test the CEO briefing.</p>
      <button onClick={signIn} style={btn}>Sign in with Google</button>
    </Shell>
  )

  return (
    <Shell>
      <p style={{ color: '#999', marginBottom: 16, fontSize: 14 }}>
        Click below to generate the daily briefing now and send it to your Telegram.
      </p>
      <button onClick={runTest} disabled={sending} style={{ ...btn, opacity: sending ? 0.5 : 1 }}>
        {sending ? 'Sending…' : '📤 Send test briefing'}
      </button>
      {error && <p style={{ color: '#f88', marginTop: 16 }}>{error}</p>}
      {preview && (
        <pre style={{ marginTop: 20, padding: 16, background: '#141414', border: '1px solid #222', borderRadius: 12, color: '#ddd', whiteSpace: 'pre-wrap', fontSize: 14, fontFamily: 'inherit' }}>
          {preview}
        </pre>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#eee', padding: 24 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Link href="/admin" style={{ color: GOLD, fontSize: 14 }}>← Back to Admin</Link>
        <h1 style={{ color: GOLD, fontSize: 22, marginTop: 16 }}>Test CEO Briefing</h1>
        <div style={{ marginTop: 16 }}>{children}</div>
      </div>
    </main>
  )
}

const btn: React.CSSProperties = {
  background: GOLD, color: '#000', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 15,
}
