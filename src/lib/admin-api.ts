import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createHash } from 'crypto'

export function allowedAdmins() {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
}

export async function authorizeAdmin(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { response: NextResponse.json({ error: 'Database not configured.' }, { status: 500 }) }
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data, error } = await supabase.auth.getUser(token)
  const email = data?.user?.email?.toLowerCase()
  if (error || !email) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!allowedAdmins().includes(email)) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { supabase, email }
}

export async function enforceRateLimit(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  actor: string,
  action: string,
  limit: number,
  windowSeconds: number,
) {
  const actorHash = createHash('sha256').update(actor.toLowerCase()).digest('hex')
  const { data, error } = await supabase.rpc('consume_admin_rate_limit', {
    p_actor_hash: actorHash, p_action: action, p_limit: limit, p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('[rate-limit]', error.message)
    return NextResponse.json({ error: 'Request protection is unavailable.' }, { status: 503 })
  }
  if (!data) return NextResponse.json({ error: 'Too many requests. Please wait and try again.' }, { status: 429, headers: { 'Retry-After': String(windowSeconds) } })
  return null
}
