import { getSupabaseAdmin } from '@/lib/supabase'

// ── Daily CEO Briefing summary service ───────────────────────────────────────
// Pulls live stats from Supabase and formats the morning Telegram briefing.
// Maps to the current data model:
//   Leads      → leads table
//   Projects   → leads by status (won = active, completed = completed)
//   Payments   → payments table (pending = unpaid, >7d = overdue)
//   Tasks      → tasks table if present (gracefully 0 if not yet created)
//   Alerts     → derived (overdue invoices, new leads, live chats)

const log = (msg: string) => console.log(`[briefing] ${msg}`)

async function count(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  table: string,
  build: (q: ReturnType<NonNullable<ReturnType<typeof getSupabaseAdmin>>['from']>) => unknown,
): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from(table).select('*', { count: 'exact', head: true })
    q = build(q) ?? q
    const { count: c, error } = await q
    if (error) { log(`count ${table} error: ${error.message}`); return 0 }
    return c ?? 0
  } catch (e) {
    log(`count ${table} exception: ${e instanceof Error ? e.message : String(e)}`)
    return 0
  }
}

export async function generateBriefing(): Promise<string> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return '🚀 Good Morning Mohamed\n\n⚠️ Database not configured — no data available.'

  const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999)

  // ── Leads ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newLeads = await count(supabase, 'leads', (q: any) => q.gt('created_at', dayAgo))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalLeads = await count(supabase, 'leads', (q: any) => q)

  // ── Projects (mapped to lead status) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeProjects = await count(supabase, 'leads', (q: any) => q.eq('status', 'won'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completedProjects = await count(supabase, 'leads', (q: any) => q.eq('status', 'completed'))

  // ── Payments ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unpaid = await count(supabase, 'payments', (q: any) => q.eq('status', 'pending'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overdue = await count(supabase, 'payments', (q: any) => q.eq('status', 'pending').lt('created_at', weekAgo))

  // ── Tasks (optional table) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasksDueToday = await count(supabase, 'tasks', (q: any) =>
    q.eq('status', 'open').gte('due_date', startOfDay.toISOString()).lte('due_date', endOfDay.toISOString()),
  )

  // ── Alerts ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uncontacted = await count(supabase, 'leads', (q: any) => q.eq('status', 'new'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liveChats = await count(supabase, 'conversations', (q: any) => q.eq('status', 'human'))

  const alerts: string[] = []
  if (overdue > 0) alerts.push(`💸 ${overdue} overdue invoice${overdue > 1 ? 's' : ''}`)
  if (uncontacted > 0) alerts.push(`🆕 ${uncontacted} lead${uncontacted > 1 ? 's' : ''} awaiting first contact`)
  if (liveChats > 0) alerts.push(`💬 ${liveChats} live chat${liveChats > 1 ? 's' : ''} in progress`)
  if (alerts.length === 0) alerts.push('All clear ✅')

  log(`generated: leads ${totalLeads}/${newLeads} new, payments ${unpaid} unpaid`)

  return [
    '🚀 <b>Good Morning Mohamed</b>',
    '',
    '📈 <b>Leads</b>',
    `• New Leads: ${newLeads}`,
    `• Total Leads: ${totalLeads}`,
    '',
    '💼 <b>Projects</b>',
    `• Active Projects: ${activeProjects}`,
    `• Completed Projects: ${completedProjects}`,
    '',
    '💰 <b>Payments</b>',
    `• Unpaid Invoices: ${unpaid}`,
    `• Overdue Invoices: ${overdue}`,
    '',
    '📋 <b>Tasks</b>',
    `• Tasks Due Today: ${tasksDueToday}`,
    '',
    '⚠️ <b>Alerts</b>',
    ...alerts.map((a) => `• ${a}`),
  ].join('\n')
}
