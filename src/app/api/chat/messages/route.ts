import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Lightweight polling endpoint: the chat widget calls this to pick up new
// messages (especially live replies from a human rep). Keyed by session_id.
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ messages: [], human: false })

  const url = new URL(req.url)
  const sessionId = (url.searchParams.get('session_id') ?? '').trim()
  const after = url.searchParams.get('after') // ISO timestamp, optional
  if (!sessionId) return NextResponse.json({ messages: [], human: false })

  const { data: convo } = await supabase
    .from('conversations')
    .select('id, human_takeover')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (!convo?.id) return NextResponse.json({ messages: [], human: false })

  let q = supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', convo.id)
    .order('created_at', { ascending: true })
    .limit(100)

  if (after) q = q.gt('created_at', after)

  const { data: msgs } = await q

  // Has a human taken over this conversation? (explicit flag, so AI can resume)
  return NextResponse.json({ messages: msgs ?? [], human: convo.human_takeover === true })
}
