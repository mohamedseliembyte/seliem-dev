import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'
import { askAdminAssistant } from '@/lib/admin-assistant'

// Receives messages you send to the bot in Telegram and replies with answers
// about your business. Locked to the admin chat only.
export async function POST(req: NextRequest) {
  // Verify Telegram's secret token (set when registering the webhook).
  // SECURITY: if the secret is not configured, refuse ALL requests — never
  // accept unauthenticated webhook calls (especially in production).
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) {
    console.error(
      '[telegram-webhook] TELEGRAM_WEBHOOK_SECRET is not set — rejecting every webhook request. ' +
        'Set the env var and re-register the webhook with its secret_token to enable the bot.',
    )
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 401 })
  }
  if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: true }) // silently ignore unauthorized
  }

  let update: { message?: { text?: string; chat?: { id?: number } } }
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const msg = update.message
  const text = msg?.text?.trim()
  const chatId = msg?.chat?.id

  // Only respond to YOU (the admin chat). Ignore everyone else.
  if (!text || String(chatId) !== String(process.env.TELEGRAM_CHAT_ID)) {
    return NextResponse.json({ ok: true })
  }

  if (text === '/start' || text === '/help') {
    await sendTelegramMessage(
      "👋 I'm your Seliem.dev assistant. Ask me anything about your business:\n\n• How many leads today?\n• Who hasn't paid?\n• What should I focus on?\n• Summary of new leads",
    )
    return NextResponse.json({ ok: true })
  }

  const answer = await askAdminAssistant(text, String(chatId))
  await sendTelegramMessage(answer)
  return NextResponse.json({ ok: true })
}
