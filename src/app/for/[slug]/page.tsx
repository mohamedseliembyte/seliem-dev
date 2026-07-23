import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { ViewBeacon } from '@/components/ViewBeacon'
import {
  findProspectBySlug,
  prospectFromQuery,
  formatLocation,
  type ProspectPreview,
} from '@/lib/prospect-preview'

const CAL_URL = 'https://cal.com/seliem.dev'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ b?: string; c?: string; s?: string; n?: string }>
}

async function resolveProspect(
  slug: string,
  query: { b?: string; c?: string; s?: string; n?: string },
): Promise<ProspectPreview | null> {
  return (await findProspectBySlug(slug)) ?? prospectFromQuery(query)
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params
  const prospect = await resolveProspect(slug, await searchParams)
  if (!prospect) return { title: 'Preview · Seliem.dev' }

  return {
    title: `A website concept for ${prospect.business} · Seliem.dev`,
    description: `See what a modern, mobile-friendly website could look like for ${prospect.business}.`,
    // Outreach pages are one-to-one — keep them out of search results.
    robots: { index: false, follow: false },
  }
}

export default async function ProspectPreviewPage({ params, searchParams }: Props) {
  const { slug } = await params
  const prospect = await resolveProspect(slug, await searchParams)
  if (!prospect) notFound()

  const { business, city, state, niche, demo, noSite } = prospect
  const location = formatLocation(city, state)

  const benefits = noSite
    ? [
        'Show up on Google when people search for you',
        'Take bookings and messages without playing phone tag',
        'Look established next to every competitor in town',
      ]
    : [
        'Loads fast and works properly on phones',
        'Turns visitors into booked jobs, not dead ends',
        'Looks like the quality of work you actually do',
      ]

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {prospect.id && <ViewBeacon prospectId={prospect.id} />}
      {/* ── Personalized hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#c9a84c]/5 blur-3xl pointer-events-none"
        />

        <div className="relative container-max">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/5 px-4 py-2 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
            <span className="text-xs font-semibold tracking-widest uppercase text-[#c9a84c]/80">
              Prepared for {business}
            </span>
          </div>

          <h1 className="text-[clamp(2.25rem,6vw,4.25rem)] font-black leading-[1.05] tracking-tight mb-6 text-balance max-w-4xl">
            <span className="block text-white">{business},</span>
            <span className="block gold-text">here&apos;s what your website could look like.</span>
          </h1>

          {/* Niche and location sit in their own slot rather than inside a
              sentence — the niche column is free text ("Plumber", "Dental",
              "Real Estate"), so no article or plural can be safe for all of it. */}
          {(niche || location) && (
            <p className="text-sm font-medium text-gray-500 mb-6 tracking-wide">
              {[niche, location].filter(Boolean).join('  ·  ')}
            </p>
          )}

          <p className="text-lg text-gray-400 max-w-2xl mb-10 leading-relaxed">
            You deserve better than a phone number on a directory. This is a
            real, working concept — built to get you found and booked.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={CAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/20 transition-all"
            >
              Book a free 15-min call
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold border border-white/15 text-white hover:bg-white/5 transition-all"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Live, interactive preview ────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="container-max">
          <p className="text-center text-xs font-bold tracking-widest uppercase text-[#c9a84c] mb-3">
            Live preview · fully interactive
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold mb-8 text-balance">
            Built for businesses like yours
          </h2>

          {/* Browser chrome mockup */}
          <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/60 bg-[#111]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#161616]">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              <div className="flex-1 mx-3">
                <div className="mx-auto max-w-md rounded-md bg-[#0a0a0a] border border-white/10 px-3 py-1 text-center text-[11px] text-gray-500 truncate">
                  {slugFromBusiness(business)}
                </div>
              </div>
            </div>

            <iframe
              src={`/demos/${demo.slug}?embed=true`}
              title={`Website concept for ${business}`}
              loading="lazy"
              className="w-full h-[600px] sm:h-[720px] bg-white"
            />
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            This is a live demo site. Yours would use your name, photos, services and colors.
          </p>
        </div>
      </section>

      {/* ── Why it matters ───────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="container-max max-w-3xl">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 sm:p-10">
            <h2 className="text-2xl font-bold mb-6">
              What this would do for {business}
            </h2>
            <ul className="space-y-4 mb-8">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-[#c9a84c]/15 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#c9a84c]" />
                  </span>
                  <span className="text-gray-300 leading-relaxed">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/10 pt-8">
              <p className="text-gray-400 mb-6 leading-relaxed">
                No pressure and no obligation — if it&apos;s not a fit, you keep the concept
                as inspiration. If it is, most sites go live in about a week.
              </p>
              <a
                href={CAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/20 transition-all"
              >
                Book a free 15-min call
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 mt-10">
            Built by{' '}
            <Link href="/" className="text-[#c9a84c] hover:underline">
              Seliem.dev
            </Link>{' '}
            — premium websites &amp; AI automations.
          </p>
        </div>
      </section>
    </main>
  )
}

/** Cosmetic only: the fake URL shown in the mockup's address bar. */
function slugFromBusiness(business: string): string {
  const host = business
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24)
  return `www.${host || 'yourbusiness'}.com`
}
