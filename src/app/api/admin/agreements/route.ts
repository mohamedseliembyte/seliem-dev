import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateAgreementText } from '@/lib/agreement'
import { sendTelegramMessage } from '@/lib/telegram'

function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

async function authorize(req: NextRequest, supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admins = allowedAdmins()
  if (admins.length === 0 || !admins.includes(data.user.email.toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return data.user.email.toLowerCase()
}

// POST — generate + save an agreement for a lead
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  let body: { lead_id?: string; scope?: string; price?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const lead_id = body.lead_id
  const scope = (body.scope ?? '').trim()
  const price = Number(body.price)
  if (!lead_id || !scope || !price || price <= 0) {
    return NextResponse.json({ error: 'lead_id, scope and a positive price are required' }, { status: 400 })
  }

  const { data: lead } = await supabase.from('leads').select('name, business_name, email').eq('id', lead_id).maybeSingle()

  const content = await generateAgreementText({
    clientName: lead?.name || 'Client',
    businessName: lead?.business_name || '',
    scope,
    price,
  })

  const { data, error } = await supabase
    .from('agreements')
    .insert({ lead_id, scope, price, content, status: 'sent' })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void sendTelegramMessage(`📄 Agreement created for ${lead?.name || 'client'} — $${price.toLocaleString()}. Sent to their account to sign.`)
  return NextResponse.json({ agreement: data })
}
