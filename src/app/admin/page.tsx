'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-client'
import { googlePopupSignIn, exchangeGoogleToken } from '@/lib/google-auth'
import { downloadAgreementPdf } from '@/lib/agreement-pdf'
import { downloadInvoicePdf } from '@/lib/invoice-pdf'

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
  read_at?: string | null
}

type Conversation = {
  id: string
  session_id: string
  status: string
  summary: string | null
  lead_id: string | null
  created_at: string
  human_takeover?: boolean
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

type EmailDraft = { id: string; to_email: string; to_name: string | null; subject: string; body: string }

type Invoice = {
  id: string
  invoice_no: number | null
  lead_id: string | null
  items: { description: string; amount: number }[]
  total: number
  currency: string
  status: string
  notes: string | null
  due_date: string | null
  created_at: string
  paid_at: string | null
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
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [tab, setTab] = useState<'details' | 'chat'>('details')
  const [filter, setFilter] = useState<string>('all')
  const [saving, setSaving] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastVisitorAt, setLastVisitorAt] = useState<Record<string, string>>({})
  const [origin, setOrigin] = useState<'all' | 'forms' | 'chat'>('all')

  const loadData = useCallback(async (token: string) => {
    setError(null)
    try {
      const res = await fetch('/api/admin/leads', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 403) { setError("This Google account isn't authorized."); return }
      if (!res.ok) { setError('Failed to load.'); return }
      const data = await res.json()
      setLeads(data.leads ?? [])
      setLastVisitorAt(data.lastVisitorAt ?? {})
      setConversations(data.conversations ?? [])
      setMessages(data.messages ?? [])
      setPayments(data.payments ?? [])
      setAgreements(data.agreements ?? [])
      // Tasks + invoices live on separate routes
      try {
        const tRes = await fetch('/api/admin/tasks', { headers: { Authorization: `Bearer ${token}` } })
        if (tRes.ok) { const t = await tRes.json(); setTasks(t.tasks ?? []) }
      } catch { /* tasks are optional */ }
      try {
        const iRes = await fetch('/api/admin/invoices', { headers: { Authorization: `Bearer ${token}` } })
        if (iRes.ok) { const i = await iRes.json(); setInvoices(i.invoices ?? []) }
      } catch { /* invoices are optional */ }
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

  // ── Invoices ───────────────────────────────────────────────────────────────
  const getLeadInvoices = (leadId: string) => invoices.filter((i) => i.lead_id === leadId)
  const [invDesc, setInvDesc] = useState('')
  const [invAmount, setInvAmount] = useState('')
  const [invBusy, setInvBusy] = useState(false)

  const createLeadInvoice = async (leadId: string) => {
    if (!session || !invDesc.trim() || !Number(invAmount) || invBusy) return
    setInvBusy(true)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, items: [{ description: invDesc.trim(), amount: Number(invAmount) }], status: 'sent' }),
      })
      const data = await res.json()
      if (data.invoice) { setInvoices((p) => [data.invoice, ...p]); setInvDesc(''); setInvAmount('') }
    } catch { /* ignore */ }
    setInvBusy(false)
  }

  const setInvoiceStatus = async (id: string, status: string) => {
    if (!session) return
    try {
      await fetch('/api/admin/invoices', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setInvoices((p) => p.map((x) => x.id === id ? { ...x, status, paid_at: status === 'paid' ? new Date().toISOString() : null } : x))
    } catch { /* ignore */ }
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

  // ── Ask Sage (admin AI assistant) ───────────────────────────────────────────
  const [showAssistant, setShowAssistant] = useState(false)
  const [askQ, setAskQ] = useState('')
  const [askBusy, setAskBusy] = useState(false)
  const [askMsgs, setAskMsgs] = useState<{ role: 'you' | 'sage'; text: string; draft?: EmailDraft }[]>([])
  const [draftBusy, setDraftBusy] = useState<string | null>(null)
  const [draftDone, setDraftDone] = useState<Record<string, string>>({}) // draftId -> 'sent' | 'cancelled' | error

  const askSage = async () => {
    const question = askQ.trim()
    if (!session || !question || askBusy) return
    setAskQ('')
    setAskMsgs((m) => [...m, { role: 'you', text: question }])
    setAskBusy(true)
    try {
      const res = await fetch('/api/admin/assistant', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setAskMsgs((m) => [...m, { role: 'sage', text: data.text || data.error || 'No answer.', draft: data.draft }])
    } catch {
      setAskMsgs((m) => [...m, { role: 'sage', text: "Couldn't reach the server — try again." }])
    }
    setAskBusy(false)
  }

  const approveDraft = async (d: EmailDraft) => {
    if (!session || draftBusy) return
    setDraftBusy(d.id)
    try {
      const res = await fetch('/api/admin/assistant/send-draft', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: d.id }),
      })
      const data = await res.json()
      setDraftDone((prev) => ({ ...prev, [d.id]: res.ok && data.sent ? 'sent' : (data.error || 'Failed to send') }))
    } catch {
      setDraftDone((prev) => ({ ...prev, [d.id]: 'Network error' }))
    }
    setDraftBusy(null)
  }
  const cancelDraft = (d: EmailDraft) => setDraftDone((prev) => ({ ...prev, [d.id]: 'cancelled' }))

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
        // Replying takes over the chat — reflect that locally so the AI shows paused.
        setConversations((prev) => prev.map((c) => c.id === conversationId ? { ...c, human_takeover: true, status: 'human' } : c))
        setReplyText('')
      }
    } catch { /* ignore */ }
    setSendingReply(false)
  }

  // Toggle who's driving a conversation: human (AI paused) vs AI (Sage resumes).
  const setChatMode = async (conversationId: string, takeover: boolean) => {
    if (!session) return
    try {
      await fetch('/api/admin/chat-mode', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, human_takeover: takeover }),
      })
      setConversations((prev) => prev.map((c) => c.id === conversationId ? { ...c, human_takeover: takeover, status: takeover ? 'human' : 'active' } : c))
    } catch { /* ignore */ }
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
            // Keep unread state accurate: record the newest visitor message time
            // for this lead so it re-flags unread once the drawer closes.
            const leadId = c.lead_id
            const newestUser = (data.messages as { role: string; created_at: string }[])
              .filter((m) => m.role === 'user')
              .reduce((max: string, m) => (m.created_at > max ? m.created_at : max), '')
            if (leadId && newestUser) {
              setLastVisitorAt((prev) => (!prev[leadId] || newestUser > prev[leadId] ? { ...prev, [leadId]: newestUser } : prev))
            }
          }
        } catch { /* ignore */ }
      }
    }, 4000)
    return () => clearInterval(id)
  }, [selected, tab, conversations])

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime()
    if (dateFrom && t < new Date(dateFrom).getTime()) return false
    if (dateTo && t > new Date(dateTo).getTime() + 86_400_000) return false // include the whole end day
    return true
  }

  // ── Unread: no read_at yet, or a newer visitor message arrived since ────────
  const isUnread = useCallback((lead: Lead) => {
    if (!lead.read_at) return true
    const lv = lastVisitorAt[lead.id]
    return !!lv && lv > lead.read_at
  }, [lastVisitorAt])
  const unreadCount = leads.filter(isUnread).length

  // ── Origin: chat-originated leads have a linked conversation; forms don't ───
  const chatLeadIds = useMemo(
    () => new Set(conversations.map((c) => c.lead_id).filter(Boolean) as string[]),
    [conversations],
  )
  const isFormLead = (l: Lead) => !chatLeadIds.has(l.id)
  const matchesOrigin = (l: Lead) => origin === 'all' || (origin === 'forms' ? isFormLead(l) : !isFormLead(l))

  const filtered = leads.filter((l) =>
    (filter === 'all' ? true : filter === 'unread' ? isUnread(l) : l.status === filter)
    && inRange(l.created_at)
    && matchesOrigin(l),
  )

  // Mark a lead read when opened (optimistic + server PATCH; survives reloads).
  const markRead = useCallback((lead: Lead) => {
    if (!session || (lead.read_at && !(lastVisitorAt[lead.id] && lastVisitorAt[lead.id] > lead.read_at))) return
    const now = new Date().toISOString()
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, read_at: now } : l))
    fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, read: true }),
    }).catch(() => {})
  }, [session, lastVisitorAt])

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const bulkSetStatus = async (status: string) => {
    const ids = Array.from(selectedIds)
    for (const id of ids) await updateLead(id, { status })
    setSelectedIds(new Set())
  }

  const exportCsv = () => {
    const cols = ['customer_no', 'name', 'email', 'phone', 'business_name', 'business_type', 'budget', 'type', 'status', 'domain_status', 'duplicate_count', 'goals', 'message', 'created_at'] as const
    const cell = (v: unknown) => { const str = String(v ?? ''); return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str }
    const csv = [cols.join(','), ...filtered.map((l) => cols.map((c) => cell((l as Record<string, unknown>)[c])).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Loading ─────────────────────────────────────────────────────────────── */
  if (loading) return <div style={s.center}><p style={{ color: '#888' }}>Loading…</p></div>

  /* ── Login ───────────────────────────────────────────────────────────────── */
  if (!session) return (
    <div style={s.center}>
      <div style={s.loginCard}>
        <Image src="/logo.png" alt="Seliem.dev" width={60} height={60} style={{ borderRadius: 12, margin: '0 auto 16px' }} />
        <h1 className="gold-text" style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Seliem.dev Admin</h1>
        <p style={{ color: '#999', margin: '0 0 24px', fontSize: 14 }}>Sign in to manage your leads.</p>
        <button onClick={signIn} className="sheen" style={s.googleBtn}><span style={{ fontWeight: 600 }}>Sign in with Google</span></button>
        {authError && <p style={{ color: '#f88', marginTop: 16, fontSize: 13 }}>{authError}</p>}
      </div>
    </div>
  )

  /* ── Dashboard ───────────────────────────────────────────────────────────── */
  return (
    <div className="hero-grid" style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo.png" alt="Seliem.dev" width={32} height={32} style={{ borderRadius: 8, boxShadow: '0 0 0 1px rgba(201,168,76,0.3)' }} />
          <h1 className="gold-text" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Admin</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowAssistant(true)} style={s.signOutBtn}>🤖 Ask Sage</button>
          <button onClick={() => setShowTasks(true)} style={s.signOutBtn}>
            📋 Tasks{openTasks > 0 ? ` (${openTasks})` : ''}
          </button>
          <span style={{ color: '#888', fontSize: 13 }}>{session.user.email}</span>
          <button onClick={signOut} style={s.signOutBtn}>Sign out</button>
        </div>
      </header>

      {/* Stats bar */}
      <div style={s.statsBar}>
        {['all', 'unread', ...STATUSES].map((st) => {
          const count = st === 'all' ? leads.length : st === 'unread' ? unreadCount : leads.filter((l) => l.status === st).length
          return (
            <button key={st} onClick={() => setFilter(st)} style={{
              ...s.statPill,
              background: filter === st ? 'rgba(201,168,76,0.12)' : 'transparent',
              borderColor: filter === st ? 'rgba(201,168,76,0.5)' : '#1c1c1c',
              color: filter === st ? GOLD : '#ccc',
            }}>
              {st === 'unread' && unreadCount > 0 && <span style={{ width: 7, height: 7, borderRadius: 999, background: GOLD, display: 'inline-block' }} />}
              <span style={{ textTransform: 'capitalize' }}>{st}</span>
              <span style={{ color: st === 'unread' && unreadCount > 0 ? GOLD : '#888', fontSize: 12 }}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* Filter + export toolbar */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 24px', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid #1c1c1c' }}>
        <span style={{ color: '#777', fontSize: 12 }}>Date range:</span>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={s.dateInput} />
        <span style={{ color: '#555' }}>→</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={s.dateInput} />
        {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo('') }} style={s.signOutBtn}>Clear</button>}
        <span style={{ color: '#666', fontSize: 12 }}>{filtered.length} shown</span>
        <button onClick={exportCsv} disabled={filtered.length === 0} style={{ ...s.signOutBtn, marginLeft: 'auto', opacity: filtered.length === 0 ? 0.4 : 1 }}>⬇ Export CSV</button>
      </div>

      {/* Origin filter: forms vs chat-originated leads */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 24px', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid #1c1c1c' }}>
        <span style={{ color: '#777', fontSize: 12, marginRight: 4 }}>Origin:</span>
        {([['all', 'All'], ['forms', '📝 Forms'], ['chat', '💬 Chat']] as const).map(([key, label]) => {
          const count = key === 'all' ? leads.length : key === 'forms' ? leads.filter(isFormLead).length : leads.filter((l) => !isFormLead(l)).length
          return (
            <button key={key} onClick={() => setOrigin(key)} style={{
              ...s.statPill,
              background: origin === key ? 'rgba(201,168,76,0.12)' : 'transparent',
              borderColor: origin === key ? 'rgba(201,168,76,0.5)' : '#1c1c1c',
              color: origin === key ? GOLD : '#ccc',
            }}>
              <span>{label}</span><span style={{ color: '#888', fontSize: 12 }}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 24px', alignItems: 'center', flexWrap: 'wrap', background: '#15150c', borderBottom: '1px solid #2a2a14' }}>
          <span style={{ color: GOLD, fontSize: 13 }}>{selectedIds.size} selected — set status:</span>
          {STATUSES.map((st) => (
            <button key={st} onClick={() => bulkSetStatus(st)} disabled={saving} style={{ ...s.smallBadge, background: STATUS_COLORS[st].bg, color: STATUS_COLORS[st].text, border: '1px solid #333', cursor: 'pointer', padding: '4px 10px' }}>{st}</button>
          ))}
          <button onClick={() => setSelectedIds(new Set())} style={{ ...s.signOutBtn, marginLeft: 'auto' }}>Clear selection</button>
        </div>
      )}

      {error && <div style={s.error}>{error}</div>}

      {!error && filtered.length === 0 && (
        <p style={{ color: '#777', padding: 24, textAlign: 'center' }}>
          {origin === 'forms' ? 'No form submissions match these filters.'
            : origin === 'chat' ? 'No chat leads match these filters.'
            : filter === 'unread' ? 'All caught up — nothing unread. ✅'
            : filter === 'all' ? "No leads yet. They'll appear here when someone chats or submits the form."
            : `No ${filter} leads.`}
        </p>
      )}

      {/* Lead list */}
      <div style={s.list}>
        {filtered.map((lead) => {
          const sc = STATUS_COLORS[lead.status] ?? STATUS_COLORS.new
          const convos = getLeadConversations(lead.id)
          return (
            <div key={lead.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
            <input
              type="checkbox"
              checked={selectedIds.has(lead.id)}
              onChange={() => toggleSelect(lead.id)}
              title="Select for bulk action"
              style={{ marginTop: 18, cursor: 'pointer' }}
            />
            <button onClick={() => { markRead(lead); setSelected(lead); setTab(getLeadConversations(lead.id).length > 0 ? 'chat' : 'details') }} className="card-lift" style={{ ...s.row, flex: 1, border: isUnread(lead) ? '1px solid rgba(201,168,76,0.35)' : (s.row.border as string) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#eee' }}>
                  {isUnread(lead) && <span title="Unread" style={{ width: 8, height: 8, borderRadius: 999, background: GOLD, display: 'inline-block', marginRight: 8, boxShadow: '0 0 6px rgba(201,168,76,0.6)' }} />}
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
            </div>
          )
        })}
      </div>

      {/* ── Ask Sage drawer (admin AI assistant) ───────────────────────────── */}
      {showAssistant && (
        <div style={s.overlay} onClick={() => setShowAssistant(false)}>
          <div style={s.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 className="gold-text" style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🤖 Ask Sage</h2>
              <button onClick={() => setShowAssistant(false)} style={s.closeBtn}>✕</button>
            </div>
            <p style={{ color: '#777', fontSize: 12, marginTop: 0, marginBottom: 16 }}>
              Your private business assistant. Ask about leads, clients & their preferences, who hasn&apos;t paid, what to focus on…
            </p>

            <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
              {askMsgs.length === 0 && (
                <div style={{ color: '#666', fontSize: 13, lineHeight: 1.6 }}>
                  Try: <em>&quot;What does the newest lead want?&quot;</em> · <em>&quot;Who hasn&apos;t paid?&quot;</em> · <em>&quot;Summarize this week&apos;s leads&quot;</em>
                </div>
              )}
              {askMsgs.map((m, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: m.role === 'you' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '88%', padding: '10px 13px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                      ...(m.role === 'you'
                        ? { background: GOLD, color: '#000', borderBottomRightRadius: 4 }
                        : { background: '#161616', color: '#ddd', border: '1px solid #222', borderBottomLeftRadius: 4 }),
                    }}>
                      {m.role === 'sage' && <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 3 }}>🤖 Sage</div>}
                      {m.text}
                    </div>
                  </div>

                  {/* Email draft confirm card — nothing sends without this click */}
                  {m.draft && (
                    <div style={{ marginTop: 8, padding: 14, background: '#0f0f0a', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 12 }}>
                      <div style={{ ...s.fieldLabel, color: GOLD, marginBottom: 8 }}>📧 Email draft — review before sending</div>
                      <div style={{ fontSize: 13, color: '#ddd', marginBottom: 4 }}><span style={{ color: '#888' }}>To:</span> {m.draft.to_name || m.draft.to_email} <span style={{ color: '#777' }}>({m.draft.to_email})</span></div>
                      <div style={{ fontSize: 13, color: '#ddd', marginBottom: 8 }}><span style={{ color: '#888' }}>Subject:</span> {m.draft.subject}</div>
                      <pre style={{ margin: 0, padding: 10, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#ccc', whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.5, fontFamily: 'inherit', maxHeight: 200, overflowY: 'auto' }}>{m.draft.body}</pre>
                      {draftDone[m.draft.id] ? (
                        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: draftDone[m.draft.id] === 'sent' ? '#4d4' : draftDone[m.draft.id] === 'cancelled' ? '#999' : '#e88' }}>
                          {draftDone[m.draft.id] === 'sent' ? '✅ Sent to the client.' : draftDone[m.draft.id] === 'cancelled' ? '❌ Cancelled — nothing sent.' : `❌ ${draftDone[m.draft.id]}`}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button onClick={() => approveDraft(m.draft!)} disabled={draftBusy === m.draft.id} style={{ ...s.actionBtn, flex: 1, background: GOLD, color: '#000', border: 'none', cursor: 'pointer', opacity: draftBusy === m.draft.id ? 0.5 : 1 }}>
                            {draftBusy === m.draft.id ? 'Sending…' : '✅ Approve & send'}
                          </button>
                          <button onClick={() => cancelDraft(m.draft!)} style={{ ...s.actionBtn, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {askBusy && <div style={{ color: '#888', fontSize: 13 }}>Sage is thinking…</div>}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={askQ}
                onChange={(e) => setAskQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') askSage() }}
                placeholder="Ask about your business…"
                style={{ flex: 1, padding: '10px 12px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, color: '#eee', fontSize: 13 }}
              />
              <button onClick={askSage} disabled={askBusy || !askQ.trim()} style={{ ...s.actionBtn, background: GOLD, color: '#000', border: 'none', cursor: 'pointer', opacity: (askBusy || !askQ.trim()) ? 0.4 : 1 }}>Ask</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tasks drawer ───────────────────────────────────────────────────── */}
      {showTasks && (
        <div style={s.overlay} onClick={() => setShowTasks(false)}>
          <div style={s.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="gold-text" style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📋 Tasks</h2>
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
                // Comparing with wall-clock time is intentional for this live admin view.
                // eslint-disable-next-line react-hooks/purity
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
                <h2 className="gold-text" style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{selected.name}</h2>
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

                {/* ── Invoices ── */}
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #222' }}>
                  <div style={{ ...s.fieldLabel, marginBottom: 10 }}>🧾 Invoices</div>

                  {getLeadInvoices(selected.id).map((inv) => (
                    <div key={inv.id} style={{ padding: '10px 12px', background: '#141414', border: '1px solid #222', borderRadius: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#eee', fontSize: 14 }}>
                          <span style={{ color: '#666', fontSize: 12, marginRight: 6 }}>#{inv.invoice_no}</span>
                          ${Number(inv.total).toLocaleString()}
                          <span style={{ color: '#888', fontSize: 12 }}> · {(inv.items?.[0]?.description ?? '').slice(0, 30)}{(inv.items?.length ?? 0) > 1 ? ` +${inv.items.length - 1} more` : ''}</span>
                        </span>
                        <span style={{ ...s.smallBadge, background: inv.status === 'paid' ? '#1a2a1a' : inv.status === 'void' ? '#2a1414' : '#2a2a14', color: inv.status === 'paid' ? '#4d4' : inv.status === 'void' ? '#d66' : GOLD }}>{inv.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 6 }}>
                        <button onClick={() => downloadInvoicePdf({ ...inv, clientName: selected.name, clientEmail: selected.email })} style={{ background: 'transparent', border: 'none', color: GOLD, fontSize: 12, cursor: 'pointer', padding: 0 }}>⬇ Download PDF</button>
                        {inv.status === 'draft' && <button onClick={() => setInvoiceStatus(inv.id, 'sent')} style={{ background: 'transparent', border: 'none', color: '#6bd', fontSize: 12, cursor: 'pointer', padding: 0 }}>📤 Send to client</button>}
                        {inv.status !== 'paid'
                          ? <button onClick={() => setInvoiceStatus(inv.id, 'paid')} style={{ background: 'transparent', border: 'none', color: '#4d4', fontSize: 12, cursor: 'pointer', padding: 0 }}>✓ Mark paid</button>
                          : <button onClick={() => setInvoiceStatus(inv.id, 'sent')} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', padding: 0 }}>↺ Unpay</button>}
                        {inv.status !== 'void' && <button onClick={() => setInvoiceStatus(inv.id, 'void')} style={{ background: 'transparent', border: 'none', color: '#a66', fontSize: 12, cursor: 'pointer', padding: 0 }}>Void</button>}
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <input value={invDesc} onChange={(e) => setInvDesc(e.target.value)} placeholder="Line item (e.g. Website design)" style={{ flex: 2, padding: '8px 10px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#eee', fontSize: 13 }} />
                    <input value={invAmount} onChange={(e) => setInvAmount(e.target.value)} type="number" placeholder="$" style={{ width: 90, padding: '8px 10px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#eee', fontSize: 13 }} />
                    <button onClick={() => createLeadInvoice(selected.id)} disabled={invBusy || !invDesc.trim() || !Number(invAmount)} style={{ ...s.actionBtn, background: GOLD, color: '#000', border: 'none', padding: '8px 14px', fontSize: 13, cursor: 'pointer', opacity: (invBusy || !invDesc.trim() || !Number(invAmount)) ? 0.4 : 1 }}>Invoice</button>
                  </div>
                  <p style={{ color: '#666', fontSize: 11, marginTop: 6 }}>{`Single line item here, or tell Sage e.g. "invoice ${selected.name.split(' ')[0]} $500 deposit + $500 on completion".`}</p>
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

                        {/* AI vs human mode control */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: '#0f0f0f', border: '1px solid #1c1c1c', borderRadius: 10 }}>
                          <span style={{ fontSize: 12, color: convo.human_takeover ? '#6d6' : '#88f' }}>
                            {convo.human_takeover ? '✍️ You\'re handling this chat — Sage paused' : '🤖 Sage is handling this chat'}
                          </span>
                          {convo.human_takeover ? (
                            <button onClick={() => setChatMode(convo.id, false)} style={{ ...s.actionBtn, marginLeft: 'auto', padding: '6px 12px', fontSize: 12, cursor: 'pointer', background: '#1a2a1a', color: '#4d4', border: '1px solid #2a4a2a' }}>🤖 Let AI handle the rest</button>
                          ) : (
                            <button onClick={() => setChatMode(convo.id, true)} style={{ ...s.actionBtn, marginLeft: 'auto', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>✍️ Jump in (pause AI)</button>
                          )}
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
                          {convo.human_takeover && (
                            <button
                              onClick={() => setChatMode(convo.id, false)}
                              title="Hand this conversation back to Sage"
                              style={{ ...s.actionBtn, background: '#1a2a1a', color: '#4d4', border: '1px solid #2a4a2a', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              🤖 Let AI handle the rest
                            </button>
                          )}
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
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' } as React.CSSProperties,
  center: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } as React.CSSProperties,
  loginCard: { background: 'linear-gradient(180deg,#171717,#0e0e0e)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 360, boxShadow: '0 24px 60px -20px rgba(0,0,0,0.7)' } as React.CSSProperties,
  googleBtn: { background: 'linear-gradient(135deg,#c9a84c,#f5d485)', color: '#000', border: 'none', borderRadius: 12, padding: '12px 24px', cursor: 'pointer', width: '100%', fontSize: 15, fontWeight: 600 } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(8px)', zIndex: 10 } as React.CSSProperties,
  statsBar: { display: 'flex', gap: 8, padding: '14px 24px', overflowX: 'auto', borderBottom: '1px solid #141414' } as React.CSSProperties,
  statPill: { display: 'flex', gap: 6, alignItems: 'center', padding: '6px 14px', borderRadius: 999, border: '1px solid #1c1c1c', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', transition: 'all .15s' } as React.CSSProperties,
  signOutBtn: { background: 'transparent', color: '#aaa', border: '1px solid #2a2a2a', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 13, transition: 'all .15s' } as React.CSSProperties,
  error: { background: '#2a1414', color: '#f88', padding: '12px 24px', margin: 16, borderRadius: 12, border: '1px solid #4a2020' } as React.CSSProperties,
  list: { padding: 20, display: 'grid', gap: 12, maxWidth: 820, margin: '0 auto' } as React.CSSProperties,
  row: { textAlign: 'left', background: 'linear-gradient(180deg,#161616,#121212)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 18, cursor: 'pointer', color: 'inherit', width: '100%' } as React.CSSProperties,
  smallBadge: { fontSize: 11, padding: '3px 9px', borderRadius: 999, fontWeight: 500 } as React.CSSProperties,
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 } as React.CSSProperties,
  drawer: { background: 'linear-gradient(180deg,#141414,#0d0d0d)', borderLeft: '1px solid rgba(255,255,255,0.08)', width: 'min(500px, 100%)', height: '100%', padding: 24, overflowY: 'auto', boxShadow: '-24px 0 60px -20px rgba(0,0,0,0.8)' } as React.CSSProperties,
  closeBtn: { background: 'rgba(255,255,255,0.05)', color: '#aaa', border: '1px solid #2a2a2a', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', lineHeight: 1 } as React.CSSProperties,
  fieldLabel: { color: '#777', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 } as React.CSSProperties,
  tab: { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', padding: '8px 16px', cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' } as React.CSSProperties,
  notesInput: { width: '100%', marginTop: 4, padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 12, color: '#ddd', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 } as React.CSSProperties,
  actionBtn: { background: '#1c1c1c', color: '#eee', border: '1px solid #333', borderRadius: 10, padding: '10px 16px', textDecoration: 'none', fontSize: 14, transition: 'all .15s' } as React.CSSProperties,
  dateInput: { background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#ddd', fontSize: 13, padding: '6px 10px', colorScheme: 'dark' } as React.CSSProperties,
}
