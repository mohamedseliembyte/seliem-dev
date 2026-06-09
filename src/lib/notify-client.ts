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

// ── Confirmation-gated AI-drafted email send ─────────────────────────────────
// Called ONLY from a human-triggered path (Telegram approve button locked to
// TELEGRAM_CHAT_ID, or the JWT+ADMIN_EMAIL web approve route). Sends a
// pending_emails draft via Resend with single-use + rate guards. Never throws.
const DAILY_SEND_CAP = 20
const RECIPIENT_COOLDOWN_MS = 10 * 60_000

export async function sendPendingEmail(draftId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return { ok: false, error: 'Database not configured' }

    const { data: draft } = await supabase
      .from('pending_emails')
      .select('id, lead_id, to_email, to_name, subject, body, status, expires_at')
      .eq('id', draftId)
      .maybeSingle()
    if (!draft) return { ok: false, error: 'Draft not found' }
    if (draft.status !== 'pending') return { ok: false, error: `Draft already ${draft.status}` }
    if (new Date(draft.expires_at).getTime() < Date.now()) {
      await supabase.from('pending_emails').update({ status: 'expired' }).eq('id', draftId).eq('status', 'pending')
      return { ok: false, error: 'Draft expired — ask Sage to draft it again' }
    }

    // Hard daily cap on ACTUAL sends (DB-backed, survives instance resets).
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
    const { count: sentToday } = await supabase
      .from('pending_emails')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gt('sent_at', dayAgo)
    if ((sentToday ?? 0) >= DAILY_SEND_CAP) return { ok: false, error: 'Daily email limit reached' }

    // Per-recipient cooldown.
    if (draft.lead_id) {
      const coolAgo = new Date(Date.now() - RECIPIENT_COOLDOWN_MS).toISOString()
      const { count: recent } = await supabase
        .from('pending_emails')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')
        .eq('lead_id', draft.lead_id)
        .gt('sent_at', coolAgo)
      if ((recent ?? 0) > 0) return { ok: false, error: 'Just emailed this client — wait a few minutes' }
    }

    // Re-read recipient from the lead at SEND time — never trust the stored copy.
    let toEmail = draft.to_email
    let toName = draft.to_name
    if (draft.lead_id) {
      const { data: lead } = await supabase.from('leads').select('name, email').eq('id', draft.lead_id).maybeSingle()
      if (lead?.email) { toEmail = lead.email; toName = lead.name ?? toName }
    }
    if (!toEmail) return { ok: false, error: 'No recipient email on file' }

    // Atomic single-use claim: flip to 'sent' only if still pending + unexpired.
    const nowIso = new Date().toISOString()
    const { data: claimed } = await supabase
      .from('pending_emails')
      .update({ status: 'sent', sent_at: nowIso })
      .eq('id', draftId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .select('id')
    if (!claimed || claimed.length === 0) return { ok: false, error: 'Draft already handled' }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'noreply@seliem.dev'
    const first = (toName || 'there').split(' ')[0]
    const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    try {
      await resend.emails.send({
        from,
        to: toEmail,
        subject: draft.subject,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;color:#111">
            <h2 style="color:#c9a84c;margin-bottom:16px">Seliem.dev</h2>
            <p style="margin:0 0 12px">Hi ${esc(first)},</p>
            <div style="white-space:pre-wrap;line-height:1.6">${esc(draft.body)}</div>
            <p style="margin:20px 0 0;color:#888;font-size:13px">— The Seliem.dev Team · <a href="https://seliem.dev/account" style="color:#c9a84c">seliem.dev/account</a></p>
          </div>`,
      })
    } catch (err) {
      await supabase.from('pending_emails').update({ status: 'failed' }).eq('id', draftId)
      return { ok: false, error: err instanceof Error ? err.message : 'Send failed' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[notify-client] sendPendingEmail failed:', err instanceof Error ? err.message : String(err))
    return { ok: false, error: 'Unexpected error' }
  }
}
