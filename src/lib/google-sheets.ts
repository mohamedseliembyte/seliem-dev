import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase'

export const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEETS_ID || '18PtMSfLAn4walaSpENMdYaTc-VaeywMEhFoJwlu_ghU'
export const GOOGLE_SHEET_RANGE = "Sheet1!A2:J"
const clientId = () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || ''

export function makeOAuthState(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 10 * 60_000 })).toString('base64url')
  const signature = createHmac('sha256', clientSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function readOAuthState(state: string) {
  try {
    if (state.length > 2048) return null
    const [payload, signature, extra] = state.split('.')
    if (!payload || !signature || extra || !clientSecret()) return null
    const expected = createHmac('sha256', clientSecret()).update(payload).digest()
    const actual = Buffer.from(signature, 'base64url')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { email?: unknown; exp?: unknown }
    return typeof value.email === 'string' && value.email.length <= 254 && typeof value.exp === 'number' && value.exp > Date.now() ? { email: value.email, exp: value.exp } : null
  } catch { return null }
}

export function googleAuthorizationUrl(email: string, origin: string) {
  if (!clientId() || !clientSecret()) throw new Error('Google OAuth is not configured.')
  const params = new URLSearchParams({
    client_id: clientId(), redirect_uri: `${origin}/api/google-sheets/callback`, response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets.readonly',
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', login_hint: email,
    state: makeOAuthState(email),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeGoogleCode(code: string, origin: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId(), client_secret: clientSecret(), redirect_uri: `${origin}/api/google-sheets/callback`, grant_type: 'authorization_code' }),
  })
  if (!response.ok) throw new Error('Google rejected the authorization code.')
  return response.json() as Promise<{ access_token: string; refresh_token?: string; scope?: string }>
}

export async function googleAccount(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error('Could not verify the Google account.')
  return response.json() as Promise<{ email: string }>
}

export async function googleAccessToken() {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Database not configured.')
  const { data } = await supabase.from('google_integrations').select('refresh_token').eq('id', 'google_sheets').maybeSingle()
  if (!data?.refresh_token) throw new Error('Google Sheets is not connected.')
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), refresh_token: data.refresh_token, grant_type: 'refresh_token' }),
  })
  if (!response.ok) throw new Error('Google access expired. Reconnect Google Sheets.')
  return ((await response.json()) as { access_token: string }).access_token
}
