import { demos } from '@/data/demos'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { Demo } from '@/types'

// ── Personalized prospect previews ──────────────────────────────────────────
// Powers /for/[slug] — a one-off landing page built for a single cold-outreach
// prospect ("Prestige Cuts, here's what your site could look like").
//
// Prospects live in `prospect_leads` (synced from the Google Sheet). That table
// has no slug column, so we derive one from the business name and match it in
// JS after a trigram-indexed shortlist query. A query-string fallback lets you
// generate a link for anyone who isn't in the database yet.

export type ProspectPreview = {
  /** Present only for database-resolved prospects — powers view tracking. */
  id?: string
  business: string
  niche: string | null
  city: string | null
  state: string | null
  /** True when the lead has no independent website (priority tier 1). */
  noSite: boolean
  demo: Demo
  /** Where the data came from — useful for debugging a bad link. */
  source: 'database' | 'query'
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    // Strip combining diacritics left behind by NFKD (café → cafe).
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Keyword → demo slug. First match wins, so order matters (most specific first). */
const NICHE_RULES: Array<[RegExp, string]> = [
  [/barber|hair|salon|spa|nail|beauty|lash|tattoo/i, 'prestige-cuts'],
  [/restaurant|pizz|cafe|coffee|bakery|caterer|catering|food|bar\b|grill|diner|ice cream/i, 'velour-dining'],
  [/dent|orthodon|ortho|smile|oral/i, 'brightsmile-dental'],
  [/gym|fitness|yoga|pilates|crossfit|martial|dance|trainer/i, 'elevate-fitness'],
  [/real estate|realty|realtor|mortgage|broker/i, 'prime-realty'],
  [/clean|janitor|maid|pressure wash|soft wash|window clean|carpet/i, 'sparkle-clean'],
  [/auto|car|detail|tire|mechanic|collision|body shop|towing|transmission|windshield|glass/i, 'luxe-auto'],
  // Everything trade/contractor-shaped falls back to the construction demo.
  [/construct|contractor|roof|plumb|electric|hvac|heating|cooling|landscap|lawn|tree|fence|concrete|paving|masonry|handyman|remodel|renovat|garage door|gutter|septic|excavat|drywall|paint|floor|siding|window install|junk|haul|mov(ing|er)|pest|pool|appliance|locksmith|welding|restoration/i, 'apex-construction'],
]

const FALLBACK_DEMO = 'apex-construction'

export function pickDemoForNiche(niche?: string | null): Demo {
  const haystack = (niche || '').trim()
  if (haystack) {
    for (const [pattern, slug] of NICHE_RULES) {
      if (pattern.test(haystack)) {
        const match = demos.find((d) => d.slug === slug)
        if (match) return match
      }
    }
  }
  return demos.find((d) => d.slug === FALLBACK_DEMO) ?? demos[0]
}

// "and" comes from slugifying "&", which is still "&" in the stored business
// name — searching for it would never match. Legal suffixes are noise too.
const SEARCH_STOPWORDS = new Set(['and', 'the', 'llc', 'inc', 'co', 'corp', 'ltd'])

/**
 * ILIKE patterns to try, narrowest first. Two terms usually pins the business
 * down, but a one-word name whose slug carries a city suffix ("supercuts-
 * anchorage") only matches on the first term, so we keep that as a fallback.
 */
function slugToSearches(slug: string): Array<{ pattern: string; limit: number }> {
  const words = slug
    .split('-')
    .filter((w) => w.length > 1 && !SEARCH_STOPWORDS.has(w))
  if (!words.length) return []

  const narrow = words.slice(0, 2).join('%')
  const broad = words[0]
  return narrow === broad
    ? [{ pattern: broad, limit: 200 }]
    : [
        { pattern: narrow, limit: 50 },
        { pattern: broad, limit: 200 },
      ]
}

type LeadRow = {
  id: string
  business: string
  niche: string | null
  city: string | null
  state: string | null
  priority: string | null
}

/**
 * Look a prospect up by slug. Matches either `slugify(business)` or
 * `slugify(business + city)` so two businesses with the same name in
 * different cities can each have their own link.
 */
export async function findProspectBySlug(rawSlug: string): Promise<ProspectPreview | null> {
  // Normalize first — the slug is user-controlled, and stray `%`/`_` would be
  // read as ILIKE wildcards. slugify() is idempotent, so a good slug is intact.
  const slug = slugify(rawSlug)
  if (!slug) return null

  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const matches = (r: LeadRow) => {
    const base = slugify(r.business)
    const withCity = r.city ? slugify(`${r.business} ${r.city}`) : ''
    return base === slug || withCity === slug
  }

  let row: LeadRow | undefined
  for (const { pattern, limit } of slugToSearches(slug)) {
    const { data, error } = await supabase
      .from('prospect_leads')
      .select('id, business, niche, city, state, priority')
      .ilike('business', `%${pattern}%`)
      .limit(limit)

    if (error) return null
    row = (data as LeadRow[] | null)?.find(matches)
    if (row) break
  }
  if (!row) return null

  return {
    id: row.id,
    business: row.business,
    niche: row.niche,
    city: row.city,
    state: row.state,
    noSite: (row.priority || '').trim().startsWith('1'),
    demo: pickDemoForNiche(row.niche),
    source: 'database',
  }
}

/**
 * Fallback for prospects not yet in the database:
 *   /for/anything?b=Joe%27s%20Plumbing&c=Tulsa&s=OK&n=Plumber
 * Keeps the feature usable for one-off links without a sheet sync.
 */
export function prospectFromQuery(params: {
  b?: string
  c?: string
  s?: string
  n?: string
}): ProspectPreview | null {
  const business = (params.b || '').trim().slice(0, 80)
  if (!business) return null
  const niche = (params.n || '').trim().slice(0, 60) || null
  return {
    business,
    niche,
    city: (params.c || '').trim().slice(0, 60) || null,
    state: (params.s || '').trim().slice(0, 2).toUpperCase() || null,
    noSite: true,
    demo: pickDemoForNiche(niche),
    source: 'query',
  }
}

/** Human-readable "Anchorage, AK" (either part may be missing). */
export function formatLocation(city?: string | null, state?: string | null): string {
  return [city, state].filter(Boolean).join(', ')
}
