import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'

// Resolves the signed-in client from their Supabase access token. Clients are
// matched to their records by verified email, the same rule /api/account uses.
export async function authorizeClient(
  req: NextRequest,
): Promise<{ supabase: SupabaseClient; email: string; response?: never } | { response: NextResponse }> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { response: NextResponse.json({ error: 'Database not configured.' }, { status: 500 }) }
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data, error } = await supabase.auth.getUser(token)
  const email = data?.user?.email?.toLowerCase()
  if (error || !email) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { supabase, email }
}

export type OwnedLead = {
  id: string
  name: string | null
  email: string | null
  business_name: string | null
  status: string | null
  stripe_customer_id: string | null
}

/** Loads a lead only if it belongs to `email`. */
export async function loadOwnedLead(supabase: SupabaseClient, leadId: string, email: string): Promise<OwnedLead | null> {
  const { data } = await supabase
    .from('leads')
    .select('id, name, email, business_name, status, stripe_customer_id')
    .eq('id', leadId)
    .maybeSingle()
  if (!data || (data.email ?? '').trim().toLowerCase() !== email) return null
  return data as OwnedLead
}
