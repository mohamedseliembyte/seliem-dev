import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Comma-separated list of Google emails allowed into the admin.
function allowedAdmins(): string[] {
  return (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 })
  }

  // 1. Pull the caller's auth token
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify the token → identify the user
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Gate by allow-list (if configured)
  const email = userData.user.email.toLowerCase()
  const admins = allowedAdmins()
  if (admins.length > 0 && !admins.includes(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Return the leads
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leads: data ?? [], admin: email })
}
