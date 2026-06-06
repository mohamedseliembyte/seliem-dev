import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateBriefing } from '@/lib/briefing'
import { sendTelegramMessage } from '@/lib/telegram'

function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

// Admin-only manual trigger — generates the briefing, sends it to Telegram,
// and returns the text so it can be previewed in the test page.
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admins = allowedAdmins()
  if (admins.length > 0 && !admins.includes(data.user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const message = await generateBriefing()
    const sent = await sendTelegramMessage(message)
    return NextResponse.json({ ok: true, sent, message })
  } catch (err) {
    console.error('[ceo-briefing test] error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}
