'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-client'
import { googlePopupSignIn, exchangeGoogleToken } from '@/lib/google-auth'
import { downloadAgreementPdf } from '@/lib/agreement-pdf'

/* ── Types ────────────────────────────────────────────────────────────────── */
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
  domain_status: string | null
  source: string | null
  status: string
  notes: string | null
  customer_no: number | null
  duplicate_count: number | null
}

type Conversation = {
  id: string
  session_id: string
  status: string
  summary: string | null
  lead_id: string | null
  created_at: string
}

type ChatMessage = {
  conversation_id: string
  role: string
  content: string
  created_at: string
}

type Payment = {
  id: string
  lead_id: string
  description: string
  amount: number
  currency: string
  status: string
  created_at: string
  paid_at: string | null
}

type Agreement = {
  id: string
  lead_id: string
  scope: string
  price: number
  content: string
  status: string
  created_at: string
  accepted_at: string | null
  signer_name: string | null
}

type Task = {
  id: string
  title: string
  status: string
  due_date: string | null
  lead_id: string | null
  completed_at: string | null
  created_at: string
}

// Your PayPal.Me handle (set NEXT_PUBLIC_PAYPAL_HANDLE in env)
const PAYPAL_HANDLE = process.env.NEXT_PUBLIC_PAYPAL_HANDLE || ''

const GOLD = '#c9a84c'
const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:       { bg: '#1a2a1a', text: '#6d6' },
  contacted: { bg: '#2a2a14', text: GOLD },
  qualified: { bg: '#142a2a', text: '#6bd' },
  won:       { bg: '#1a2a1a', text: '#4d4' },
  lost:      { bg: '#2a1414', text: '#d66' },
}
const DOMAIN_LABELS: Record<string, string> = {
  has: '🟢 Has domain',
  wants: '🟡 Wants one',
  'needs-help': '🟠 Needs setup',
  unknown: '⚪ Unknown',
}

