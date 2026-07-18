import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createInvoice, type InvoiceItem } from '@/lib/invoices'

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
  if (admins.length === 0 || !admins.includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return email
}

// GET — list invoices
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_no, lead_id, items, total, currency, status, notes, due_date, created_at, paid_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data ?? [] })
}

// POST — create an invoice
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  let body: { lead_id?: string; items?: InvoiceItem[]; due_date?: string | null; notes?: string | null; status?: 'draft' | 'sent' }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  if (!body.lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

  const result = await createInvoice(supabase, {
    lead_id: body.lead_id,
    items: body.items ?? [],
    due_date: body.due_date,
    notes: body.notes,
    status: body.status,
  })
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ invoice: result.invoice })
}

// PATCH — update an invoice's status (mark sent / paid / void / draft)
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  let body: { id?: string; status?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const id = body.id
  const status = body.status
  if (!id || !status || !['draft', 'sent', 'paid', 'void'].includes(status)) {
    return NextResponse.json({ error: 'Valid id and status required' }, { status: 400 })
  }
  const updates: Record<string, unknown> = { status }
  updates.paid_at = status === 'paid' ? new Date().toISOString() : null
  const { error } = await supabase.from('invoices').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
