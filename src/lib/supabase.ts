import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Server-only Supabase admin client ───────────────────────────────────────
// Uses the SECRET key, which bypasses Row Level Security. NEVER import this
// into a client component — it must only run on the server (API routes, etc.).

let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    console.warn('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — DB disabled.')
    return null
  }

  cached = createClient(url, key, { auth: { persistSession: false } })
  return cached
}

// ── Lead persistence ─────────────────────────────────────────────────────────

export type LeadRecord = {
  type: 'support' | 'contact'
  name: string
  email: string
  message: string
  phone?: string | null
  business_name?: string | null
  business_type?: string | null
  budget?: string | null
  goals?: string | null
}

/**
 * Save a lead to the database. Returns the new row's id, or null on failure.
 * Never throws — a DB hiccup must not break the contact form.
 */
export async function saveLead(lead: LeadRecord): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        type:          lead.type,
        name:          lead.name,
        email:         lead.email,
        message:       lead.message,
        phone:         lead.phone || null,
        business_name: lead.business_name || null,
        business_type: lead.business_type || null,
        budget:        lead.budget || null,
        goals:         lead.goals || null,
        source:        'website_form',
        status:        'new',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[supabase] saveLead error:', error.message)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.error('[supabase] saveLead exception:', err instanceof Error ? err.message : String(err))
    return null
  }
}
