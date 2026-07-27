import { getSupabaseBrowser } from '@/lib/supabase-client'

/**
 * A 401/403 from an admin endpoint means the stored Supabase session is stale —
 * the token is still in localStorage, the server just won't accept it anymore.
 *
 * Without this, the dashboard renders normally with "0 matching businesses" and
 * "Last sync: Never", which reads as though every lead was deleted. Clearing the
 * session flips both admin pages back to their sign-in screen instead.
 *
 * Returns true when the caller should stop and drop its local token.
 */
export async function sessionExpired(response: Response): Promise<boolean> {
  if (response.status !== 401 && response.status !== 403) return false
  try { await getSupabaseBrowser().auth.signOut() } catch { /* already gone — the redirect is what matters */ }
  return true
}
