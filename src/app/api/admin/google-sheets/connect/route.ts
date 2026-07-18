import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdmin, enforceRateLimit } from '@/lib/admin-api'
import { googleAuthorizationUrl } from '@/lib/google-sheets'

export async function POST(req: NextRequest) {
  const auth = await authorizeAdmin(req)
  if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'google-connect', 5, 600)
  if (limited) return limited
  try { return NextResponse.json({ url: googleAuthorizationUrl(auth.email!, req.nextUrl.origin) }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'OAuth setup failed.' }, { status: 500 }) }
}
