import { NextResponse, type NextRequest } from 'next/server'
import { allowedAdmins, enforceRateLimit } from '@/lib/admin-api'
import { exchangeGoogleCode, googleAccount, readOAuthState } from '@/lib/google-sheets'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const state = readOAuthState(req.nextUrl.searchParams.get('state') || '')
  const code = req.nextUrl.searchParams.get('code')
  if (!state || !code || !allowedAdmins().includes(state.email.toLowerCase())) return NextResponse.redirect(new URL('/admin/prospects?google=invalid', req.url))
  try {
    if (code.length > 4096) throw new Error('Invalid authorization response.')
    const limiterClient = getSupabaseAdmin()
    if (!limiterClient) throw new Error('Database not configured.')
    const limited = await enforceRateLimit(limiterClient, state.email, 'google-callback', 5, 600)
    if (limited) return NextResponse.redirect(new URL('/admin/prospects?google=rate-limited', req.url))
    const tokens = await exchangeGoogleCode(code, req.nextUrl.origin)
    const account = await googleAccount(tokens.access_token)
    if (account.email.toLowerCase() !== state.email.toLowerCase()) throw new Error('Authorize with the same admin Google account.')
    const supabase = getSupabaseAdmin()
    if (!supabase) throw new Error('Database not configured.')
    const { data: existing } = await supabase.from('google_integrations').select('refresh_token').eq('id', 'google_sheets').maybeSingle()
    const refreshToken = tokens.refresh_token || existing?.refresh_token
    if (!refreshToken) throw new Error('Google did not issue a refresh token. Reconnect and approve access.')
    const { error } = await supabase.from('google_integrations').upsert({ id: 'google_sheets', account_email: account.email, refresh_token: refreshToken, scopes: (tokens.scope || '').split(' ').filter(Boolean), updated_at: new Date().toISOString() })
    if (error) throw error
    return NextResponse.redirect(new URL('/admin/prospects?google=connected', req.url))
  } catch (error) {
    const url = new URL('/admin/prospects', req.url); url.searchParams.set('google', 'error'); url.searchParams.set('message', error instanceof Error ? error.message : 'Connection failed')
    return NextResponse.redirect(url)
  }
}
