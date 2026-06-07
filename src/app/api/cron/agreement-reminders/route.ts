import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendTelegramMessage } from '@/lib/telegram'

// Runs daily (Vercel Cron). Mirrors payment-reminders:
//   • Day 25 (≈5 days before expiry): email the client a "please sign" nudge.
//   • Day 30 (at/after expires_at):   mark unsigned agreements status='expired'.
// Signed ('accepted') agreements are never touched.
export async function GET(req: NextRequest) {
  // Secure: Vercel sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

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

  return NextResponse.json({ ok: true, reminded, expired })
}
