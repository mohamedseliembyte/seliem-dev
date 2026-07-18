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
- Third-Party Services (Seliem.dev covers its internal development tools; client is responsible for client-owned/client-specific domain, email, premium software, hosting upgrades, payment processing, SMS, and usage-based API/AI fees unless expressly included)
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

Third-Party Services
Seliem.dev is responsible for its own internal development tools. The Client is responsible for client-owned or client-specific costs—including domain registration and renewal, professional email, premium software, hosting upgrades, payment processing, SMS, and usage-based API or AI services—unless this agreement expressly includes them.

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
