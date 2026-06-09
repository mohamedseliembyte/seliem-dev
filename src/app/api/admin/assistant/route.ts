import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { askAdminAssistant } from '@/lib/admin-assistant'

function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

// POST { question } — ask the private business assistant about leads, clients,
// preferences, payments, etc. Same ADMIN_EMAIL-allow-list auth as other admin routes.
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = data.user.email.toLowerCase()
  const admins = allowedAdmins()
  if (admins.length > 0 && !admins.includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { question?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const question = (body.question ?? '').trim()
  if (!question) return NextResponse.json({ error: 'Empty question' }, { status: 400 })
  if (question.length > 1000) return NextResponse.json({ text: 'That question is a bit long — try shortening it.' })

  const text = await askAdminAssistant(question, `web:${email}`)
  return NextResponse.json({ text })
}
