import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendTelegramMessage, sendTelegramControl, answerCallback, escapeHtml, setTelegramCommands } from '@/lib/telegram'
import { askAdminAssistantRich } from '@/lib/admin-assistant'
import { sendPendingEmail } from '@/lib/notify-client'
import { generateBriefing } from '@/lib/briefing'
import { getSupabaseAdmin } from '@/lib/supabase'

// Quick commands surfaced as both the "/" menu and tappable buttons.
// Each maps to either the CEO briefing or a canned assistant question.
const COMMANDS: { key: string; label: string; desc: string; q?: string }[] = [
  { key: 'briefing', label: '📊 Daily briefing', desc: 'Full business briefing' },
  { key: 'leads', label: '🆕 New inquiries', desc: 'Summary of recent inquiries', q: 'Summarize the newest inquiries and what each one wants.' },
  { key: 'unpaid', label: '💰 Who hasn’t paid', desc: 'Outstanding / overdue payments', q: 'Who has unpaid or overdue payments? List them with amounts.' },
  { key: 'tasks', label: '📋 Tasks', desc: 'Open tasks', q: 'What tasks are open or due? List them.' },
  { key: 'focus', label: '🎯 What to focus on', desc: 'Today’s priorities', q: 'What should I focus on today? Be brief and practical.' },
  { key: 'chats', label: '💬 Live chats', desc: 'Live chats in progress', q: 'Are there any live chats in progress right now?' },
]

async function runCommand(key: string, chatKey: string): Promise<string> {
  if (key === 'briefing') return generateBriefing()
  const cmd = COMMANDS.find((c) => c.key === key)
  if (!cmd?.q) return 'Unknown command.'
  return (await askAdminAssistantRich(cmd.q, chatKey, { channel: 'telegram', requestedBy: `telegram:${chatKey}` })).text
}

// 2-per-row inline keyboard of the command buttons.
function commandKeyboard() {
  const rows: { text: string; callback_data: string }[][] = []
  for (let i = 0; i < COMMANDS.length; i += 2) {
    rows.push(COMMANDS.slice(i, i + 2).map((c) => ({ text: c.label, callback_data: `cmd:${c.key}` })))
  }
  return rows
}

async function showMenu() {
  // (Re)register the slash-command menu; idempotent, cheap.
  void setTelegramCommands([
    { command: 'start', description: 'Show the command menu' },
    { command: 'help', description: 'Show the command menu' },
    ...COMMANDS.map((c) => ({ command: c.key, description: c.desc })),
  ])
  await sendTelegramControl(
    "👋 <b>Seliem.dev assistant</b>\nTap a command, or just ask me anything (e.g. “email Sarah her site is ready”, “invoice John $500 deposit”).",
    commandKeyboard(),
  )
}

type Update = {
  message?: { text?: string; chat?: { id?: number } }
  callback_query?: {
    id: string
    data?: string
    message?: { chat?: { id?: number } }
    from?: { id?: number }
  }
}

// Receives messages you send to the bot in Telegram and replies with answers
// about your business, and handles inline-button taps for live-chat control.
// Locked to the admin chat only.
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

  let update: Update
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  // ── Inline-button taps: live-chat controls ──────────────────────────────────
  const cb = update.callback_query
  if (cb) {
    const cbChat = cb.message?.chat?.id ?? cb.from?.id
    if (String(cbChat) !== String(process.env.TELEGRAM_CHAT_ID)) return NextResponse.json({ ok: true })
    await handleCallback(cb)
    return NextResponse.json({ ok: true })
  }

  const msg = update.message
  const text = msg?.text?.trim()
  const chatId = msg?.chat?.id

  // Only respond to YOU (the admin chat). Ignore everyone else.
  if (!text || String(chatId) !== String(process.env.TELEGRAM_CHAT_ID)) {
    return NextResponse.json({ ok: true })
  }

  // Slash commands → the menu, or a quick canned command.
  if (text.startsWith('/')) {
    const cmd = text.slice(1).split(/\s+/)[0].toLowerCase()
    if (cmd === 'start' || cmd === 'help') {
      await showMenu()
      return NextResponse.json({ ok: true })
    }
    if (COMMANDS.some((c) => c.key === cmd)) {
      await sendTelegramMessage(await runCommand(cmd, String(chatId)))
      return NextResponse.json({ ok: true })
    }
    // Unknown slash command → fall through to the assistant.
  }

  const result = await askAdminAssistantRich(text, String(chatId), { channel: 'telegram', requestedBy: `telegram:${chatId}` })
  if (result.draft) {
    const d = result.draft
    await sendTelegramControl(
      `📧 <b>Draft email — review before sending</b>\n<b>To:</b> ${escapeHtml(d.to_name || d.to_email)} (${escapeHtml(d.to_email)})\n<b>Subject:</b> ${escapeHtml(d.subject)}\n\n${escapeHtml(d.body)}`,
      [[{ text: '✅ Send', callback_data: `emailOk:${d.id}` }, { text: '❌ Cancel', callback_data: `emailNo:${d.id}` }]],
    )
  } else {
    await sendTelegramMessage(result.text)
  }
  return NextResponse.json({ ok: true })
}

// Handle a tapped inline button. callback_data is "action:conversationId".
async function handleCallback(cb: NonNullable<Update['callback_query']>) {
  const [action, convoId] = (cb.data ?? '').split(':')
  if (!convoId) { await answerCallback(cb.id); return }

  const supabase = getSupabaseAdmin()
  if (!supabase) { await answerCallback(cb.id, 'Database not configured'); return }

  if (action === 'aiOn') {
    await supabase.from('conversations').update({ human_takeover: false, status: 'active', updated_at: new Date().toISOString() }).eq('id', convoId)
    await answerCallback(cb.id, '🤖 Sage is handling this chat again')
    await sendTelegramMessage('🤖 Sage is now handling that conversation again.')
  } else if (action === 'jumpIn') {
    await supabase.from('conversations').update({ human_takeover: true, status: 'human', updated_at: new Date().toISOString() }).eq('id', convoId)
    await answerCallback(cb.id, "✍️ You've taken over — reply from the admin page")
    await sendTelegramMessage('✍️ You\'ve taken over that chat. Open the admin page to reply live — Sage is paused until you hand it back.')
  } else if (action === 'emailOk') {
    // Approve & send an AI-drafted client email (this Telegram chat is the trusted actor).
    const r = await sendPendingEmail(convoId)
    await answerCallback(cb.id, r.ok ? 'Sent ✅' : (r.error ?? 'Failed'))
    await sendTelegramMessage(r.ok ? '✅ Email sent to the client.' : `❌ Couldn't send: ${r.error ?? 'unknown error'}`)
  } else if (action === 'emailNo') {
    await supabase.from('pending_emails').update({ status: 'cancelled' }).eq('id', convoId).eq('status', 'pending')
    await answerCallback(cb.id, 'Cancelled')
    await sendTelegramMessage('❌ Draft cancelled — nothing was sent.')
  } else if (action === 'cmd') {
    // A tapped command button (convoId holds the command key).
    await answerCallback(cb.id, '⏳ Working…')
    const chatKey = String(cb.message?.chat?.id ?? cb.from?.id ?? '')
    await sendTelegramMessage(await runCommand(convoId, chatKey))
  } else {
    await answerCallback(cb.id)
  }
}
