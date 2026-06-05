import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin, saveLead } from '@/lib/supabase'
import { notifyLead } from '@/lib/telegram'
import { sendTelegramMessage } from '@/lib/telegram'
import { groqChat, SYSTEM_PROMPT, type ChatMessage } from '@/lib/groq'
import { maybeEmailClientReply } from '@/lib/notify-client'

// ── Tiered rate limits: anonymous = 15/hr, signed-in = 100/hr ────────────────
const ANON_LIMIT = 15
const AUTH_LIMIT = 100
const rl = new Map<string, { count: number; resetAt: number }>()

function isLimited(key: string, isAuthenticated: boolean): boolean {
  const max = isAuthenticated ? AUTH_LIMIT : ANON_LIMIT
  const now = Date.now()
  const e = rl.get(key)
  if (!e || now > e.resetAt) {
    rl.set(key, { count: 1, resetAt: now + 3_600_000 })
    return false
  }
  if (e.count >= max) return true
  e.count++
  return false
}

const FALLBACK =
  "I'm having a brief hiccup on my end — but I'd love to help. Could you share your email and a sentence about what you need? Our team will personally reach out. 🙏"

export async function POST(req: NextRequest) {
  let body: { session_id?: string; message?: string; user_email?: string; user_name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const sessionId = (body.session_id ?? '').trim()
  const message = (body.message ?? '').trim()
  const userEmail = (body.user_email ?? '').trim()
  const userName = (body.user_name ?? '').trim()
  const isAuthenticated = Boolean(userEmail && userEmail.includes('@'))

  if (!sessionId || !message) {
    return NextResponse.json({ error: 'Missing session_id or message' }, { status: 400 })
  }
  if (message.length > 1500) {
    return NextResponse.json({ reply: "That's a long one! Could you shorten it a little?" })
  }

  // Tiered rate limit (graceful, not an error)
  if (isLimited(sessionId, isAuthenticated)) {
    if (!isAuthenticated) {
      return NextResponse.json({
        reply:
          "You've reached the message limit for guests. Sign in with Google (top-right) for unlimited messages — or leave your email and our team will follow up! 🙏",
      })
    }
    return NextResponse.json({
      reply:
        "I've hit my message limit for now 🙏 — our team will follow up with you directly!",
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
    } else if (isAuthenticated) {
      // Signed-in user with no conversation under this key yet — adopt their most
      // recent existing conversation (so the bot remembers them) or create one.
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .ilike('email', userEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let adopted: string | null = null
      if (lead?.id) {
        const { data: priorConvo } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (priorConvo?.id) {
          await supabase.from('conversations').update({ session_id: sessionId }).eq('id', priorConvo.id)
          adopted = priorConvo.id
        }
      }

      if (adopted) {
        conversationId = adopted
      } else {
        const { data: created, error: cErr } = await supabase
          .from('conversations')
          .insert({ session_id: sessionId })
          .select('id')
          .single()
        if (cErr || !created) throw new Error('Failed to create conversation')
        conversationId = created.id
      }
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

    // ── Human takeover: if a rep has joined, pause the AI ───────────────────
    const humanActive = (history ?? []).some((m) => m.role === 'human')
    if (humanActive) {
      // Alert the rep that the visitor replied, and let polling deliver the rep's response
      void sendTelegramMessage(`💬 <b>Visitor replied in live chat:</b>\n${message}`)
      return NextResponse.json({ reply: null, human: true })
    }

    // ── Build the prompt ────────────────────────────────────────────────────
    // If the user signed in with Google, tell Sage so it skips asking for name/email
    let systemAddendum = ''
    if (isAuthenticated) {
      systemAddendum = `\n\nIMPORTANT CONTEXT: This visitor signed in with Google. Their name is "${userName}" and their email is "${userEmail}". You already have their contact info — do NOT ask them for their name or email. Focus on learning about their project, then call capture_lead with the info you already have plus what you learn.`
    }

    const convo: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT + systemAddendum },
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

      // Only save if we actually got a real name and email (not placeholders)
      const hasRealInfo =
        args.name && args.email &&
        !/^(unknown|n\/a|none|na|tbd)$/i.test(args.name.trim()) &&
        !/^(unknown|n\/a|none|na|tbd)$/i.test(args.email.trim()) &&
        args.email.includes('@')

      if (!hasRealInfo) {
        // Skip saving — ask the model to keep qualifying
        const followup = await groqChat(
          [
            ...convo,
            { role: 'assistant', content: null, tool_calls: first.toolCalls },
            { role: 'tool', tool_call_id: call.id, content: 'Not enough info yet. Please keep chatting to learn the visitor\'s name and email before calling capture_lead again.' },
          ],
          true,
        )
        replyText = followup.content ?? "Could you share your name and email so our team can follow up?"
        await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: replyText })
        return NextResponse.json({ reply: replyText })
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
            { role: 'tool', tool_call_id: call.id, content: 'Lead saved successfully. Our team has been notified.' },
          ],
          false,
        )
        replyText = followup.content ?? "Perfect — I have passed your details to our team. We will reach out within 24-48 hours! 🙌"
      } catch {
        replyText = "Perfect — I have passed your details to our team. We will reach out within 24-48 hours! 🙌"
      }
    }

    if (!replyText) replyText = "Got it — could you tell me a bit more about what you're looking for?"

    // Save the assistant reply
    await supabase.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: replyText })
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)

    // If the visitor has gone offline, email them the AI's reply (throttled, only if known lead)
    void maybeEmailClientReply(conversationId, replyText)

    return NextResponse.json({ reply: replyText })
  } catch (err) {
    console.error('[chat] error:', err instanceof Error ? err.message : String(err))
    // Notify yourself that the AI fell back, so no lead slips away unseen
    void sendTelegramMessage(`⚠️ AI chat hit an error and fell back. Session: ${sessionId}`)
    return NextResponse.json({ reply: FALLBACK })
  }
}
