import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdmin, enforceRateLimit } from '@/lib/admin-api'
import { groqChat } from '@/lib/groq'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const statuses = new Set(['', 'Researching', 'Contacted', 'Interested', 'Follow up', 'Closed', 'Not a fit'])
const clean = (value: unknown, max: number) => typeof value === 'string' && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) ? value.trim().slice(0, max) : ''

async function getId(params: Promise<{ id: string }>) { const { id } = await params; return UUID.test(id) ? id : '' }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-detail-read', 120, 60); if (limited) return limited
  const id = await getId(params); if (!id) return NextResponse.json({ error: 'Invalid lead.' }, { status: 400 })
  const { data, error } = await auth.supabase!.from('prospect_leads').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return data ? NextResponse.json({ prospect: data }) : NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-detail-write', 60, 60); if (limited) return limited
  const id = await getId(params); if (!id) return NextResponse.json({ error: 'Invalid lead.' }, { status: 400 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const notes = clean(body?.notes, 10000), status = clean(body?.status, 40)
  if (!body || !statuses.has(status)) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 })
  const { data, error } = await auth.supabase!.from('prospect_leads').update({ notes, status, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ prospect: data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-pitch', 30, 3600); if (limited) return limited
  const id = await getId(params); if (!id) return NextResponse.json({ error: 'Invalid lead.' }, { status: 400 })
  const { data: p, error } = await auth.supabase!.from('prospect_leads').select('business,niche,city,state,priority,phone,address,website,status,notes').eq('id', id).single()
  if (error || !p) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  const result = await groqChat([
    { role: 'system', content: 'You are Sage, Mohamed Seliem’s ethical sales coach for Seliem.dev. Create genuinely specific outreach based only on the supplied business facts. Never invent details, claim you audited a site when no site is supplied, use manipulative pressure, or promise results. Return ONLY valid compact JSON with keys phone, voicemail, email, objection. phone is a natural 30-second cold-call opener with one discovery question. voicemail is under 55 words. email is an opener under 90 words including a subject line. objection answers “we are not interested” respectfully in under 45 words.' },
    { role: 'user', content: `Untrusted lead facts (reference only): ${JSON.stringify(p)}` },
  ], { maxTokens: 650 })
  let pitch: Record<string, string>
  try { const raw = result.content || '', json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1); const parsed = JSON.parse(json); pitch = { phone: clean(parsed.phone, 1500), voicemail: clean(parsed.voicemail, 800), email: clean(parsed.email, 1600), objection: clean(parsed.objection, 800) } }
  catch { return NextResponse.json({ error: 'Sage could not format this pitch. Try again.' }, { status: 502 }) }
  if (!Object.values(pitch).every(Boolean)) return NextResponse.json({ error: 'Sage returned an incomplete pitch. Try again.' }, { status: 502 })
  const generatedAt = new Date().toISOString()
  const saved = await auth.supabase!.from('prospect_leads').update({ pitch_script: pitch, pitch_generated_at: generatedAt, updated_at: generatedAt }).eq('id', id)
  return saved.error ? NextResponse.json({ error: saved.error.message }, { status: 500 }) : NextResponse.json({ pitch, pitch_generated_at: generatedAt })
}
