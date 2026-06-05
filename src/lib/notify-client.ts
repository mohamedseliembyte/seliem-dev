import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase'

// Throttle: at most one notification email per conversation per 5 minutes
const emailedAt = new Map<string, number>()

// If the visitor's last message is older than this, treat them as "offline"
const OFFLINE_AFTER_MS = 2 * 60_000

/**
 * Email the client a notification about a new reply — but only if they appear
 * offline (haven't sent a message recently) and we know their email.
 * Used for both AI and human replies. Never throws.
 */
export async function maybeEmailClientReply(conversationId: string, content: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return

    // Throttle
    const last = emailedAt.get(conversationId) ?? 0
    if (Date.now() - last < 5 * 60_000) return

    // Find the visitor's most recent message — proxy for "are they active?"
    const { data: lastUserMsg } = await supabase
      .from('messages')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastUserMsg?.created_at) {
      const age = Date.now() - new Date(lastUserMsg.created_at).getTime()
      if (age < OFFLINE_AFTER_MS) return // visitor is actively chatting — don't email
    }

    // Need a lead email to notify
    const { data: convo } = await supabase
      .from('conversations')
      .select('lead_id')
      .eq('id', conversationId)
      .maybeSingle()
    if (!convo?.lead_id) return

    const { data: lead } = await supabase
      .from('leads')
      .select('name, email')
      .eq('id', convo.lead_id)
      .maybeSingle()
    if (!lead?.email) return

    emailedAt.set(conversationId, Date.now())

    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'noreply@seliem.dev'
    const first = (lead.name || 'there').split(' ')[0]
    await resend.emails.send({
      from,
      to: lead.email,
      subject: 'You have a new reply from Seliem.dev',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;color:#111">
          <h2 style="color:#c9a84c;margin-bottom:16px">You've got a reply 💬</h2>
          <p style="margin:0 0 12px">Hi ${first},</p>
          <p style="margin:0 0 12px">There's a new message in your Seliem.dev conversation:</p>
          <div style="margin:0 0 20px;padding:14px 16px;background:#f7f7f7;border-left:3px solid #c9a84c;border-radius:6px;white-space:pre-wrap">${content.replace(/</g, '&lt;')}</div>
          <p style="margin:0 0 24px">Continue the conversation here:
            <a href="https://seliem.dev/account" style="color:#c9a84c">seliem.dev/account</a>
          </p>
          <p style="margin:0;color:#888;font-size:13px">— The Seliem.dev Team</p>
        </div>`,
    })
  } catch (err) {
    console.error('[notify-client] failed:', err instanceof Error ? err.message : String(err))
  }
}
