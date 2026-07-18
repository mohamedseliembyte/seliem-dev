import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdmin, enforceRateLimit } from '@/lib/admin-api'
import { searchPlaces, type PlaceLead } from '@/lib/google-places'

const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= max && !/[\u0000-\u001f]/.test(value) ? value.trim() : ''
const optional = (value: unknown, max: number) => typeof value === 'string' && value.length <= max && !/[\u0000-\u001f]/.test(value) ? value.trim() || null : null

export async function GET(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const { count } = await auth.supabase!.from('prospect_leads').select('id', { count: 'exact', head: true }).or('city.is.null,state.is.null')
  return NextResponse.json({ configured: !!process.env.GOOGLE_PLACES_API_KEY, missingLocations: count || 0 })
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'places-search', 20, 3600); if (limited) return limited
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const niche = text(body?.niche, 80), location = text(body?.location, 80)
  if (!niche || !location) return NextResponse.json({ error: 'Enter a niche and a city or state.' }, { status: 400 })
  try { return NextResponse.json({ results: await searchPlaces(`${niche} in ${location}`, 20) }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Places search failed.' }, { status: 502 }) }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'places-import', 60, 3600); if (limited) return limited
  const body = await req.json().catch(() => null) as { results?: PlaceLead[] } | null
  if (!Array.isArray(body?.results) || body.results.length < 1 || body.results.length > 20) return NextResponse.json({ error: 'Select 1–20 businesses.' }, { status: 400 })
  const valid = body.results.filter((p) => p && text(p.placeId, 200) && text(p.business, 160)).map((p) => { const website = optional(p.website, 500); return ({ google_place_id: text(p.placeId, 200), source: 'google_places', source_sheet_id: 'google_places', sheet_row: null, priority: website ? '3 - Has real site' : '1 - HOT (no site)', business: text(p.business, 160), niche: optional(p.niche, 100), city: optional(p.city, 100), state: optional(p.state, 40), phone: optional(p.phone, 60), address: optional(p.address, 300), website, maps_url: optional(p.mapsUrl, 500), places_updated_at: new Date().toISOString() }) })
  if (!valid.length) return NextResponse.json({ error: 'No valid businesses selected.' }, { status: 400 })
  const ids = valid.map((p) => p.google_place_id)
  const { data: existing } = await auth.supabase!.from('prospect_leads').select('google_place_id').in('google_place_id', ids)
  const known = new Set((existing || []).map((p) => p.google_place_id)); const fresh = valid.filter((p) => !known.has(p.google_place_id))
  const { error } = fresh.length ? await auth.supabase!.from('prospect_leads').insert(fresh) : { error: null }
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ imported: fresh.length, skipped: valid.length - fresh.length })
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'places-enrich', 10, 3600); if (limited) return limited
  if (!process.env.GOOGLE_PLACES_API_KEY) return NextResponse.json({ error: 'Google Places is not configured yet.' }, { status: 503 })
  const { data: rows, error } = await auth.supabase!.from('prospect_leads').select('id,business,phone').or('city.is.null,state.is.null').limit(10)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  let updated = 0
  for (const row of rows || []) {
    const [place] = await searchPlaces([row.business, row.phone].filter(Boolean).join(' '), 1)
    if (!place || (!place.city && !place.state)) continue
    const result = await auth.supabase!.from('prospect_leads').update({ google_place_id: place.placeId, city: place.city, state: place.state, address: place.address, maps_url: place.mapsUrl, website: place.website || undefined, places_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', row.id)
    if (!result.error) updated++
  }
  return NextResponse.json({ checked: rows?.length || 0, updated })
}
