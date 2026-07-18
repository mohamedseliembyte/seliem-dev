import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendPendingEmail } from '@/lib/notify-client'

function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

// POST { draftId } — the ONE web path that actually sends an AI-drafted email.
// Re-authorized here (defense in depth): the send is gated on a fresh admin
// check, not merely the draft existing. Accepts ONLY draftId — no subject/body
// overrides — so the bytes the admin approved are exactly what gets sent.
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = data.user.email.toLowerCase()
  const admins = allowedAdmins()
  if (admins.length === 0 || !admins.includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { draftId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const draftId = (body.draftId ?? '').trim()
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const result = await sendPendingEmail(draftId)
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 400 })
  return NextResponse.json({ sent: true })
}
