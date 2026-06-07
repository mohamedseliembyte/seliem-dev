import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Browser Supabase client ──────────────────────────────────────────────────
// Uses the PUBLISHABLE key only. Safe to ship to the browser. Handles the
// Google OAuth (PKCE) flow and persists the session in localStorage.

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient

  // Fall back to harmless placeholders if the env vars aren't present. This
  // matters at BUILD time: /admin and /account are prerendered, which runs this
  // function — and createClient() throws on an empty URL, failing the whole
  // build (e.g. preview deploys that don't get Production-scoped vars). In a
  // correctly configured runtime the real NEXT_PUBLIC_* values are inlined and
  // used; the placeholders only ever apply when the vars are genuinely missing.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    console.warn('[supabase-client] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — using placeholders (auth/data will not work until these are set).')
  }

  browserClient = createClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder-anon-key',
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
