import type { NextRequest } from 'next/server'
import type { getSupabaseAdmin } from '@/lib/supabase'

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>

export type VerifiedChatUser = {
  email: string
  name: string
}

export async function getVerifiedChatUser(
  req: NextRequest,
  supabase: SupabaseAdmin,
): Promise<VerifiedChatUser | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)
  const email = data?.user?.email?.toLowerCase()
  if (error || !email) return null

  const metadata = data.user.user_metadata ?? {}
  const name = String(metadata.full_name ?? metadata.name ?? email.split('@')[0])
  return { email, name }
}

export function canAccessChatSession(sessionId: string, user: VerifiedChatUser | null): boolean {
  if (!sessionId.startsWith('user:')) return true
  return user?.email === sessionId.slice(5).toLowerCase()
}
