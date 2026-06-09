// Zero-dependency "download as PDF" for invoices — renders a print-styled HTML
// document in a hidden iframe and opens the browser's print / Save-as-PDF dialog.
// Mirrors src/lib/agreement-pdf.ts.

export type PrintableInvoice = {
  invoice_no?: number | string | null
  items: { description: string; amount: number }[]
  total: number
  status: string
  currency?: string | null
  notes?: string | null
  due_date?: string | null
  created_at?: string
  clientName?: string | null
  clientEmail?: string | null
}

const GOLD = '#c9a84c'

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
const money = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function buildHtml(inv: PrintableInvoice): string {
  const created = inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''
  const due = inv.due_date ? new Date(inv.due_date).toLocaleDateString() : ''
  const no = inv.invoice_no != null ? `#${esc(inv.invoice_no)}` : ''
  const rows = (inv.items ?? [])
    .map((it) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(it.description)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${money(it.amount)}</td></tr>`)
    .join('')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Seliem.dev — Invoice ${esc(no)}</title>
<style>
  @page { margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; line-height: 1.6; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid ${GOLD}; padding-bottom: 12px; margin-bottom: 20px; }
  .brand { font-size: 22px; font-weight: bold; color: ${GOLD}; letter-spacing: 0.5px; }
  .meta { font-size: 12px; color: #555; text-align: right; }
  .bill { font-size: 13px; margin-bottom: 18px; }
  .bill b { color: #888; font-weight: normal; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; border-bottom: 2px solid #ddd; padding: 6px 0; }
  th.amt { text-align: right; }
  .total { margin-top: 16px; text-align: right; font-size: 18px; font-weight: bold; }
  .status { margin-top: 6px; padding: 4px 10px; border-radius: 4px; display: inline-block; font-size: 12px; background: #f3eccf; color: #7a5c00; }
  .status.paid { background: #e3f3e3; color: #1f6b1f; }
  .notes { margin-top: 18px; font-size: 12.5px; color: #444; white-space: pre-wrap; }
  .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">Seliem.dev</div>
    <div class="meta"><strong>INVOICE ${esc(no)}</strong>${created ? `<br/>Issued ${esc(created)}` : ''}${due ? `<br/>Due ${esc(due)}` : ''}</div>
  </div>
  <div class="bill">
    <b>Bill to</b>
    ${esc(inv.clientName || 'Client')}${inv.clientEmail ? ` · ${esc(inv.clientEmail)}` : ''}
  </div>
  <div><span class="status ${inv.status === 'paid' ? 'paid' : ''}">${esc(inv.status === 'paid' ? 'PAID' : inv.status.toUpperCase())}</span></div>
  <table style="margin-top:14px">
    <thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead>
    <tbody>${rows || '<tr><td style="padding:8px 0;color:#888">No line items</td><td></td></tr>'}</tbody>
  </table>
  <div class="total">Total: ${money(inv.total)}</div>
  ${inv.notes ? `<div class="notes"><b style="display:block;color:#888;font-size:11px;text-transform:uppercase">Notes</b>${esc(inv.notes)}</div>` : ''}
  <div class="foot">Seliem.dev · Brooklyn, New York · seliem.dev</div>
</body>
</html>`
}

/** Render the invoice in a hidden iframe and open the print / Save-as-PDF dialog. */
export function downloadInvoicePdf(inv: PrintableInvoice): void {
  if (typeof window === 'undefined') return
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }
  doc.open()
  doc.write(buildHtml(inv))
  doc.close()

  const cleanup = () => { try { document.body.removeChild(iframe) } catch { /* gone */ } }
  const run = () => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() } catch { /* ignore */ }
    setTimeout(cleanup, 1000)
  }
  if (iframe.contentWindow?.document.readyState === 'complete') setTimeout(run, 100)
  else iframe.onload = () => setTimeout(run, 100)
}
