import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin, saveLead } from '@/lib/supabase'
import { notifyLead } from '@/lib/telegram'
import { sendTelegramMessage } from '@/lib/telegram'
import { groqChat, SYSTEM_PROMPT, type ChatMessage } from '@/lib/groq'

// ── Per-session rate limit (anonymous visitors) ──────────────────────────────
const MAX_MESSAGES_PER_HOUR = 30
const rl = new Map<string, { count: number; resetAt: number }>()

function isLimited(key: string): boolean {
  const now = Date.now()
  const e = rl.get(key)
  if (!e || now > e.resetAt) {
    rl.set(key, { count: 1, resetAt: now + 3_600_000 })
    return false
  }
  if (e.count >= MAX_MESSAGES_PER_HOUR) return true
  e.count++
  return false
}

const FALLBACK =
  "I’m having a brief hiccup on my end — but I’d love to help. Could you share your email and a sentence about what you need? Mohamed will personally reach out. 🙏"

export async function POST(req: NextRequest) {
  let body: { session_id?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const sessionId = (body.session_id ?? '').trim()
  const message = (body.message ?? '').trim()

  if (!sessionId || !message) {
    return NextResponse.json({ error: 'Missing session_id or message' }, { status: 400 })
  }
  if (message.length > 1500) {
    return NextResponse.json({ reply: 'That’s a long one! Could you shorten it a little?' })
  }

  // Rate limit (graceful, not an error)
  if (isLimited(sessionId)) {
    return NextResponse.json({
      reply:
        "I’ve hit my message limit for now 🙏 — leave your email and a quick note, and Mohamed will follow up with you directly!",
    })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ reply: FALLBACK })
  }

  try {
    // ── Get or create the conversation ──────────────────────────────────────
    let conversationId: string
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (existing?.id) {
      conversationId = existing.id
    } else {
      const { data: created, error: cErr } = await supabase
        .from('conversations')
        .insert({ session_id: sessionId })
        .select('id')
        .single()
      if (cErr || !created) throw new Error('Failed to create conversation')
      conversationId = created.id
    }

    // ── Load recent history ─────────────────────────────────────────────────
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Save the incoming user message
    await supabase.from('messages').insert({ conversation_id: conversationId, role: 'user', content: message })

    // ── Build the prompt ────────────────────────────────────────────────────
    const convo: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...((history ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })) as ChatMessage[]),
      { role: 'user', content: message },
    ]

    // ── First model call ────────────────────────────────────────────────────
    const first = await groqChat(convo)

    let replyText = first.content ?? ''

    // ── Handle a lead-capture tool call ─────────────────────────────────────
    if (first.toolCalls && first.toolCalls.length > 0) {
      const call = first.toolCalls.find((c) => c.function?.name === 'capture_lead') ?? first.toolCalls[0]
      let args: Record<string, string> = {}
      try {
        args = JSON.parse(call.function.arguments || '{}')
      } catch {
        args = {}
      }

      // Persist the lead
      const leadId = await saveLead({
        type: 'contact',
        name: args.name || 'Chat visitor',
        email: args.email || '',
        message: args.summary || message,
        phone: args.phone || null,
        business_name: args.business_name || null,
        business_type: args.business_type || null,
        budget: args.budget || null,
        goals: args.goals || null,
      })

      // Link conversation → lead and mark it
      await supabase
        .from('conversations')
        .update({ status: 'lead_captured', lead_id: leadId, summary: args.summary ?? null, updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      // Ping Telegram with the captured lead
      await notifyLead({
        type: 'contact',
        name: args.name || 'Chat visitor',
        email: args.email || 'n/a',
        message: `🤖 Captured by AI chat:\n${args.summary || ''}`,
        phone: args.phone,
        businessName: args.business_name,
        businessType: args.business_type,
        budget: args.budget,
        goals: args.goals,
      })

      // Ask the model for a natural confirmation reply (tool-result turn)
      try {
        const followup = await groqChat(
          [
            ...convo,
            { role: 'assistant', content: null, tool_calls: first.toolCalls },
            { role: 'tool', tool_call_id: call.id, content: 'Lead saved successfully. Mohamed has been notified.' },
          ],
          false,
        )
        replyText = followup.content ?? 'Perfect — I’ve passed your details to Mohamed. He’ll reach out within 24–48 hours! 🙌'
      } catch {
        replyText = 'Perfect — I’ve passed your details to Mohamed. He’ll reach out within 24–48 hours! 🙌'
      }
    }

    if (!replyText) replyText = "Got it — could you tell me a bit more about what you’re looking for?"

    // Save the assistant reply
    await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: replyText })
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)

    return NextResponse.json({ reply: replyText })
  } catch (err) {
    console.error('[chat] error:', err instanceof Error ? err.message : String(err))
    // Notify yourself that the AI fell back, so no lead slips away unseen
    void sendTelegramMessage(`⚠️ AI chat hit an error and fell back. Session: ${sessionId}`)
    return NextResponse.json({ reply: FALLBACK })
  }
}
