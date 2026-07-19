import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdmin, enforceRateLimit } from '@/lib/admin-api'

const statuses = new Set(['', 'Researching', 'Contacted', 'Interested', 'Follow up', 'Closed', 'Not a fit'])
const cleanFilter = (value: string | null, max: number) => value && value.length <= max && !/[\u0000-\u001f]/.test(value) ? value.trim() : ''

export async function GET(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-read', 120, 60); if (limited) return limited
  const p = req.nextUrl.searchParams
  const rawPage = Number(p.get('page') || '1')
  if (!Number.isSafeInteger(rawPage) || rawPage < 1 || rawPage > 10000) return NextResponse.json({ error: 'Invalid page.' }, { status: 400 })
  const page = rawPage, pageSize = 50
  let query = auth.supabase!.from('prospect_leads').select('*', { count: 'exact' })
  const rawSearch = p.get('search') || ''
  if (rawSearch.length > 100) return NextResponse.json({ error: 'Search is too long.' }, { status: 400 })
  const search = rawSearch.replace(/[%_*,()'"\\]/g, ' ').replace(/\s+/g, ' ').trim()
  if (search) query = query.or(`business.ilike.%${search}%,niche.ilike.%${search}%,city.ilike.%${search}%,phone.ilike.%${search}%`)
  for (const key of ['priority', 'niche', 'state', 'city', 'status'] as const) { const value = cleanFilter(p.get(key), 80); if (value) query = query.eq(key, value) }
  const { data, count, error } = await query.order('sheet_row').range((page - 1) * pageSize, page * pageSize - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: integration } = await auth.supabase!.from('google_integrations').select('account_email,updated_at').eq('id', 'google_sheets').maybeSingle()
  const { data: sync } = await auth.supabase!.from('google_sheet_syncs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle()
  return NextResponse.json({ prospects: data || [], total: count || 0, page, pageSize, integration, sync })
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-write', 60, 60); if (limited) return limited
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
  const { id, status } = body as Record<string, unknown>
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || typeof status !== 'string' || !statuses.has(status)) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
  const { error } = await auth.supabase!.from('prospect_leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true })
}
