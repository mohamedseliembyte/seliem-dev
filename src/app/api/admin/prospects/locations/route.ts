import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdmin, enforceRateLimit } from '@/lib/admin-api'

const STATE = /^[A-Z]{2}$/

export async function GET(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-location-summary', 120, 60); if (limited) return limited
  const state = (req.nextUrl.searchParams.get('state') || '').trim().toUpperCase()
  if (state && !STATE.test(state)) return NextResponse.json({ error: 'Invalid state.' }, { status: 400 })
  const { data, error } = await auth.supabase!.rpc('prospect_location_summary', { p_state: state || null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const locations = (data || []).map((row: { state: string; city: string | null; lead_count: number | string }) => ({ state: row.state, city: row.city, count: Number(row.lead_count) || 0 }))
  return NextResponse.json({ locations })
}
