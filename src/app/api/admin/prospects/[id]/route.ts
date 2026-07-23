import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdmin, enforceRateLimit } from '@/lib/admin-api'
import { groqChat } from '@/lib/groq'
import { slugify } from '@/lib/prospect-preview'
import { fetchPlaceHours, type PlaceHours } from '@/lib/google-places'

// 24h in-memory hours cache — opening hours change ~yearly, and every Places
// text search bills. Per-instance and ephemeral, which is fine: it only needs
// to absorb repeat views inside a working session. Cache hits skip the quota.
const hoursCache = new Map<string, { hours: PlaceHours | null; at: number }>()
const HOURS_TTL_MS = 24 * 60 * 60 * 1000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const statuses = new Set(['', 'Researching', 'Contacted', 'Interested', 'Follow up', 'Closed', 'Not a fit'])
const clean = (value: unknown, max: number) => typeof value === 'string' && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) ? value.trim().slice(0, max) : ''

async function getId(params: Promise<{ id: string }>) { const { id } = await params; return UUID.test(id) ? id : '' }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const wantsHours = req.nextUrl.searchParams.get('hours') === '1'
  if (!wantsHours) { const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-detail-read', 120, 60); if (limited) return limited }
  const id = await getId(params); if (!id) return NextResponse.json({ error: 'Invalid lead.' }, { status: 400 })
  const { data, error } = await auth.supabase!.from('prospect_leads').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  if (!wantsHours) return NextResponse.json({ prospect: data })

  // ── On-demand opening hours via Google Places ─────────────────────────────
  // A bare business name matches Google's best GLOBAL guess — wrong-business
  // hours look authoritative, so refuse rather than risk it.
  if (!data.phone && !data.city && !data.state) return NextResponse.json({ hours: null, reason: 'no-signal' })
  const cached = hoursCache.get(id)
  if (cached && Date.now() - cached.at < HOURS_TTL_MS) return NextResponse.json({ hours: cached.hours, cached: true })
  // Quota only for requests that actually reach Google — after validation,
  // the 404 check, and the cache. Cache hits stay free.
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-hours', 60, 3600); if (limited) return limited
  try {
    // Phone pins the exact business when we have it; otherwise city/state anchor the name.
    const query = [data.business, data.phone || null, !data.phone && data.city ? data.city : null, !data.phone && data.state ? data.state : null].filter(Boolean).join(' ')
    const hours = await fetchPlaceHours(query)
    hoursCache.set(id, { hours, at: Date.now() })
    return NextResponse.json({ hours })
  } catch (hoursError) {
    console.error('[prospect-hours] lookup failed:', hoursError)
    return NextResponse.json({ error: 'Hours lookup failed — try again in a minute.' }, { status: 502 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-detail-write', 60, 60); if (limited) return limited
  const id = await getId(params); if (!id) return NextResponse.json({ error: 'Invalid lead.' }, { status: 400 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const notes = clean(body?.notes, 10000), status = clean(body?.status, 40)
  if (!body || !statuses.has(status)) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
  const update: Record<string, unknown> = { notes, status, updated_at: new Date().toISOString() }
  // Only touch follow_up_at when the client actually sends it, so saving notes
  // never clears an existing follow-up date. '' clears it; else must be YYYY-MM-DD.
  if (body && 'follow_up_at' in body) {
    const raw = body.follow_up_at
    if (raw === '' || raw === null) update.follow_up_at = null
    else if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) update.follow_up_at = raw
    else return NextResponse.json({ error: 'Invalid follow-up date.' }, { status: 400 })
  }
  const { data, error } = await auth.supabase!.from('prospect_leads').update(update).eq('id', id).select('*').single()
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ prospect: data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-pitch', 30, 3600); if (limited) return limited
  const id = await getId(params); if (!id) return NextResponse.json({ error: 'Invalid lead.' }, { status: 400 })
  const { data: p, error } = await auth.supabase!.from('prospect_leads').select('business,niche,city,state,priority,phone,address,website,status,notes').eq('id', id).single()
  if (error || !p) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  // Every lead already has a live personalized preview page — the script's strongest hook.
  const previewUrl = `https://seliem.dev/for/${slugify(p.business)}`
  const result = await groqChat([
    { role: 'system', content: `You are Sage, Mohamed Seliem's closer-in-residence for Seliem.dev. Write one complete cold-call script Mohamed can follow word-for-word from hello through the close, based only on the supplied business facts.

VOICE — this is non-negotiable: write it like Jordan Belfort's Straight Line system crossed with Alex Hormozi's $100M Offers. Short punchy sentences. Total certainty, zero hedging. Tonality cues in [brackets] — [slow down], [lean in], [lower voice], [pause 2s]. Mohamed controls the frame from the first word and every path loops back toward a close. Hormozi moves: stack the tangible value before ever naming a price, anchor the price against the cost of doing nothing (missed calls, invisible on Google, competitors booked out), reverse the risk. Belfort moves: certainty transfer, never wing an objection — every branch loops back to a specific line in the script (that is what returnTo is for).

THE ACE — the script must be built around this: Mohamed already built this exact business a live, personalized website preview at ${previewUrl} — it is real and live right now with their name on it. Open with it. Something with the energy of: "I'm not calling to sell you a website. I already built yours. It's live on my screen right now — give me 30 seconds and I'll text you the link." Have Mohamed send the link DURING the call and react with them. Risk reversal: if they hate it, they keep the concept as free inspiration — saying no costs them nothing, which is exactly why saying yes is easy.

HARD LINES that make the swagger legal: everything stated must be true. Never invent facts, never fabricate scarcity, urgency, or fake discounts, never claim an audit that didn't happen, never guarantee rankings or revenue, never hide costs, and respect a clear final no. High pressure on the VALUE, never on the PERSON. The caller is Mohamed from Seliem.dev — never call him Sage.

Published pricing to use once value is stacked: landing pages from $500, business websites from $900, AI/CRM/booking projects from $1,500, 50% deposit to begin, optional monthly care from $30. Booking link for closes: cal.com/seliem.dev.

Return ONLY valid compact JSON with this exact shape:
{"callScript":"complete 3-5 minute verbatim cold-call script with labeled stages, [tonality cues], and CLIENT RESPONSE cues","email":"follow-up email under 120 words including subject line and the preview link ${previewUrl}","branches":[{"clientSays":"Interested","response":"exact words Mohamed should say","returnTo":"where to resume in the main script","nextStep":"specific close"}]}

The full callScript must contain these labeled stages: 1. Gatekeeper/decision-maker check; 2. Pattern-interrupt opener built on the live preview; 3. Reason for calling tailored to the known lead facts; 4. Discovery — likely answers and follow-up questions; 5. Value stack and tailored recommendation; 6. Price, anchored, with 50% deposit; 7. Direct close; 8. Confirmed next step. Do not include voicemail language.

Create exactly 6 branches covering: Interested; How much?; We already have a website/provider; Send me information; I need to think about it; Not interested. Each response acknowledges, reframes with one sharp question or the preview link, and loops back toward the smallest real commitment. "Send me information" gets the preview link texted on the spot instead of an email that dies. The Not interested branch stays respectful, leaves the free preview on the table, and ends the conversation unless they re-engage.` },
    { role: 'user', content: `Untrusted lead facts (reference only): ${JSON.stringify(p)}` },
  ], { maxTokens: 2600 })
  let pitch: Record<string, unknown>
  try {
    const raw = result.content || '', json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1), parsed = JSON.parse(json)
    const branches = Array.isArray(parsed.branches) ? parsed.branches.slice(0, 6).map((branch: Record<string, unknown>) => ({ clientSays: clean(branch.clientSays, 120), response: clean(branch.response, 1200), returnTo: clean(branch.returnTo, 300), nextStep: clean(branch.nextStep, 500) })) : []
    pitch = { callScript: clean(parsed.callScript, 9000), email: clean(parsed.email, 2200), branches }
  }
  catch { return NextResponse.json({ error: 'Sage could not format this pitch. Try again.' }, { status: 502 }) }
  const branches = pitch.branches as Array<{ clientSays: string; response: string; returnTo: string; nextStep: string }>
  if (!pitch.callScript || !pitch.email || branches.length !== 6 || !branches.every((branch) => branch.clientSays && branch.response && branch.returnTo && branch.nextStep)) return NextResponse.json({ error: 'Sage returned an incomplete call script. Try again.' }, { status: 502 })
  const generatedAt = new Date().toISOString()
  const saved = await auth.supabase!.from('prospect_leads').update({ pitch_script: pitch, pitch_generated_at: generatedAt, updated_at: generatedAt }).eq('id', id)
  return saved.error ? NextResponse.json({ error: saved.error.message }, { status: 500 }) : NextResponse.json({ pitch, pitch_generated_at: generatedAt })
}
