import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

// POST { conversation_id, content } — admin sends a live reply as a human.
// Inserting a 'human' message takes over the conversation (pauses the AI).
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Database not configured.' }, { status: 500 })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = userData.user.email.toLowerCase()
  const admins = allowedAdmins()
  if (admins.length > 0 && !admins.includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { conversation_id?: string; content?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const conversationId = (body.conversation_id ?? '').trim()
  const content = (body.content ?? '').trim()
  if (!conversationId || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, role: 'human', content })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('conversations').update({ status: 'human', updated_at: new Date().toISOString() }).eq('id', conversationId)

  return NextResponse.json({ success: true })
}
