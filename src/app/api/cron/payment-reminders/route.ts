import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendTelegramMessage } from '@/lib/telegram'

// Runs daily (Vercel Cron). Emails clients about pending payments and sends
// the admin a "who paid / who's pending" digest on Telegram.
export async function GET(req: NextRequest) {
  // Secure: Vercel sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

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

  return NextResponse.json({ ok: true, reminded, paid: paid.length, pending: pend.length })
}
