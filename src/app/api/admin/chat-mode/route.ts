import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

// POST { conversation_id, human_takeover } — toggle who's driving a conversation.
//   human_takeover=true  → you've jumped in; the AI (Sage) pauses.
//   human_takeover=false → hand the conversation back to the AI.
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Database not configured.' }, { status: 500 })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = userData.user.email.toLowerCase()
  const admins = allowedAdmins()
  if (admins.length === 0 || !admins.includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { conversation_id?: string; human_takeover?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const conversationId = (body.conversation_id ?? '').trim()
  const takeover = body.human_takeover === true
  if (!conversationId) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 })

  const { error } = await supabase
    .from('conversations')
    .update({ human_takeover: takeover, status: takeover ? 'human' : 'active', updated_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, human_takeover: takeover })
}
