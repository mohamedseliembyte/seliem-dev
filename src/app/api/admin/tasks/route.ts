import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Admin task management. Same auth pattern as the other admin routes: verify
// the caller's Supabase JWT and check the email against the ADMIN_EMAIL allow-list.
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

// GET — list tasks (newest first)
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, due_date, lead_id, completed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data ?? [] })
}

// POST — create a task
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  let body: { title?: string; due_date?: string | null; lead_id?: string | null }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const title = (body.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      status: 'open',
      due_date: body.due_date || null,
      lead_id: body.lead_id || null,
    })
    .select('id, title, status, due_date, lead_id, completed_at, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

// PATCH — update a task (complete/reopen, edit title or due date)
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  const auth = await authorize(req, supabase)
  if (auth instanceof NextResponse) return auth

  let body: { id?: string; status?: string; title?: string; due_date?: string | null }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const id = body.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.status !== undefined) {
    if (!['open', 'done'].includes(body.status)) {
      return NextResponse.json({ error: "status must be 'open' or 'done'" }, { status: 400 })
    }
    updates.status = body.status
    updates.completed_at = body.status === 'done' ? new Date().toISOString() : null
  }
  if (body.title !== undefined) updates.title = String(body.title).trim()
  if (body.due_date !== undefined) updates.due_date = body.due_date || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase.from('tasks').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
