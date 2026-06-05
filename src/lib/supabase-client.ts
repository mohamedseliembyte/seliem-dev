import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Browser Supabase client ──────────────────────────────────────────────────
// Uses the PUBLISHABLE key only. Safe to ship to the browser. Handles the
// Google OAuth (PKCE) flow and persists the session in localStorage.

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient

  browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // we exchange the code manually in /admin
        flowType: 'pkce',
      },
    },
  )
  return browserClient
}
