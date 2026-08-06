import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendTelegramMessage } from '@/lib/telegram'

// Comma-separated list of Google emails allowed into the admin.
function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/** Verify the caller's JWT and check against the allow-list. Returns email or a Response. */
async function authorize(
  req: NextRequest,
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
): Promise<string | NextResponse> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = data.user.email.toLowerCase()
  const admins = allowedAdmins()
  if (admins.length === 0 || !admins.includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return email
}

// ── GET /api/admin/leads — return leads + linked conversations ────────────────
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Database not configured.' }, { status: 500 })

  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  // Leads
  const { data: leads, error: lErr } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

  // Conversations with their messages
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, session_id, status, summary, lead_id, created_at, updated_at, human_takeover')
    .order('created_at', { ascending: false })
    .limit(200)

  // Messages for all conversations (batched)
  const convoIds = (conversations ?? []).map((c) => c.id)
  let messages: { conversation_id: string; role: string; content: string; created_at: string }[] = []
  if (convoIds.length > 0) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, role, content, created_at')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: true })
      .limit(2000)
    messages = msgs ?? []
  }

  // Payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  // Agreements (include full content so the signed contract is on record)
  const { data: agreements } = await supabase
    .from('agreements')
    .select('id, lead_id, scope, price, content, status, created_at, accepted_at, signer_name')
    .order('created_at', { ascending: false })
    .limit(500)

  // Newest VISITOR (role='user') message timestamp per lead → drives "unread".
  // Use a dedicated DESC query (the shared `messages` query above is ASC-limited
  // for transcript rendering, so its newest rows can be truncated at scale).
  const convoToLead = new Map<string, string>()
  for (const c of conversations ?? []) if (c.lead_id) convoToLead.set(c.id, c.lead_id)
  const lastVisitorAt: Record<string, string> = {}
  if (convoIds.length > 0) {
    const { data: vmsgs } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .in('conversation_id', convoIds)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(2000)
    for (const m of vmsgs ?? []) {
      const leadId = convoToLead.get(m.conversation_id)
      if (!leadId) continue
      if (!lastVisitorAt[leadId] || m.created_at > lastVisitorAt[leadId]) lastVisitorAt[leadId] = m.created_at
    }
  }

  return NextResponse.json({
    leads: leads ?? [],
    conversations: conversations ?? [],
    messages,
    payments: payments ?? [],
    agreements: agreements ?? [],
    lastVisitorAt,
    admin: auth,
  })
}

// ── POST /api/admin/leads — add a client by hand ──────────────────────────────
// Clients who arrived by phone, referral or a friend never filled in the
// contact form, so they have no record — and without one they cannot be given
// an agreement, an invoice, a reminder or a pause. This creates that record.
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Database not configured.' }, { status: 500 })

  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const str = (v: unknown, max: number) =>
    typeof v === 'string' && !/[\u0000-\u001f]/.test(v) ? v.trim().slice(0, max) : ''

  const name = str(body.name, 120)
  const email = str(body.email, 200)
  if (name.length < 2) return NextResponse.json({ error: 'A name is required.' }, { status: 400 })
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })

  // Don't silently create a second record for someone already in the system —
  // duplicate clients mean duplicate invoices and reminders.
  const { data: existing } = await supabase.from('leads').select('id, name').ilike('email', email).maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: `${existing.name || 'A client'} already exists with that email.`, id: existing.id },
      { status: 409 },
    )
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      name,
      email,
      phone: str(body.phone, 60) || null,
      business_name: str(body.business_name, 160) || null,
      project_name: str(body.project_name, 160) || null,
      business_type: str(body.business_type, 100) || null,
      budget: str(body.budget, 60) || null,
      message: str(body.message, 4000) || 'Added manually from the admin.',
      type: 'project',
      source: 'manual',
      status: str(body.status, 40) || 'new',
      read_at: new Date().toISOString(), // added by hand, so it is already "seen"
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}

// ── PATCH /api/admin/leads — update a lead's status, notes, domain_status, website ──
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Database not configured.' }, { status: 500 })

  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const id = body.id as string | undefined
  if (!id) return NextResponse.json({ error: 'Missing lead id' }, { status: 400 })

  // Only allow specific safe fields to be updated
  const allowed = ['status', 'notes', 'domain_status'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  // `read: true` marks the lead read (read_at = now); `read: false` clears it.
  if (body.read !== undefined) {
    updates.read_at = body.read ? new Date().toISOString() : null
  }

  // Project suspension. Pausing is advisory — it records the decision, shows the
  // client a notice, and flips what a delivered site sees from /api/project-status.
  // Nothing is deleted, so resuming is instant the moment they pay.
  let suspensionChange: 'paused' | 'active' | null = null
  if (body.project_status !== undefined) {
    const next = body.project_status
    if (next !== 'active' && next !== 'paused') {
      return NextResponse.json({ error: 'project_status must be active or paused.' }, { status: 400 })
    }
    updates.project_status = next
    updates.paused_at = next === 'paused' ? new Date().toISOString() : null
    updates.paused_reason =
      next === 'paused' ? (typeof body.paused_reason === 'string' ? body.paused_reason.slice(0, 300) : 'Non-payment') : null
    suspensionChange = next
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase.from('leads').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (suspensionChange) {
    const { data: lead } = await supabase.from('leads').select('name, project_name').eq('id', id).maybeSingle()
    const label = lead?.project_name || lead?.name || 'a project'
    await sendTelegramMessage(
      suspensionChange === 'paused'
        ? `⏸️ <b>Project paused</b>\n\n${label}\nReason: ${updates.paused_reason}`
        : `▶️ <b>Project resumed</b>\n\n${label} is live again.`,
    ).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
