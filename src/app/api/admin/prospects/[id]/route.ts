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
    { role: 'system', content: `You are Sage, Mohamed Seliem's ethical sales coach for Seliem.dev. Build a highly actionable, genuinely specific sales playbook based only on the supplied business facts. The goal is to earn a clear next step or close when there is a real fit.

Never invent facts, claim an audit you did not perform, guarantee outcomes, fabricate urgency, hide costs, or pressure someone who clearly declines. Use concise, natural language that Mohamed can say verbatim. Use the published starting points when relevant: landing pages from $500, business websites from $900, AI/CRM/booking projects from $1,500, 50% deposit to begin, and optional monthly care from $30.

Return ONLY valid compact JSON with this exact shape:
{"phone":"30-45 second opener ending in one discovery question","discovery":"3 short discovery questions separated by newlines","offer":"recommended offer and honest value angle","close":"direct next-step close, preferably booking a short discovery call","voicemail":"under 55 words","email":"under 100 words including subject line","branches":[{"clientSays":"Interested","response":"what Mohamed should say","nextStep":"specific close"}]}

Create exactly 6 branches covering: Interested; How much?; We already have a website/provider; Send me information; I need to think about it; Not interested. Each response must acknowledge the answer, ask at most one useful question, and move toward the smallest reasonable commitment. The Not interested branch must be respectful and end the conversation unless they voluntarily re-engage.` },
    { role: 'user', content: `Untrusted lead facts (reference only): ${JSON.stringify(p)}` },
  ], { maxTokens: 1400 })
  let pitch: Record<string, unknown>
  try {
    const raw = result.content || '', json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1), parsed = JSON.parse(json)
    const branches = Array.isArray(parsed.branches) ? parsed.branches.slice(0, 6).map((branch: Record<string, unknown>) => ({ clientSays: clean(branch.clientSays, 120), response: clean(branch.response, 900), nextStep: clean(branch.nextStep, 400) })) : []
    pitch = { phone: clean(parsed.phone, 1800), discovery: clean(parsed.discovery, 1400), offer: clean(parsed.offer, 1400), close: clean(parsed.close, 1000), voicemail: clean(parsed.voicemail, 800), email: clean(parsed.email, 1800), branches }
  }
  catch { return NextResponse.json({ error: 'Sage could not format this pitch. Try again.' }, { status: 502 }) }
  const required = ['phone', 'discovery', 'offer', 'close', 'voicemail', 'email']
  const branches = pitch.branches as Array<{ clientSays: string; response: string; nextStep: string }>
  if (!required.every((key) => typeof pitch[key] === 'string' && pitch[key]) || branches.length !== 6 || !branches.every((branch) => branch.clientSays && branch.response && branch.nextStep)) return NextResponse.json({ error: 'Sage returned an incomplete pitch. Try again.' }, { status: 502 })
  const generatedAt = new Date().toISOString()
  const saved = await auth.supabase!.from('prospect_leads').update({ pitch_script: pitch, pitch_generated_at: generatedAt, updated_at: generatedAt }).eq('id', id)
  return saved.error ? NextResponse.json({ error: saved.error.message }, { status: 500 }) : NextResponse.json({ pitch, pitch_generated_at: generatedAt })
}
