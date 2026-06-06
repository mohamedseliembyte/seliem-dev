import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendTelegramMessage } from '@/lib/telegram'

// The signed-in client accepts/signs an agreement that belongs to them.
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = userData.user.email.toLowerCase()
  const signerName = (userData.user.user_metadata?.full_name as string) || (userData.user.user_metadata?.name as string) || email

  let body: { agreement_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const agreementId = body.agreement_id
  if (!agreementId) return NextResponse.json({ error: 'agreement_id required' }, { status: 400 })

  // Verify the agreement belongs to a lead owned by this user
  const { data: agreement } = await supabase.from('agreements').select('id, lead_id, price, status').eq('id', agreementId).maybeSingle()
  if (!agreement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: lead } = await supabase.from('leads').select('name, email').eq('id', agreement.lead_id).maybeSingle()
  if (!lead || lead.email.toLowerCase() !== email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (agreement.status === 'accepted') return NextResponse.json({ success: true, already: true })

  const { error } = await supabase
    .from('agreements')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), signer_name: signerName })
    .eq('id', agreementId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void sendTelegramMessage(`✅ <b>Agreement signed!</b>\n${signerName} accepted the $${Number(agreement.price).toLocaleString()} agreement.`)
  return NextResponse.json({ success: true })
}
