import { getSupabaseAdmin } from '@/lib/supabase'
import { groqChat, type ChatMessage } from '@/lib/groq'

// Builds a compact, information-rich snapshot of the business for the AI to reason over.
export async function buildBusinessContext(): Promise<string> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return 'No data available.'

  const dayAgo = new Date(Date.now() - 86_400_000).toISOString()

  const { data: leads } = await supabase
    .from('leads')
    .select('customer_no, name, email, business_name, business_type, budget, status, domain_status, created_at')
    .order('created_at', { ascending: false })
    .limit(40)

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status, description, lead_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: convos } = await supabase
    .from('conversations')
    .select('lead_id, status, summary')
    .limit(80)

  const all = leads ?? []
  const newCount = all.filter((l) => l.created_at > dayAgo).length
  const byStatus = (s: string) => all.filter((l) => l.status === s).length

  const lines: string[] = []
  lines.push(`Today: ${new Date().toDateString()}`)
  lines.push('')
  lines.push(`LEADS — total ${all.length}, new in 24h ${newCount}. By status: new ${byStatus('new')}, contacted ${byStatus('contacted')}, qualified ${byStatus('qualified')}, won ${byStatus('won')}, lost ${byStatus('lost')}.`)
  lines.push('')
  lines.push('RECENT LEADS:')
  all.slice(0, 15).forEach((l) => {
    lines.push(`#${l.customer_no ?? '?'} ${l.name} (${l.email}) — ${l.business_name || 'N/A'} · ${l.budget || 'no budget'} · status: ${l.status} · domain: ${l.domain_status || 'unknown'}`)
  })
  lines.push('')

  const pays = payments ?? []
  const pending = pays.filter((p) => p.status === 'pending')
  const paid = pays.filter((p) => p.status === 'paid')
  const sum = (rows: { amount: number }[]) => rows.reduce((t, r) => t + Number(r.amount), 0)
  lines.push(`PAYMENTS — paid ${paid.length} ($${sum(paid).toLocaleString()}), pending ${pending.length} ($${sum(pending).toLocaleString()}).`)
  if (pending.length > 0) {
    lines.push('UNPAID:')
    pending.slice(0, 15).forEach((p) => lines.push(`$${Number(p.amount).toLocaleString()} — ${p.description}`))
  }
  lines.push('')

  const liveChats = (convos ?? []).filter((c) => c.status === 'human').length
  lines.push(`LIVE CHATS in progress: ${liveChats}.`)

  return lines.join('\n')
}

const SYSTEM = `You are Mohamed's private AI business assistant for Seliem.dev, his web design & AI automation agency. Answer his questions about his business using ONLY the live DATA provided. You can count, summarize, identify who hasn't paid, flag what needs attention, and give short practical business advice. Be concise and Telegram-friendly (short paragraphs, simple bullet points with •). If the data doesn't contain something, say so honestly.`

export async function askAdminAssistant(question: string): Promise<string> {
  try {
    const context = await buildBusinessContext()
    const messages: ChatMessage[] = [
      { role: 'system', content: `${SYSTEM}\n\n=== LIVE BUSINESS DATA ===\n${context}` },
      { role: 'user', content: question },
    ]
    const { content } = await groqChat(messages, false)
    return content || "I couldn't generate an answer — try rephrasing."
  } catch (err) {
    console.error('[admin-assistant] error:', err instanceof Error ? err.message : String(err))
    return '⚠️ I hit an error pulling your data. Try again in a moment.'
  }
}
