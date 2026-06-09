import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Returns the signed-in visitor's OWN inquiries + chats (matched by their
// verified Google email). No admin allow-list — any authenticated user can
// see their own data, and only their own.
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'Database not configured.' }, { status: 500 })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = userData.user.email.toLowerCase()

  // Their inquiries (case-insensitive email match)
  const { data: leads } = await supabase
    .from('leads')
    .select('id, created_at, type, business_name, budget, goals, message, status, domain_status')
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(50)

  // Their chat conversations + messages
  const leadIds = (leads ?? []).map((l) => l.id)
  let conversations: { id: string; status: string; summary: string | null; created_at: string }[] = []
  let messages: { conversation_id: string; role: string; content: string; created_at: string }[] = []

  if (leadIds.length > 0) {
    const { data: convos } = await supabase
      .from('conversations')
      .select('id, status, summary, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })
    conversations = convos ?? []

    const convoIds = conversations.map((c) => c.id)
    if (convoIds.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id, role, content, created_at')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: true })
        .limit(1000)
      messages = msgs ?? []
    }
  }

  // Their payments
  let payments: unknown[] = []
  let agreements: unknown[] = []
  let invoices: unknown[] = []
  if (leadIds.length > 0) {
    const { data: pays } = await supabase
      .from('payments')
      .select('id, lead_id, description, amount, currency, status, created_at, paid_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })
    payments = pays ?? []

    const { data: ags } = await supabase
      .from('agreements')
      .select('id, lead_id, scope, price, content, status, created_at, accepted_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })
    agreements = ags ?? []

    // Invoices the client can see: only sent + paid (drafts and voided/cancelled stay hidden).
    const { data: invs } = await supabase
      .from('invoices')
      .select('id, invoice_no, lead_id, items, total, currency, status, notes, due_date, created_at, paid_at')
      .in('lead_id', leadIds)
      .in('status', ['sent', 'paid'])
      .order('created_at', { ascending: false })
    invoices = invs ?? []
  }

  return NextResponse.json({
    user: { email, name: userData.user.user_metadata?.full_name ?? userData.user.user_metadata?.name ?? '', picture: userData.user.user_metadata?.avatar_url ?? userData.user.user_metadata?.picture ?? '' },
    leads: leads ?? [],
    conversations,
    messages,
    payments,
    agreements,
    invoices,
  })
}
