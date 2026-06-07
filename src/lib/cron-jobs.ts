import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendTelegramMessage } from '@/lib/telegram'

// Shared cron job logic. Lives in lib (not a route file) so it can be imported
// by both the individual cron routes and the consolidated maintenance route —
// Next.js route modules may only export GET/POST/etc., not helper functions.

// ── Payment reminders ────────────────────────────────────────────────────────
// Emails clients about pending payments and sends the admin a billing digest.
export async function runPaymentReminders() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { ok: false as const, error: 'DB not configured' }

  const handle = process.env.NEXT_PUBLIC_PAYPAL_HANDLE || ''
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'noreply@seliem.dev'

  // Don't re-remind a payment more than once every 3 days
  const remindCutoff = new Date(Date.now() - 3 * 86_400_000).toISOString()
  const olderThan1Day = new Date(Date.now() - 86_400_000).toISOString()

  const { data: pending } = await supabase
    .from('payments')
    .select('id, lead_id, amount, description, last_reminded_at, created_at')
    .eq('status', 'pending')

  let reminded = 0
  for (const p of pending ?? []) {
    if (!(Number(p.amount) > 0)) continue // skip invalid/zero-amount payments
    if (p.created_at > olderThan1Day) continue // give them a day before nudging
    if (p.last_reminded_at && p.last_reminded_at > remindCutoff) continue

    const { data: lead } = await supabase
      .from('leads')
      .select('name, email')
      .eq('id', p.lead_id)
      .maybeSingle()
    if (!lead?.email) continue

    const first = (lead.name || 'there').split(' ')[0]
    const payLink = handle ? `https://paypal.me/${handle}/${p.amount}` : 'https://seliem.dev/account'
    try {
      await resend.emails.send({
        from,
        to: lead.email,
        subject: `Reminder: payment for ${p.description}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;color:#111">
            <h2 style="color:#c9a84c;margin-bottom:16px">Friendly payment reminder 💳</h2>
            <p>Hi ${first},</p>
            <p>This is a reminder for your outstanding payment:</p>
            <div style="margin:16px 0;padding:14px 16px;background:#f7f7f7;border-left:3px solid #c9a84c;border-radius:6px">
              <strong>${p.description}</strong><br/>Amount: <strong>$${Number(p.amount).toLocaleString()}</strong>
            </div>
            <p><a href="${payLink}" style="display:inline-block;background:#c9a84c;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Pay now</a></p>
            <p style="margin-top:20px">Or view it anytime at <a href="https://seliem.dev/account" style="color:#c9a84c">seliem.dev/account</a>.</p>
            <p style="margin:0;color:#888;font-size:13px">— The Seliem.dev Team</p>
          </div>`,
      })
      await supabase.from('payments').update({ last_reminded_at: new Date().toISOString() }).eq('id', p.id)
      reminded++
    } catch (err) {
      console.error('[cron] reminder email failed:', err instanceof Error ? err.message : String(err))
    }
  }

  // Daily digest to admin
  const { data: all } = await supabase.from('payments').select('amount, status')
  const paid = (all ?? []).filter((x) => x.status === 'paid')
  const pend = (all ?? []).filter((x) => x.status === 'pending')
  const sum = (rows: { amount: number }[]) => rows.reduce((t, r) => t + Number(r.amount), 0)

  await sendTelegramMessage(
    `💰 <b>Daily billing summary</b>\n\n` +
      `✅ Paid: ${paid.length} ($${sum(paid).toLocaleString()})\n` +
      `🟡 Pending: ${pend.length} ($${sum(pend).toLocaleString()})\n` +
      `📨 Reminders sent today: ${reminded}`,
  )

  return { ok: true as const, reminded, paid: paid.length, pending: pend.length }
}

