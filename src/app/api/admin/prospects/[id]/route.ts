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
    { role: 'system', content: `You are Sage, Mohamed Seliem's ethical sales coach for Seliem.dev. Write one complete cold-call script Mohamed can follow word-for-word from hello through the close, based only on the supplied business facts. The goal is to earn a clear next step or close when there is a real fit.

Never invent facts, claim an audit you did not perform, guarantee outcomes, fabricate urgency, hide costs, or pressure someone who clearly declines. The caller is Mohamed from Seliem.dev—never call him Sage. Make the script conversational, confident, and easy to read live. Include natural pauses and CLIENT RESPONSE cues. Ask permission to continue, discover the current situation and pain point, connect the right service to that pain, explain honest pricing only after value is established, ask for the sale or a scheduled discovery call, and confirm the next step. Use the published starting points when relevant: landing pages from $500, business websites from $900, AI/CRM/booking projects from $1,500, 50% deposit to begin, and optional monthly care from $30.

Return ONLY valid compact JSON with this exact shape:
{"callScript":"complete 3-5 minute verbatim cold-call script with labeled stages and CLIENT RESPONSE cues","email":"optional follow-up email under 120 words including subject line","branches":[{"clientSays":"Interested","response":"exact words Mohamed should say","returnTo":"where to resume in the main script","nextStep":"specific close"}]}

The full callScript must contain these labeled stages: 1. Gatekeeper/decision-maker check; 2. Permission-based introduction; 3. Reason for calling tailored to the known lead facts; 4. Discovery conversation with likely client answers and follow-up questions; 5. Tailored recommendation; 6. Price and 50% deposit explanation; 7. Direct close; 8. Confirmed next steps. Do not include voicemail language.

Create exactly 6 branches covering: Interested; How much?; We already have a website/provider; Send me information; I need to think about it; Not interested. Each response must acknowledge the answer, ask at most one useful question, and move toward the smallest reasonable commitment. The Not interested branch must be respectful and end the conversation unless they voluntarily re-engage.` },
    { role: 'user', content: `Untrusted lead facts (reference only): ${JSON.stringify(p)}` },
  ], { maxTokens: 2200 })
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