/* ── Component ────────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const supabase = getSupabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [tab, setTab] = useState<'details' | 'chat'>('details')
  const [filter, setFilter] = useState<string>('all')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async (token: string) => {
    setError(null)
    try {
      const res = await fetch('/api/admin/leads', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 403) { setError("This Google account isn't authorized."); return }
      if (!res.ok) { setError('Failed to load.'); return }
      const data = await res.json()
      setLeads(data.leads ?? [])
      setConversations(data.conversations ?? [])
      setMessages(data.messages ?? [])
      setPayments(data.payments ?? [])
      setAgreements(data.agreements ?? [])
      // Tasks live on a separate route
      try {
        const tRes = await fetch('/api/admin/tasks', { headers: { Authorization: `Bearer ${token}` } })
        if (tRes.ok) { const t = await tRes.json(); setTasks(t.tasks ?? []) }
      } catch { /* tasks are optional */ }
    } catch { setError('Network error.') }
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const errDesc = url.searchParams.get('error_description') ?? new URLSearchParams(url.hash.replace(/^#/, '')).get('error_description')
      if (errDesc) { if (mounted) { setAuthError(decodeURIComponent(errDesc)); setLoading(false) } return }
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
        window.history.replaceState({}, '', '/admin')
        if (exErr) { if (mounted) { setAuthError(exErr.message); setLoading(false) } return }
      }
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session); setLoading(false)
      if (data.session) loadData(data.session.access_token)
    }
    init()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (!mounted) return; setSession(s); if (s) loadData(s.access_token); else setLeads([]) })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [supabase, loadData])

  const signIn = async () => {
    try {
      const gUser = await googlePopupSignIn()
      const { error } = await exchangeGoogleToken(supabase, gUser.idToken, gUser.nonce)
      if (error) setAuthError(String((error as { message?: string }).message ?? error))
    } catch (err) {
      // Popup blocked or dismissed → fall back to redirect
      if (err instanceof Error && err.message === 'popup_blocked') {
        supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined } })
      }
    }
  }
  const signOut = () => supabase.auth.signOut()

  const updateLead = async (id: string, updates: Record<string, unknown>) => {
    if (!session) return
    setSaving(true)
    try {
      await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } as Lead : l))
      if (selected?.id === id) setSelected((s) => s ? { ...s, ...updates } as Lead : s)
    } catch { /* silent */ }
    setSaving(false)
  }

  // Get conversations linked to a lead
  const getLeadConversations = (leadId: string) => conversations.filter((c) => c.lead_id === leadId)
  const getConvoMessages = (convoId: string) => messages.filter((m) => m.conversation_id === convoId)
  const getLeadPayments = (leadId: string) => payments.filter((p) => p.lead_id === leadId)

  // ── Payments ───────────────────────────────────────────────────────────────
  const [payDesc, setPayDesc] = useState('')
  const [payAmount, setPayAmount] = useState('')

  const createPayment = async (leadId: string) => {
    if (!session || !payDesc.trim() || !Number(payAmount)) return
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, description: payDesc.trim(), amount: Number(payAmount) }),
      })
      const data = await res.json()
      if (data.payment) {
        setPayments((p) => [data.payment, ...p])
        setPayDesc(''); setPayAmount('')
      }
    } catch { /* ignore */ }
  }

  const setPaymentStatus = async (id: string, status: string) => {
    if (!session) return
    try {
      await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setPayments((p) => p.map((x) => x.id === id ? { ...x, status, paid_at: status === 'paid' ? new Date().toISOString() : null } : x))
    } catch { /* ignore */ }
  }

  const payLink = (amount: number) => PAYPAL_HANDLE ? `https://paypal.me/${PAYPAL_HANDLE}/${amount}` : ''

  // ── Agreements ───────────────────────────────────────────────────────────
  const getLeadAgreements = (leadId: string) => agreements.filter((a) => a.lead_id === leadId)
  const [agScope, setAgScope] = useState('')
  const [agPrice, setAgPrice] = useState('')
  const [agBusy, setAgBusy] = useState(false)
  const [viewAg, setViewAg] = useState<string | null>(null)

  const createAgreement = async (leadId: string) => {
    if (!session || !agScope.trim() || !Number(agPrice) || agBusy) return
    setAgBusy(true)
    try {
      const res = await fetch('/api/admin/agreements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, scope: agScope.trim(), price: Number(agPrice) }),
      })
      const data = await res.json()
      if (data.agreement) { setAgreements((a) => [data.agreement, ...a]); setAgScope(''); setAgPrice('') }
    } catch { /* ignore */ }
    setAgBusy(false)
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const [showTasks, setShowTasks] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [newTaskLead, setNewTaskLead] = useState('')
  const [taskBusy, setTaskBusy] = useState(false)

  const createTask = async () => {
    const title = newTaskTitle.trim()
    if (!session || !title || taskBusy) return
    setTaskBusy(true)
    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, due_date: newTaskDue || null, lead_id: newTaskLead || null }),
      })
      const data = await res.json()
      if (data.task) { setTasks((t) => [data.task, ...t]); setNewTaskTitle(''); setNewTaskDue(''); setNewTaskLead('') }
    } catch { /* ignore */ }
    setTaskBusy(false)
  }

  const setTaskStatus = async (id: string, status: string) => {
    if (!session) return
    try {
      await fetch('/api/admin/tasks', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setTasks((t) => t.map((x) => x.id === id ? { ...x, status, completed_at: status === 'done' ? new Date().toISOString() : null } : x))
    } catch { /* ignore */ }
  }

  const leadName = (id: string | null) => id ? (leads.find((l) => l.id === id)?.name ?? null) : null
  const openTasks = tasks.filter((t) => t.status !== 'done').length

  // ── Live reply (human takeover) ──────────────────────────────────────────
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const sendReply = async (conversationId: string) => {
    const content = replyText.trim()
    if (!content || !session || sendingReply) return
    setSendingReply(true)
    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, content }),
      })
      if (res.ok) {
        setMessages((prev) => [...prev, { conversation_id: conversationId, role: 'human', content, created_at: new Date().toISOString() }])
        setReplyText('')
      }
    } catch { /* ignore */ }
    setSendingReply(false)
  }

  // Poll the open conversation for new visitor messages (live chat)
  useEffect(() => {
    if (!selected || tab !== 'chat') return
    const convos = conversations.filter((c) => c.lead_id === selected.id)
    if (convos.length === 0) return
    const id = setInterval(async () => {
      for (const c of convos) {
        try {
          const res = await fetch(`/api/chat/messages?session_id=${encodeURIComponent(c.session_id)}`)
          const data = await res.json()
          // Only update when we actually got messages — never wipe what's loaded
          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const others = prev.filter((m) => m.conversation_id !== c.id)
              const fresh = data.messages.map((m: { role: string; content: string; created_at: string }) => ({ ...m, conversation_id: c.id }))
              return [...others, ...fresh]
            })
          }
        } catch { /* ignore */ }
      }
    }, 4000)
    return () => clearInterval(id)
  }, [selected, tab, conversations])

  const filtered = filter === 'all' ? leads : leads.filter((l) => l.status === filter)

  /* ── Loading ─────────────────────────────────────────────────────────────── */
  if (loading) return <div style={s.center}><p style={{ color: '#888' }}>Loading…</p></div>

  /* ── Login ───────────────────────────────────────────────────────────────── */
  if (!session) return (
    <div style={s.center}>
      <div style={s.loginCard}>
        <Image src="/logo.png" alt="Seliem.dev" width={60} height={60} style={{ borderRadius: 12, margin: '0 auto 16px' }} />
        <h1 style={{ color: GOLD, margin: '0 0 4px', fontSize: 22 }}>Seliem.dev Admin</h1>
        <p style={{ color: '#999', margin: '0 0 24px', fontSize: 14 }}>Sign in to manage your leads.</p>
        <button onClick={signIn} style={s.googleBtn}><span style={{ fontWeight: 600 }}>Sign in with Google</span></button>
        {authError && <p style={{ color: '#f88', marginTop: 16, fontSize: 13 }}>{authError}</p>}
      </div>
    </div>
  )

  /* ── Dashboard ───────────────────────────────────────────────────────────── */
  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo.png" alt="Seliem.dev" width={32} height={32} style={{ borderRadius: 8 }} />
          <h1 style={{ color: GOLD, margin: 0, fontSize: 18 }}>Admin</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowTasks(true)} style={s.signOutBtn}>
            📋 Tasks{openTasks > 0 ? ` (${openTasks})` : ''}
          </button>
          <span style={{ color: '#888', fontSize: 13 }}>{session.user.email}</span>
          <button onClick={signOut} style={s.signOutBtn}>Sign out</button>
        </div>
      </header>

      {/* Stats bar */}
      <div style={s.statsBar}>
        {['all', ...STATUSES].map((st) => {
          const count = st === 'all' ? leads.length : leads.filter((l) => l.status === st).length
          return (
            <button key={st} onClick={() => setFilter(st)} style={{
              ...s.statPill,
              background: filter === st ? '#222' : 'transparent',
              borderColor: filter === st ? '#444' : '#1c1c1c',
            }}>
              <span style={{ textTransform: 'capitalize' }}>{st}</span>
              <span style={{ color: '#888', fontSize: 12 }}>({count})</span>
            </button>
          )
        })}
      </div>

      {error && <div style={s.error}>{error}</div>}

      {!error && filtered.length === 0 && (
        <p style={{ color: '#777', padding: 24, textAlign: 'center' }}>
          {filter === 'all' ? "No leads yet. They'll appear here when someone chats or submits the form." : `No ${filter} leads.`}
        </p>
      )}

      {/* Lead list */}
      <div style={s.list}>
        {filtered.map((lead) => {
          const sc = STATUS_COLORS[lead.status] ?? STATUS_COLORS.new
          const convos = getLeadConversations(lead.id)
          return (
            <button key={lead.id} onClick={() => { setSelected(lead); setTab(getLeadConversations(lead.id).length > 0 ? 'chat' : 'details') }} style={s.row}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#eee' }}>
                  {lead.customer_no && <span style={{ color: '#666', fontWeight: 400, fontSize: 12, marginRight: 6 }}>#{lead.customer_no}</span>}
                  {lead.name}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(lead.duplicate_count ?? 0) > 0 && <span style={{ ...s.smallBadge, background: '#2a1a1a', color: '#e88' }} title={`${lead.duplicate_count} repeat inquir${(lead.duplicate_count ?? 0) > 1 ? 'ies' : 'y'} merged`}>⚠ possible duplicate</span>}
                  {convos.length > 0 && <span style={{ ...s.smallBadge, background: '#1a1a2a', color: '#88f' }}>💬 Chat</span>}
                  <span style={{ ...s.smallBadge, background: lead.type === 'support' ? '#1c2a3a' : '#2a2414', color: lead.type === 'support' ? '#7ab' : GOLD }}>{lead.type}</span>
                  <span style={{ ...s.smallBadge, background: sc.bg, color: sc.text }}>{lead.status}</span>
                </div>
              </div>
              <div style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
                {lead.business_name && lead.business_name !== 'N/A' ? `${lead.business_name} · ` : ''}{lead.email}
              </div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {lead.budget && <span>💰 {lead.budget}</span>}
                {lead.domain_status && <span>{DOMAIN_LABELS[lead.domain_status] ?? lead.domain_status}</span>}
                <span>{timeAgo(lead.created_at)}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Tasks drawer ───────────────────────────────────────────────────── */}
      {showTasks && (
        <div style={s.overlay} onClick={() => setShowTasks(false)}>
          <div style={s.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ color: GOLD, margin: 0, fontSize: 20 }}>📋 Tasks</h2>
              <button onClick={() => setShowTasks(false)} style={s.closeBtn}>✕</button>
            </div>

            {/* Create task */}
            <div style={{ marginBottom: 20 }}>
              <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createTask() }} placeholder="New task…" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, color: '#eee', fontSize: 14 }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} type="date" title="Due date (optional)" style={{ flex: 1, padding: '8px 10px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#eee', fontSize: 13 }} />
                <select value={newTaskLead} onChange={(e) => setNewTaskLead(e.target.value)} title="Link to a lead (optional)" style={{ flex: 1, padding: '8px 10px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#eee', fontSize: 13 }}>
                  <option value="">No lead</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button onClick={createTask} disabled={taskBusy || !newTaskTitle.trim()} style={{ ...s.actionBtn, background: GOLD, color: '#000', border: 'none', cursor: 'pointer', opacity: (taskBusy || !newTaskTitle.trim()) ? 0.4 : 1 }}>Add</button>
              </div>
            </div>

            {tasks.length === 0 && <p style={{ color: '#777', textAlign: 'center', padding: 20 }}>No tasks yet.</p>}

            <div style={{ display: 'grid', gap: 8 }}>
              {tasks.map((t) => {
                const done = t.status === 'done'
                const ln = leadName(t.lead_id)
                const overdue = !done && t.due_date && new Date(t.due_date).getTime() < Date.now()
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#141414', border: '1px solid #222', borderRadius: 10 }}>
                    <input type="checkbox" checked={done} onChange={() => setTaskStatus(t.id, done ? 'open' : 'done')} style={{ marginTop: 3, cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: done ? '#666' : '#eee', fontSize: 14, textDecoration: done ? 'line-through' : 'none' }}>{t.title}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: '#777', flexWrap: 'wrap' }}>
                        {t.due_date && <span style={{ color: overdue ? '#e88' : '#777' }}>📅 {new Date(t.due_date).toLocaleDateString()}{overdue ? ' · overdue' : ''}</span>}
                        {ln && <span>👤 {ln}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail drawer ──────────────────────────────────────────────────── */}
      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.drawer} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ color: GOLD, margin: 0, fontSize: 20 }}>{selected.name}</h2>
                <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                  {selected.email}
                  {getLeadConversations(selected.id).some((c) => c.status === 'human') && (
                    <span style={{ marginLeft: 8, color: '#6d6' }}>● live chat</span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={s.closeBtn}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #222' }}>
              {(['details', 'chat'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{ ...s.tab, borderBottomColor: tab === t ? GOLD : 'transparent', color: tab === t ? '#eee' : '#666' }}>
                  {t === 'details' ? '📋 Details' : '💬 Chat History'}
                </button>
              ))}
            </div>

            {tab === 'details' ? (
              /* ── Details tab ── */
              <div>
                {/* Status selector */}
                <div style={{ marginBottom: 16 }}>
                  <div style={s.fieldLabel}>Status</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {STATUSES.map((st) => {
                      const sc = STATUS_COLORS[st]
                      const active = selected.status === st
                      return (
                        <button key={st} onClick={() => updateLead(selected.id, { status: st })} disabled={saving} style={{
                          ...s.smallBadge, background: active ? sc.bg : 'transparent', color: active ? sc.text : '#666',
                          border: `1px solid ${active ? sc.text + '40' : '#333'}`, cursor: 'pointer', padding: '4px 10px',
                        }}>
                          {st}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Field label="Email" value={selected.email} />
                {selected.phone && selected.phone !== 'N/A' && <Field label="Phone" value={selected.phone} />}
                {selected.business_name && selected.business_name !== 'N/A' && <Field label="Business" value={selected.business_name} />}
                {selected.business_type && selected.business_type !== 'N/A' && <Field label="Business type" value={selected.business_type} />}
                {selected.budget && <Field label="Budget" value={selected.budget} />}
                {selected.goals && <Field label="Goals" value={selected.goals} />}
                <Field label="Domain" value={DOMAIN_LABELS[selected.domain_status ?? 'unknown'] ?? 'Unknown'} />
                <Field label="Source" value={selected.source ?? 'website_form'} />
                <Field label="Received" value={new Date(selected.created_at).toLocaleString()} />

                {/* Message */}
                <div style={{ marginTop: 16 }}>
                  <div style={s.fieldLabel}>Message</div>
                  <p style={{ color: '#ddd', whiteSpace: 'pre-wrap', margin: '4px 0 0', lineHeight: 1.5, fontSize: 14 }}>{selected.message}</p>
                </div>

                {/* Notes */}
                <div style={{ marginTop: 20 }}>
                  <div style={s.fieldLabel}>Notes</div>
                  <textarea
                    defaultValue={selected.notes ?? ''}
                    onBlur={(e) => { if (e.target.value !== (selected.notes ?? '')) updateLead(selected.id, { notes: e.target.value }) }}
                    placeholder="Add private notes about this lead…"
                    rows={3}
                    style={s.notesInput}
                  />
                </div>

                {/* AI summary (if from chat) */}
                {getLeadConversations(selected.id).map((c) =>
                  c.summary ? (
                    <div key={c.id} style={{ marginTop: 16, padding: 12, background: '#1a1a2a', borderRadius: 10, border: '1px solid #2a2a4a' }}>
                      <div style={{ ...s.fieldLabel, color: '#88f' }}>🤖 AI Summary</div>
                      <p style={{ color: '#ccc', fontSize: 13, margin: '4px 0 0', lineHeight: 1.5 }}>{c.summary}</p>
                    </div>
                  ) : null
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
                  <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selected.email)}&su=${encodeURIComponent('Re: Your inquiry to Seliem.dev')}&body=${encodeURIComponent(`Hi ${selected.name.split(' ')[0]},\n\nThanks for reaching out to Seliem.dev! `)}`} target="_blank" rel="noreferrer" style={s.actionBtn}>📧 Email</a>
                  {selected.phone && selected.phone !== 'N/A' && (
                    <a href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={s.actionBtn}>💬 WhatsApp</a>
                  )}
                  <a href={`tel:${selected.phone}`} target="_blank" rel="noreferrer" style={{...s.actionBtn, ...((!selected.phone || selected.phone === 'N/A') ? {opacity: 0.3, pointerEvents: 'none' as const} : {})}}>📞 Call</a>
                </div>

                {/* ── Payments ── */}
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #222' }}>
                  <div style={{ ...s.fieldLabel, marginBottom: 10 }}>💳 Payments</div>

                  {getLeadPayments(selected.id).map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', background: '#141414', border: '1px solid #222', borderRadius: 10, marginBottom: 8 }}>
                      <div>
                        <div style={{ color: '#eee', fontSize: 14 }}>${Number(p.amount).toLocaleString()} <span style={{ color: '#888', fontSize: 12 }}>· {p.description}</span></div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ ...s.smallBadge, background: p.status === 'paid' ? '#1a2a1a' : p.status === 'canceled' ? '#2a1414' : '#2a2a14', color: p.status === 'paid' ? '#4d4' : p.status === 'canceled' ? '#d66' : GOLD }}>{p.status}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {payLink(p.amount) && (
                          <button onClick={() => navigator.clipboard?.writeText(payLink(p.amount))} title="Copy PayPal link" style={{ ...s.actionBtn, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>🔗 Copy link</button>
                        )}
                        {p.status !== 'paid'
                          ? <button onClick={() => setPaymentStatus(p.id, 'paid')} style={{ ...s.actionBtn, padding: '6px 10px', fontSize: 12, cursor: 'pointer', background: '#1a2a1a', color: '#4d4', border: '1px solid #2a4a2a' }}>✓ Mark paid</button>
                          : <button onClick={() => setPaymentStatus(p.id, 'pending')} style={{ ...s.actionBtn, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>↺ Unpay</button>}
                      </div>
                    </div>
                  ))}

                  {/* Create payment request */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <input value={payDesc} onChange={(e) => setPayDesc(e.target.value)} placeholder="What for (e.g. Deposit)" style={{ flex: 2, padding: '8px 10px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#eee', fontSize: 13 }} />
                    <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="$" type="number" style={{ width: 80, padding: '8px 10px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#eee', fontSize: 13 }} />
                    <button onClick={() => createPayment(selected.id)} disabled={!payDesc.trim() || !Number(payAmount)} style={{ ...s.actionBtn, background: GOLD, color: '#000', border: 'none', padding: '8px 14px', fontSize: 13, cursor: 'pointer', opacity: (!payDesc.trim() || !Number(payAmount)) ? 0.4 : 1 }}>Request</button>
                  </div>
                  {!PAYPAL_HANDLE && <p style={{ color: '#a66', fontSize: 11, marginTop: 6 }}>⚠️ Set your PayPal.Me handle to generate pay links.</p>}
                </div>

                {/* ── Agreements ── */}
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #222' }}>
                  <div style={{ ...s.fieldLabel, marginBottom: 10 }}>📄 Agreements</div>

                  {getLeadAgreements(selected.id).map((a) => (
                    <div key={a.id} style={{ padding: '10px 12px', background: '#141414', border: '1px solid #222', borderRadius: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#eee', fontSize: 14 }}>${Number(a.price).toLocaleString()} <span style={{ color: '#888', fontSize: 12 }}>· {a.scope.slice(0, 40)}</span></span>
                        <span style={{ ...s.smallBadge, background: a.status === 'accepted' ? '#1a2a1a' : '#2a2a14', color: a.status === 'accepted' ? '#4d4' : GOLD }}>
                          {a.status === 'accepted' ? '✓ signed' : 'sent'}
                        </span>
                      </div>
                      {a.accepted_at && <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>Signed by {a.signer_name} · {new Date(a.accepted_at).toLocaleString()}</div>}
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <button onClick={() => setViewAg(viewAg === a.id ? null : a.id)} style={{ background: 'transparent', border: 'none', color: GOLD, fontSize: 12, cursor: 'pointer', padding: '6px 0 0' }}>
                          {viewAg === a.id ? '▲ Hide agreement' : '▼ View full agreement'}
                        </button>
                        <button onClick={() => downloadAgreementPdf({ ...a, clientName: selected.name })} style={{ background: 'transparent', border: 'none', color: GOLD, fontSize: 12, cursor: 'pointer', padding: '6px 0 0' }}>
                          ⬇ Download PDF
                        </button>
                      </div>
                      {viewAg === a.id && (
                        <pre style={{ marginTop: 8, padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#ccc', whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.5, fontFamily: 'inherit', maxHeight: 280, overflowY: 'auto' }}>{a.content}</pre>
                      )}
                    </div>
                  ))}

                  <div style={{ marginTop: 10 }}>
                    <textarea value={agScope} onChange={(e) => setAgScope(e.target.value)} placeholder="Agreed scope (e.g. Custom barbershop website with online booking + domain setup)" rows={2} style={{ ...s.notesInput, marginTop: 0 }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input value={agPrice} onChange={(e) => setAgPrice(e.target.value)} type="number" placeholder="Total $" style={{ width: 100, padding: '8px 10px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#eee', fontSize: 13 }} />
                      <button onClick={() => createAgreement(selected.id)} disabled={agBusy || !agScope.trim() || !Number(agPrice)} style={{ ...s.actionBtn, flex: 1, background: GOLD, color: '#000', border: 'none', cursor: 'pointer', opacity: (agBusy || !agScope.trim() || !Number(agPrice)) ? 0.4 : 1 }}>
                        {agBusy ? 'Generating…' : '✨ Generate & send agreement'}
                      </button>
                    </div>
                    <p style={{ color: '#666', fontSize: 11, marginTop: 6 }}>The AI drafts a professional agreement; the client signs it on their account.</p>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Chat history tab ── */
              <div>
                {getLeadConversations(selected.id).length === 0 ? (
                  <p style={{ color: '#666', fontSize: 14 }}>This lead came from the contact form — no chat history.</p>
                ) : (
                  getLeadConversations(selected.id).map((convo) => {
                    const msgs = getConvoMessages(convo.id)
                    return (
                      <div key={convo.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span style={{ color: '#888', fontSize: 12 }}>{new Date(convo.created_at).toLocaleString()}</span>
                          <span style={{ ...s.smallBadge, background: convo.status === 'lead_captured' ? '#1a2a1a' : '#1a1a2a', color: convo.status === 'lead_captured' ? '#6d6' : '#88f' }}>
                            {convo.status === 'lead_captured' ? '✅ Lead captured' : convo.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {msgs.map((m, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end' }}>
                              <div style={{
                                maxWidth: '85%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                                ...(m.role === 'user'
                                  ? { background: '#1c1c1c', color: '#ddd', borderBottomLeftRadius: 4 }
                                  : m.role === 'human'
                                  ? { background: '#2a4a2a', color: '#dfd', borderBottomRightRadius: 4 }
                                  : { background: GOLD, color: '#000', borderBottomRightRadius: 4 }),
                              }}>
                                {m.role === 'human' && <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>You</div>}
                                {m.role === 'assistant' && <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>🤖 Sage</div>}
                                {m.content}
                              </div>
                            </div>
                          ))}
                        </div>
                        {msgs.length === 0 && <p style={{ color: '#555', fontSize: 13 }}>No messages recorded.</p>}

                        {/* Live reply box — jump in as a human */}
                        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                          <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') sendReply(convo.id) }}
                            placeholder="Jump in and reply live…"
                            style={{ flex: 1, padding: '10px 12px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, color: '#eee', fontSize: 13 }}
                          />
                          <button
                            onClick={() => sendReply(convo.id)}
                            disabled={sendingReply || !replyText.trim()}
                            style={{ ...s.actionBtn, background: GOLD, color: '#000', border: 'none', opacity: sendingReply || !replyText.trim() ? 0.4 : 1, cursor: 'pointer' }}
                          >
                            Send
                          </button>
                        </div>
                        <p style={{ color: '#666', fontSize: 11, marginTop: 6 }}>Sending a reply takes over the chat — Sage pauses and the visitor talks to you live.</p>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={s.fieldLabel}>{label}</div>
      <div style={{ color: '#eee', fontSize: 14 }}>{value}</div>
    </div>
  )
}

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  if (d < 60_000) return 'just now'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}

/* ── Styles ────────────────────────────────────────────────────────────────── */
const s = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'system-ui, sans-serif' } as React.CSSProperties,
  center: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
  loginCard: { background: '#141414', border: '1px solid #222', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 360 } as React.CSSProperties,
  googleBtn: { background: '#fff', color: '#111', border: 'none', borderRadius: 10, padding: '12px 24px', cursor: 'pointer', width: '100%', fontSize: 15 } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #1c1c1c', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 } as React.CSSProperties,
  statsBar: { display: 'flex', gap: 6, padding: '12px 24px', overflowX: 'auto', borderBottom: '1px solid #1c1c1c' } as React.CSSProperties,
  statPill: { display: 'flex', gap: 4, alignItems: 'center', padding: '4px 12px', borderRadius: 999, border: '1px solid #1c1c1c', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' } as React.CSSProperties,
  signOutBtn: { background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 } as React.CSSProperties,
  error: { background: '#2a1414', color: '#f88', padding: '12px 24px', margin: 16, borderRadius: 8, border: '1px solid #4a2020' } as React.CSSProperties,
  list: { padding: 16, display: 'grid', gap: 10, maxWidth: 800, margin: '0 auto' } as React.CSSProperties,
  row: { textAlign: 'left', background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 16, cursor: 'pointer', color: 'inherit', width: '100%' } as React.CSSProperties,
  smallBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 999 } as React.CSSProperties,
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 } as React.CSSProperties,
  drawer: { background: '#111', borderLeft: '1px solid #222', width: 'min(480px, 100%)', height: '100%', padding: 24, overflowY: 'auto' } as React.CSSProperties,
  closeBtn: { background: 'transparent', color: '#888', border: 'none', fontSize: 18, cursor: 'pointer' } as React.CSSProperties,
  fieldLabel: { color: '#777', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 } as React.CSSProperties,
  tab: { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', padding: '8px 16px', cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' } as React.CSSProperties,
  notesInput: { width: '100%', marginTop: 4, padding: 10, background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, color: '#ddd', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 } as React.CSSProperties,
  actionBtn: { background: '#1c1c1c', color: '#eee', border: '1px solid #333', borderRadius: 8, padding: '10px 16px', textDecoration: 'none', fontSize: 14, transition: 'all 0.15s' } as React.CSSProperties,
}
