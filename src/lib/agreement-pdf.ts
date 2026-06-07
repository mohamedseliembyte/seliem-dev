// Zero-dependency "download as PDF" for agreements.
//
// Agreements are stored as plain text (agreements.content). Rather than pull in
// a PDF library, we render a clean, print-styled HTML document in a hidden
// iframe and invoke the browser's print dialog, which offers "Save as PDF".
// Works the same for both the admin and the client account views.

export type PrintableAgreement = {
  scope: string
  price: number
  content: string
  status: string
  created_at?: string
  accepted_at?: string | null
  signer_name?: string | null
  clientName?: string | null
}

const GOLD = '#c9a84c'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildHtml(a: PrintableAgreement): string {
  const created = a.created_at ? new Date(a.created_at).toLocaleDateString() : ''
  const signed =
    a.status === 'accepted' && a.accepted_at
      ? `Signed by ${esc(a.signer_name || a.clientName || 'Client')} on ${new Date(a.accepted_at).toLocaleString()}`
      : 'Awaiting signature'

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Seliem.dev — Service Agreement</title>
<style>
  @page { margin: 24mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; line-height: 1.6; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${GOLD}; padding-bottom: 12px; margin-bottom: 20px; }
  .brand { font-size: 22px; font-weight: bold; color: ${GOLD}; letter-spacing: 0.5px; }
  .meta { font-size: 12px; color: #555; text-align: right; }
  .summary { display: flex; gap: 24px; margin-bottom: 18px; font-size: 13px; }
  .summary b { display: block; color: #888; font-weight: normal; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .content { white-space: pre-wrap; font-size: 13.5px; }
  .status { margin-top: 6px; padding: 4px 10px; border-radius: 4px; display: inline-block; font-size: 12px; background: #f3eccf; color: #7a5c00; }
  .status.signed { background: #e3f3e3; color: #1f6b1f; }
  .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">Seliem.dev</div>
    <div class="meta">Service Agreement${created ? `<br/>${esc(created)}` : ''}</div>
  </div>
  <div class="summary">
    <div><b>Total Price</b>$${Number(a.price).toLocaleString()}</div>
    <div><b>Scope</b>${esc(a.scope)}</div>
  </div>
  <div><span class="status ${a.status === 'accepted' ? 'signed' : ''}">${esc(signed)}</span></div>
  <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
  <div class="content">${esc(a.content)}</div>
  <div class="foot">Seliem.dev · Brooklyn, New York · seliem.dev</div>
</body>
</html>`
}

/** Render the agreement in a hidden iframe and open the print/Save-as-PDF dialog. */
export function downloadAgreementPdf(a: PrintableAgreement): void {
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
  doc.write(buildHtml(a))
  doc.close()

  const cleanup = () => { try { document.body.removeChild(iframe) } catch { /* already gone */ } }
  const run = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch { /* ignore */ }
    // Remove after the dialog has had time to read the document.
    setTimeout(cleanup, 1000)
  }

  // Give the iframe a tick to lay out before printing.
  if (iframe.contentWindow?.document.readyState === 'complete') setTimeout(run, 100)
  else iframe.onload = () => setTimeout(run, 100)
}