// ── Agreement reminders / expiry ─────────────────────────────────────────────
//   • Day 25 (≈5 days before expiry): email the client a "please sign" nudge.
//   • Day 30 (at/after expires_at):   mark unsigned agreements status='expired'.
export async function runAgreementReminders() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { ok: false as const, error: 'DB not configured' }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'noreply@seliem.dev'
  const now = Date.now()
  const REMIND_WINDOW_MS = 5 * 86_400_000 // remind when within 5 days of expiry (≈ day 25 of 30)

  // Only unsigned agreements can expire / need reminding
  const { data: pending } = await supabase
    .from('agreements')
    .select('id, lead_id, price, scope, status, created_at, expires_at, expiry_reminded_at')
    .eq('status', 'sent')

  let expired = 0
  let reminded = 0

  for (const a of pending ?? []) {
    // Fall back to created_at + 30d if the column wasn't backfilled
    const expiresAt = a.expires_at
      ? new Date(a.expires_at).getTime()
      : new Date(a.created_at).getTime() + 30 * 86_400_000

    // ── Day 30+: expire it ──
    if (now >= expiresAt) {
      const { error } = await supabase.from('agreements').update({ status: 'expired' }).eq('id', a.id)
      if (!error) expired++
      continue
    }

    // ── Day 25–30: send a one-time reminder ──
    if (now >= expiresAt - REMIND_WINDOW_MS && !a.expiry_reminded_at) {
      const { data: lead } = await supabase
        .from('leads')
        .select('name, email')
        .eq('id', a.lead_id)
        .maybeSingle()
      if (!lead?.email) continue

      const first = (lead.name || 'there').split(' ')[0]
      const daysLeft = Math.max(1, Math.ceil((expiresAt - now) / 86_400_000))
      try {
        await resend.emails.send({
          from,
          to: lead.email,
          subject: `Your Seliem.dev agreement expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;color:#111">
              <h2 style="color:#c9a84c;margin-bottom:16px">A quick reminder ✍️</h2>
              <p>Hi ${first},</p>
              <p>Your service agreement is still awaiting your signature and will expire in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.</p>
              <div style="margin:16px 0;padding:14px 16px;background:#f7f7f7;border-left:3px solid #c9a84c;border-radius:6px">
                <strong>${a.scope}</strong><br/>Total: <strong>$${Number(a.price).toLocaleString()}</strong>
              </div>
              <p><a href="https://seliem.dev/account" style="display:inline-block;background:#c9a84c;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Review &amp; sign</a></p>
              <p style="margin-top:20px">If you have any questions, just reply to this email.</p>
              <p style="margin:0;color:#888;font-size:13px">— The Seliem.dev Team</p>
            </div>`,
        })
        await supabase.from('agreements').update({ expiry_reminded_at: new Date().toISOString() }).eq('id', a.id)
        reminded++
      } catch (err) {
        console.error('[cron] agreement reminder email failed:', err instanceof Error ? err.message : String(err))
      }
    }
  }

  if (expired > 0 || reminded > 0) {
    await sendTelegramMessage(
      `📄 <b>Agreement digest</b>\n\n` +
        `✍️ Reminders sent: ${reminded}\n` +
        `⌛ Expired (unsigned): ${expired}`,
    )
  }

  return { ok: true as const, reminded, expired }
}

// ── Conversation archival ────────────────────────────────────────────────────
// Deletes conversations + their messages inactive beyond CONVERSATION_RETENTION_DAYS.
export async function runArchiveConversations() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { ok: false as const, error: 'DB not configured' }

  const days = Number(process.env.CONVERSATION_RETENTION_DAYS) || 365
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  // Stale = last activity (updated_at, falling back to created_at) before cutoff.
  const { data: stale, error } = await supabase
    .from('conversations')
    .select('id, updated_at, created_at')
    .or(`updated_at.lt.${cutoff},and(updated_at.is.null,created_at.lt.${cutoff})`)
    .limit(1000)

  if (error) {
    console.error('[cron] archive-conversations select failed:', error.message)
    return { ok: false as const, error: error.message }
  }

  const ids = (stale ?? []).map((c) => c.id)
  if (ids.length === 0) {
    return { ok: true as const, archived: 0, deletedMessages: 0, retentionDays: days }
  }

  // Delete messages first (they reference the conversation), then conversations.
  const { count: msgCount } = await supabase
    .from('messages')
    .delete({ count: 'exact' })
    .in('conversation_id', ids)
  const deletedMessages = msgCount ?? 0

  const { error: cErr, count: convoCount } = await supabase
    .from('conversations')
    .delete({ count: 'exact' })
    .in('id', ids)
  if (cErr) {
    console.error('[cron] archive-conversations delete failed:', cErr.message)
    return { ok: false as const, error: cErr.message }
  }

  const archived = convoCount ?? ids.length
  console.log(`[cron] archived ${archived} conversations (${deletedMessages} messages), retention ${days}d`)

  if (archived > 0) {
    await sendTelegramMessage(
      `🗄️ <b>Conversation archival</b>\n\nRemoved ${archived} conversation${archived > 1 ? 's' : ''} (${deletedMessages} message${deletedMessages === 1 ? '' : 's'}) inactive for >${days} days.`,
    )
  }

  return { ok: true as const, archived, deletedMessages, retentionDays: days }
}
