import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

async function authorize(req: NextRequest, supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = data.user.email.toLowerCase()
  const admins = allowedAdmins()
  if (admins.length > 0 && !admins.includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return email
}

// POST — create a payment request for a lead
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  let body: { lead_id?: string; description?: string; amount?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const lead_id = body.lead_id
  const description = (body.description ?? '').trim()
  const amount = Number(body.amount)
  if (!lead_id || !description) {
    return NextResponse.json({ error: 'lead_id and description are required' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a finite number greater than 0' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({ lead_id, description, amount, status: 'pending', method: 'paypal' })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payment: data })
}

// PATCH — update a payment's status (mark paid / pending / canceled)
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  let body: { id?: string; status?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const id = body.id
  const status = body.status
  if (!id || !status || !['pending', 'paid', 'canceled'].includes(status)) {
    return NextResponse.json({ error: 'Valid id and status required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { status }
  updates.paid_at = status === 'paid' ? new Date().toISOString() : null

  const { error } = await supabase.from('payments').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
