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
 * Save a lead to the database. Returns the row's id, or null on failure.
 * Never throws — a DB hiccup must not break the contact form.
 *
 * Deduplication: if a lead with the same email (case-insensitive) already
 * exists, the new inquiry is MERGED into it — the new message is appended, any
 * previously-missing details are backfilled, and duplicate_count is bumped so
 * the admin UI can flag it. A brand-new email is inserted as before.
 */
export async function saveLead(lead: LeadRecord): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  try {
    // ── Dedup: merge into an existing lead with the same email ───────────────
    const email = lead.email.trim()
    if (email && email.includes('@')) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id, message, duplicate_count, phone, business_name, business_type, budget, goals')
        .ilike('email', email)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (existing?.id) {
        const stamp = new Date().toISOString().slice(0, 10)
        const appended = `${existing.message ?? ''}\n\n— Follow-up (${stamp}):\n${lead.message}`.trim()
        const { error: mErr } = await supabase
          .from('leads')
          .update({
            message:         appended,
            duplicate_count: (existing.duplicate_count ?? 0) + 1,
            read_at:         null, // a follow-up re-flags the lead as unread

            // Backfill only fields the original lead is missing
            phone:         existing.phone         || lead.phone         || null,
            business_name: existing.business_name || lead.business_name || null,
            business_type: existing.business_type || lead.business_type || null,
            budget:        existing.budget        || lead.budget        || null,
            goals:         existing.goals         || lead.goals         || null,
          })
          .eq('id', existing.id)
        if (mErr) console.error('[supabase] saveLead merge error:', mErr.message)
        return existing.id
      }
    }

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
