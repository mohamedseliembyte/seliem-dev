import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { saveLead } from '@/lib/supabase'
import { authorizeAdmin, enforceRateLimit } from '@/lib/admin-api'
import { groqChat } from '@/lib/groq'
import { generateAgreementText } from '@/lib/agreement'
import { sendTelegramMessage } from '@/lib/telegram'

const emailPattern = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

const CUSTOM_PROJECT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'prepare_custom_project',
    description: 'Extract a custom web or AI automation project into contract-ready fields. Do not invent missing identity, contact, price, or scope details.',
    parameters: {
      type: 'object',
      properties: {
        client_name: { type: 'string' },
        client_email: { type: 'string' },
        phone: { type: 'string' },
        business_name: { type: 'string' },
        project_scope: { type: 'string', description: 'Clear contract scope with deliverables and any stated exclusions.' },
        total_price: { type: 'number', description: 'Total USD price only when the admin stated one.' },
        notes: { type: 'string', description: 'Important context or missing information the admin should review.' },
      },
      required: ['client_name', 'client_email', 'project_scope', 'total_price', 'notes'],
    },
  },
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const supabase = auth.supabase!
  const limited = await enforceRateLimit(supabase, auth.email!, 'custom-project', 20, 600); if (limited) return limited

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const input = body as Record<string, unknown>

  if (input.action === 'analyze') {
    const description = text(input.description, 5000)
    if (!description) return NextResponse.json({ error: 'Describe the project first.' }, { status: 400 })
    const result = await groqChat([
      {
        role: 'system',
        content: 'You help Mohamed create custom Seliem.dev projects. Extract only facts he provided. Never invent an email, price, deliverable, deadline, or legal promise. Put missing information in notes and use empty strings or 0 for missing fields.',
      },
      { role: 'user', content: description },
    ], { tools: [CUSTOM_PROJECT_TOOL], toolChoice: 'required', maxTokens: 700 })
    const call = result.toolCalls?.find((c) => c.function?.name === 'prepare_custom_project')
    if (!call) return NextResponse.json({ error: 'Sage could not structure that project. Try adding the client, scope, and price.' }, { status: 422 })
    try {
      const raw = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
      const project = { client_name: text(raw.client_name, 120), client_email: text(raw.client_email, 254), phone: text(raw.phone, 40), business_name: text(raw.business_name, 160), project_scope: text(raw.project_scope, 10_000), total_price: Number.isFinite(Number(raw.total_price)) ? Math.max(0, Math.min(Number(raw.total_price), 10_000_000)) : 0, notes: text(raw.notes, 2_000) }
      return NextResponse.json({ project })
    } catch {
      return NextResponse.json({ error: 'Sage returned an invalid project draft.' }, { status: 422 })
    }
  }

  if (input.action === 'create') {
    const clientName = text(input.client_name, 120)
    const clientEmail = text(input.client_email, 254).toLowerCase()
    const phone = text(input.phone, 40)
    const businessName = text(input.business_name, 160)
    const scope = text(input.project_scope, 10_000)
    const price = Number(input.total_price)
    if (!clientName || !emailPattern.test(clientEmail) || !scope || !Number.isFinite(price) || price <= 0 || price > 10_000_000 || Math.round(price * 100) !== price * 100) {
      return NextResponse.json({ error: 'Client name, valid email, scope, and positive price are required.' }, { status: 400 })
    }

    const leadId = await saveLead({
      type: 'contact', name: clientName, email: clientEmail, phone: phone || null,
      business_name: businessName || null, goals: scope, budget: `$${price.toLocaleString()}`,
      message: `Custom project created from admin.\n\n${scope}`,
    })
    if (!leadId) return NextResponse.json({ error: 'Could not create the client record.' }, { status: 500 })

    const content = await generateAgreementText({ clientName, businessName, scope, price })
    const { data: agreement, error } = await supabase.from('agreements')
      .insert({ lead_id: leadId, scope, price, content, status: 'sent' }).select('*').single()
    if (error || !agreement) return NextResponse.json({ error: error?.message || 'Could not create agreement.' }, { status: 500 })

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
    void sendTelegramMessage(`📄 Custom project agreement created for ${clientName} — $${price.toLocaleString()}.`)
    return NextResponse.json({ lead, agreement })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
