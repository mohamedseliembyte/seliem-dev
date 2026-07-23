import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Public endpoint — the /for/[slug] preview page pings it on view. Runs
// server-side with the admin client (service key never leaves the server) and
// only ever increments a counter for a valid lead id, so there's nothing to
// abuse beyond a vanity number.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const recent = new Map<string, number>()
const THROTTLE_MS = 30_000

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!UUID.test(id)) return NextResponse.json({ ok: false }, { status: 400 })

  // Dampen rapid double-fires (StrictMode, refreshes) per instance.
  const now = Date.now()
  if (now - (recent.get(id) || 0) < THROTTLE_MS) return NextResponse.json({ ok: true, throttled: true })
  recent.set(id, now)
  if (recent.size > 5000) recent.clear() // crude cap so the map can't grow unbounded

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 })
  const { error } = await supabase.rpc('increment_preview_view', { pid: id })
  if (error) { console.error('[track-view] increment failed:', error.message); return NextResponse.json({ ok: false }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
