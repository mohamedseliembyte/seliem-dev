import { groqChat } from '@/lib/groq'

// Uses the AI to draft a clear, professional service agreement from the
// agreed scope + price. Returns plain text (with simple headings).
export async function generateAgreementText(p: {
  clientName: string
  businessName: string
  scope: string
  price: number
}): Promise<string> {
  const system = `You draft concise, professional, plain-English service agreements for Seliem.dev — a web design & AI automation agency based in Brooklyn, New York. Output ONLY the agreement text (no preamble, no markdown fences).

Include these sections with clear headings:
- Parties (Seliem.dev and the client)
- Project Scope (use what's provided)
- Total Price
- Payment Terms (default: 50% deposit to begin, remaining 50% on completion, unless otherwise noted)
- Client-Owned Services (the project price covers Seliem.dev's work and working tools; client pays providers directly only for approved services registered for or consumed by their business, including domain, email, upgraded hosting, chosen premium apps, payment processing, business SMS/phone, and live-product API/AI usage, unless expressly included)
- Optional Maintenance (not included unless written in the scope; basic care may be offered from $30/month with defined limits, while larger projects require a separate plan)
- Timeline (state "to be confirmed in writing")
- Revisions (2 rounds included)
- Changes Outside Scope (require written approval and are billed at $50/hour or separately quoted)
- Client Responsibilities (timely feedback, content/materials, rights to provided content)
- Ownership (transfers to client on full payment; third-party/pre-existing tools excluded)
- Governing Law (State of New York)

Keep it under ~400 words, friendly but professional. End with a line for digital acceptance.`

  const user = `Draft the agreement.\nClient name: ${p.clientName}\nBusiness: ${p.businessName || 'N/A'}\nAgreed scope: ${p.scope}\nTotal price: $${p.price}`

  try {
    const { content } = await groqChat(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      false,
    )
    return content || fallbackAgreement(p)
  } catch (err) {
    console.error('[agreement] generation failed:', err instanceof Error ? err.message : String(err))
    return fallbackAgreement(p)
  }
}

function fallbackAgreement(p: { clientName: string; businessName: string; scope: string; price: number }): string {
  return `SERVICE AGREEMENT

Parties
This agreement is between Seliem.dev ("Provider") and ${p.clientName}${p.businessName ? ` of ${p.businessName}` : ''} ("Client").

Project Scope
${p.scope}

Total Price
$${Number(p.price).toLocaleString()}

Payment Terms
A 50% deposit is due before work begins. The remaining 50% is due before launch, transfer, or final delivery.

Client-Owned Services
The project price covers Seliem.dev's work and the tools it uses to perform that work. The Client pays providers directly only for services registered for or consumed by the Client's business—including domain registration and renewal, professional email, upgraded hosting, premium apps selected by the Client, payment processing, business SMS or phone usage, and live-product API or AI usage—unless this agreement expressly includes them. Seliem.dev will obtain the Client's approval before adding a paid client-owned service.

Optional Maintenance
Ongoing maintenance is not included unless listed in the Project Scope. Basic care may be offered from $30 per month with defined limits; larger or higher-usage projects require a separate written plan.

Timeline
To be confirmed in writing.

Revisions
Two (2) rounds of revisions are included.

Changes Outside Scope
Requests beyond the written scope, included revisions, or maintenance allowance require written approval and are billed at $50 per hour or separately quoted.

Client Responsibilities
Provide timely feedback, content, and materials, and confirm rights to any content provided.

Ownership
Ownership of final deliverables transfers to the Client upon full payment. Pre-existing and third-party tools are excluded.

Governing Law
This agreement is governed by the laws of the State of New York.

By accepting below, both parties agree to these terms.`
}
