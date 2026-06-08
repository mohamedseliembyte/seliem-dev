// Lightweight Telegram notifier — pings you when a new lead comes in.
// Credentials come from env vars; nothing hardcoded.
//
//   TELEGRAM_BOT_TOKEN  – from @BotFather
//   TELEGRAM_CHAT_ID    – your personal chat ID (where alerts are sent)
//
// Designed to fail quietly: if Telegram is down or unconfigured, it logs a
// warning and returns false — it never throws, so it can't break the form.

const TELEGRAM_API = 'https://api.telegram.org'

/** Escape user-supplied text for Telegram's HTML parse mode. */
function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export type LeadAlert = {
  type: 'support' | 'contact'
  name: string
  email: string
  message: string
  businessName?: string
  phone?: string
  businessType?: string
  budget?: string
  goals?: string
}

/** Build a nicely formatted HTML message for a lead. */
function formatLead(lead: LeadAlert): string {
  const e = escapeHtml
  const header = lead.type === 'support' ? '🛟 <b>New Support Request</b>' : '🔔 <b>New Website Inquiry</b>'

  const lines: string[] = [header, '']
  lines.push(`👤 <b>Name:</b> ${e(lead.name)}`)
  lines.push(`📧 <b>Email:</b> ${e(lead.email)}`)
  if (lead.phone && lead.phone !== 'N/A')        lines.push(`📱 <b>Phone:</b> ${e(lead.phone)}`)
  if (lead.businessName && lead.businessName !== 'N/A') lines.push(`🏢 <b>Business:</b> ${e(lead.businessName)}`)
  if (lead.businessType && lead.businessType !== 'N/A') lines.push(`🏷 <b>Type:</b> ${e(lead.businessType)}`)
  if (lead.budget)                               lines.push(`💰 <b>Budget:</b> ${e(lead.budget)}`)
  if (lead.goals)                                lines.push(`🎯 <b>Goals:</b> ${e(lead.goals)}`)
  lines.push('')
  lines.push(`💬 <b>Message:</b>\n${e(lead.message)}`)

  return lines.join('\n')
}

/** A Telegram inline button that opens a URL when tapped. */
type UrlButton = { text: string; url: string }

/** Low-level send. Returns true on success, false (logged) on any failure. */
export async function sendTelegramMessage(
  text: string,
  buttons: UrlButton[] = [],
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.warn('[telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — skipping notification.')
    return false
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }
  // One button per row for easy tapping on mobile.
  if (buttons.length > 0) {
    payload.reply_markup = { inline_keyboard: buttons.map((b) => [b]) }
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[telegram] sendMessage failed (${res.status}): ${detail}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[telegram] Network error:', err instanceof Error ? err.message : String(err))
    return false
  }
}

/** Build quick-action link buttons from the lead's contact details. */
function leadButtons(lead: LeadAlert): UrlButton[] {
  const buttons: UrlButton[] = []

  // WhatsApp — only if we have a usable phone number.
  const digits = (lead.phone ?? '').replace(/\D/g, '')
  if (digits.length >= 7) {
    buttons.push({ text: '💬 WhatsApp', url: `https://wa.me/${digits}` })
  }

  // Reply by email — opens Gmail compose, pre-addressed to the lead.
  if (lead.email) {
    const firstName = lead.name.split(' ')[0] || 'there'
    const subject = encodeURIComponent('Re: Your inquiry to Seliem.dev')
    const body = encodeURIComponent(`Hi ${firstName},\n\nThanks for reaching out to Seliem.dev! `)
    buttons.push({
      text: '📧 Reply by Email',
      url: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${subject}&body=${body}`,
    })
  }

  return buttons
}

/** Send a formatted lead alert with quick-action buttons. Never throws. */
export async function notifyLead(lead: LeadAlert): Promise<boolean> {
  return sendTelegramMessage(formatLead(lead), leadButtons(lead))
}

// ── Inline callback controls (handled by the webhook's callback_query) ────────

/** An inline button that fires a callback to the bot instead of opening a URL. */
export type CallbackButton = { text: string; callback_data: string }

/** Send a message with an inline callback keyboard (rows of buttons). Never throws. */
export async function sendTelegramControl(text: string, rows: CallbackButton[][]): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — skipping control message.')
    return false
  }
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: rows },
      }),
    })
    return res.ok
  } catch (err) {
    console.error('[telegram] control send error:', err instanceof Error ? err.message : String(err))
    return false
  }
}

/** Acknowledge a tapped inline button (stops its loading spinner). Never throws. */
export async function answerCallback(callbackQueryId: string, text?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`${TELEGRAM_API}/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text ?? '' }),
    })
  } catch { /* ignore */ }
}
