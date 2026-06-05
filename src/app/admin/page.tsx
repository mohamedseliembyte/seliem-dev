'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-client'

type Lead = {
  id: string
  created_at: string
  type: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
  business_type: string | null
  budget: string | null
  goals: string | null
  message: string
  status: string
}

const GOLD = '#c9a84c'

export default function AdminPage() {
  const supabase = getSupabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Lead | null>(null)

  const loadLeads = useCallback(async (token: string) => {
    setError(null)
    try {
      const res = await fetch('/api/admin/leads', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 403) {
        setError('This Google account isn’t authorized for the admin.')
        setLeads([])
        return
      }
      if (!res.ok) {
        setError('Failed to load leads.')
        return
      }
      const data = await res.json()
      setLeads(data.leads ?? [])
    } catch {
      setError('Network error loading leads.')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session) loadLeads(data.session.access_token)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) loadLeads(s.access_token)
      else setLeads([])
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase, loadLeads])

  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined,
      },
    })

  const signOut = () => supabase.auth.signOut()

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#888' }}>Loading…</p>
      </div>
    )
  }

  // ── Logged out → login screen ────────────────────────────────────────────────
  if (!session) {
    return (
      <div style={styles.center}>
        <div style={styles.loginCard}>
          <h1 style={{ color: GOLD, margin: '0 0 8px', fontSize: 24 }}>Seliem.dev Admin</h1>
          <p style={{ color: '#999', margin: '0 0 24px', fontSize: 14 }}>Sign in to view your leads.</p>
          <button onClick={signIn} style={styles.googleBtn}>
            <span style={{ fontWeight: 600 }}>Sign in with Google</span>
          </button>
        </div>
      </div>
    )
  }

  // ── Logged in → dashboard ────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ color: GOLD, margin: 0, fontSize: 20 }}>
          Leads <span style={{ color: '#666', fontSize: 14 }}>({leads.length})</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#888', fontSize: 13 }}>{session.user.email}</span>
          <button onClick={signOut} style={styles.signOutBtn}>Sign out</button>
        </div>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      {!error && leads.length === 0 && (
        <p style={{ color: '#777', padding: 24 }}>No leads yet. They’ll appear here the moment someone submits the contact form.</p>
      )}

      <div style={styles.list}>
        {leads.map((lead) => (
          <button key={lead.id} onClick={() => setSelected(lead)} style={styles.row}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#eee' }}>{lead.name}</span>
              <span style={styles.badge(lead.type)}>{lead.type}</span>
            </div>
            <div style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
              {lead.business_name && lead.business_name !== 'N/A' ? `${lead.business_name} · ` : ''}
              {lead.email}
            </div>
            <div style={{ color: '#666', fontSize: 12, marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {lead.budget && <span>💰 {lead.budget}</span>}
              <span>{new Date(lead.created_at).toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div style={styles.overlay} onClick={() => setSelected(null)}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ color: GOLD, margin: 0, fontSize: 20 }}>{selected.name}</h2>
              <button onClick={() => setSelected(null)} style={styles.closeBtn}>✕</button>
            </div>
            <Field label="Type" value={selected.type} />
            <Field label="Email" value={selected.email} />
            {selected.phone && selected.phone !== 'N/A' && <Field label="Phone" value={selected.phone} />}
            {selected.business_name && selected.business_name !== 'N/A' && <Field label="Business" value={selected.business_name} />}
            {selected.business_type && selected.business_type !== 'N/A' && <Field label="Business type" value={selected.business_type} />}
            {selected.budget && <Field label="Budget" value={selected.budget} />}
            {selected.goals && <Field label="Goals" value={selected.goals} />}
            <Field label="Status" value={selected.status} />
            <Field label="Received" value={new Date(selected.created_at).toLocaleString()} />
            <div style={{ marginTop: 16 }}>
              <div style={styles.fieldLabel}>Message</div>
              <p style={{ color: '#ddd', whiteSpace: 'pre-wrap', margin: '4px 0 0', lineHeight: 1.5 }}>{selected.message}</p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selected.email)}`} target="_blank" rel="noreferrer" style={styles.actionBtn}>📧 Email</a>
              {selected.phone && selected.phone !== 'N/A' && (
                <a href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={styles.actionBtn}>💬 WhatsApp</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={{ color: '#eee', fontSize: 14 }}>{value}</div>
    </div>
  )
}

// ── Inline styles (keeps the admin self-contained) ───────────────────────────
const styles = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'system-ui, sans-serif' } as React.CSSProperties,
  center: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
  loginCard: { background: '#141414', border: '1px solid #222', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 360 } as React.CSSProperties,
  googleBtn: { background: '#fff', color: '#111', border: 'none', borderRadius: 10, padding: '12px 24px', cursor: 'pointer', width: '100%', fontSize: 15 } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1c1c1c', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 } as React.CSSProperties,
  signOutBtn: { background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 } as React.CSSProperties,
  error: { background: '#2a1414', color: '#f88', padding: '12px 24px', margin: 16, borderRadius: 8, border: '1px solid #4a2020' } as React.CSSProperties,
  list: { padding: 16, display: 'grid', gap: 10, maxWidth: 720, margin: '0 auto' } as React.CSSProperties,
  row: { textAlign: 'left', background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 16, cursor: 'pointer', color: 'inherit', width: '100%' } as React.CSSProperties,
  badge: (type: string) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: type === 'support' ? '#1c2a3a' : '#2a2414', color: type === 'support' ? '#7ab' : GOLD, textTransform: 'uppercase' as const }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 } as React.CSSProperties,
  drawer: { background: '#111', borderLeft: '1px solid #222', width: 'min(440px, 100%)', height: '100%', padding: 24, overflowY: 'auto' } as React.CSSProperties,
  closeBtn: { background: 'transparent', color: '#888', border: 'none', fontSize: 18, cursor: 'pointer' } as React.CSSProperties,
  fieldLabel: { color: '#777', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 } as React.CSSProperties,
  actionBtn: { background: '#1c1c1c', color: '#eee', border: '1px solid #333', borderRadius: 8, padding: '10px 16px', textDecoration: 'none', fontSize: 14 } as React.CSSProperties,
}
