import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

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
  if (admins.length > 0 && !admins.includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
    .select('id, session_id, status, summary, lead_id, created_at, updated_at')
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

  return NextResponse.json({
    leads: leads ?? [],
    conversations: conversations ?? [],
    messages,
    payments: payments ?? [],
    admin: auth,
  })
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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase.from('leads').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
