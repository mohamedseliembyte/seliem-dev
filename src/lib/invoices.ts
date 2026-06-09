import type { SupabaseClient } from '@supabase/supabase-js'

export type InvoiceItem = { description: string; amount: number }

export type CreateInvoiceInput = {
  lead_id: string
  items: InvoiceItem[]
  due_date?: string | null
  notes?: string | null
  status?: 'draft' | 'sent'
}

// Shared invoice creator: validates line items, computes the total, inserts.
// Used by the admin API route and the AI assistant tool. Never throws.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createInvoice(supabase: SupabaseClient, input: CreateInvoiceInput): Promise<{ invoice?: any; error?: string }> {
  if (!input.lead_id) return { error: 'lead_id required' }
  const items = (input.items ?? [])
    .map((it) => ({ description: String(it.description ?? '').trim(), amount: Number(it.amount) }))
    .filter((it) => it.description && Number.isFinite(it.amount) && it.amount > 0)
  if (items.length === 0) return { error: 'At least one valid line item (description + positive amount) is required' }
  const total = items.reduce((t, it) => t + it.amount, 0)
  const status = input.status === 'sent' ? 'sent' : 'draft'
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert({ lead_id: input.lead_id, items, total, status, due_date: input.due_date || null, notes: input.notes || null })
      .select('*')
      .single()
    if (error) return { error: error.message }
    return { invoice: data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Insert failed' }
  }
}
