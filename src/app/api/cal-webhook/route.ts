import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { sendTelegramMessage, escapeHtml } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Verify Cal.com's HMAC signature (only enforced when CAL_WEBHOOK_SECRET is set).
function verify(raw: string, sig: string | null, secret: string): boolean {
  if (!sig) return false
  try {
    const expected = createHmac('sha256', secret).update(raw).digest('hex')
    const a = Buffer.from(expected)
    const b = Buffer.from(sig)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function fmtTime(iso?: string, tz?: string): string {
  if (!iso) return 'time TBD'
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZone: tz || 'UTC',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// Receives Cal.com booking webhooks and pings the admin Telegram chat.
export async function POST(req: NextRequest) {
  const raw = await req.text()

  // If a secret is configured, require a valid signature.
  const secret = process.env.CAL_WEBHOOK_SECRET
  if (secret && !verify(raw, req.headers.get('x-cal-signature-256'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ ok: true }) }

  const trigger: string = body?.triggerEvent ?? ''
  const p = body?.payload ?? {}
  const attendee = (Array.isArray(p.attendees) && p.attendees[0]) || {}
  const name = attendee.name || p.responses?.name?.value || 'Someone'
  const email = attendee.email || p.responses?.email?.value || ''
  let phone: string =
    p.responses?.phone?.value ||
    p.responses?.attendeePhoneNumber?.value ||
    p.responses?.smsReminderNumber?.value ||
    attendee.phoneNumber || ''
  // Fallback: scan every booking answer for anything phone-like, regardless of
  // what the Cal.com question is named.
  if (!phone && p.responses && typeof p.responses === 'object') {
    for (const [k, v] of Object.entries(p.responses)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (v as any)?.value
      if (/phone|mobile|tel/i.test(k) && val) { phone = String(val); break }
    }
  }
  const when = fmtTime(p.startTime, p.organizer?.timeZone || attendee.timeZone)
  const title = p.title || p.type || 'Call'
  const notes = p.additionalNotes || p.responses?.notes?.value || ''

  const head =
    trigger === 'BOOKING_CANCELLED'   ? '❌ <b>Booking cancelled</b>' :
    trigger === 'BOOKING_RESCHEDULED' ? '🔄 <b>Booking rescheduled</b>' :
    '📅 <b>New call booked!</b>'

  const lines: string[] = [head, '']
  lines.push(`👤 <b>${escapeHtml(name)}</b>`)
  if (email) lines.push(`📧 ${escapeHtml(email)}`)
  if (phone) lines.push(`📱 ${escapeHtml(phone)}`)
  lines.push(`🗓 ${escapeHtml(when)}`)
  lines.push(`💬 ${escapeHtml(title)}`)
  if (notes) lines.push(`📝 ${escapeHtml(notes)}`)

  await sendTelegramMessage(lines.join('\n'))
  return NextResponse.json({ ok: true })
}
