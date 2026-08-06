import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdmin, enforceRateLimit } from '@/lib/admin-api'
import { groqChat } from '@/lib/groq'
import { services } from '@/data/services'

// Turns "he wants his site on the app store and hooked to his domain" into a
// project label, a contract-ready scope and a price range — so a job described
// on a phone call can be turned into an agreement without guesswork.
//
// It suggests only. Nothing is saved, and the admin edits everything before it
// reaches a client.

const CATALOGUE = services
  .map((service) => `- ${service.name} (${service.startingAt}): ${service.summary}`)
  .join('\n')

export async function POST(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'scope-helper', 30, 3600); if (limited) return limited

  const body = await req.json().catch(() => null) as { description?: unknown } | null
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 2000) : ''
  if (description.length < 10) {
    return NextResponse.json({ error: 'Describe what they asked for in a sentence or two.' }, { status: 400 })
  }

  try {
    const result = await groqChat([
      {
        role: 'system',
        content: `You help Mohamed turn a job described in plain words into something he can put in an agreement.

His service catalogue and starting prices:
${CATALOGUE}

Return ONLY compact JSON:
{"project":"short label, ideally matching a catalogue service name","scope":"contract-ready scope: 3-6 concrete deliverables as a single newline-separated list, plus explicit exclusions where they matter","priceLow":number,"priceHigh":number,"questions":["anything genuinely unclear that he should confirm before quoting"]}

Rules: base prices on the catalogue starting points and the work actually described. Never invent facts he didn't state — if something is unknown, put it in questions rather than assuming. If the description is too vague to price, still give a range but say why in questions.`,
      },
      { role: 'user', content: description },
    ], { maxTokens: 700 })

    const raw = (result?.content || '').replace(/^```(?:json)?|```$/g, '').trim()
    const parsed = JSON.parse(raw)
    return NextResponse.json({
      project: String(parsed.project || '').slice(0, 120),
      scope: String(parsed.scope || '').slice(0, 4000),
      priceLow: Number(parsed.priceLow) || 0,
      priceHigh: Number(parsed.priceHigh) || 0,
      questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5).map(String) : [],
    })
  } catch (error) {
    console.error('[scope-helper] failed:', error)
    return NextResponse.json({ error: 'Could not draft that — try describing it again.' }, { status: 502 })
  }
}
