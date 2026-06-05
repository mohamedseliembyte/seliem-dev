import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase'

function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

// Throttle reply emails: at most one per conversation per 5 minutes
const emailedAt = new Map<string, number>()

async function notifyClientByEmail(conversationId: string, name: string, email: string, content: string) {
  const last = emailedAt.get(conversationId) ?? 0
  if (Date.now() - last < 5 * 60_000) return // already emailed recently
  emailedAt.set(conversationId, Date.now())

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'noreply@seliem.dev'
    const first = (name || 'there').split(' ')[0]
    await resend.emails.send({
      from,
      to: email,
      subject: 'You have a new reply from Seliem.dev',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;color:#111">
          <h2 style="color:#c9a84c;margin-bottom:16px">You've got a reply 💬</h2>
          <p style="margin:0 0 12px">Hi ${first},</p>
          <p style="margin:0 0 12px">Our team just replied to your conversation:</p>
          <div style="margin:0 0 20px;padding:14px 16px;background:#f7f7f7;border-left:3px solid #c9a84c;border-radius:6px;white-space:pre-wrap">${content.replace(/</g, '&lt;')}</div>
          <p style="margin:0 0 24px">Reply or continue the conversation here:
            <a href="https://seliem.dev/account" style="color:#c9a84c">seliem.dev/account</a>
          </p>
          <p style="margin:0;color:#888;font-size:13px">— The Seliem.dev Team</p>
        </div>`,
    })
  } catch (err) {
    console.error('[reply] email notify failed:', err instanceof Error ? err.message : String(err))
  }
}

// POST { conversation_id, content } — admin sends a live reply as a human.
// Inserting a 'human' message takes over the conversation (pauses the AI).
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Database not configured.' }, { status: 500 })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = userData.user.email.toLowerCase()
  const admins = allowedAdmins()
  if (admins.length > 0 && !admins.includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { conversation_id?: string; content?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const conversationId = (body.conversation_id ?? '').trim()
  const content = (body.content ?? '').trim()
  if (!conversationId || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, role: 'human', content })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('conversations').update({ status: 'human', updated_at: new Date().toISOString() }).eq('id', conversationId)

  // Notify the client by email (in case they're offline) — look up their lead
  const { data: convo } = await supabase
    .from('conversations')
    .select('lead_id')
    .eq('id', conversationId)
    .maybeSingle()
  if (convo?.lead_id) {
    const { data: lead } = await supabase
      .from('leads')
      .select('name, email')
      .eq('id', convo.lead_id)
      .maybeSingle()
    if (lead?.email) void notifyClientByEmail(conversationId, lead.name ?? '', lead.email, content)
  }

  return NextResponse.json({ success: true })
}
