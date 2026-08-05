import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { services } from '@/data/services'

const CAL_URL = 'https://cal.com/seliem.dev'

const TITLE = 'Services — Web, Advertising, Marketing & AI | Seliem.dev'
const DESCRIPTION =
  'Websites, advertising, marketing, AI automations and AI infrastructure — designed, built and managed under one roof.'

// openGraph/twitter are declared in full: Next merges metadata shallowly, so a
// partial block here would inherit the homepage's og:url and mis-attribute
// every share of this page to the homepage.
export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://seliem.dev/services' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://seliem.dev/services',
    siteName: 'Seliem.dev',
    type: 'website',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Seliem.dev — full-service agency' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo.png'],
  },
}

// Grouped so the page reads as a capability map rather than a flat list.
const GROUPS = [
  { key: 'Build', title: 'Build', blurb: 'The foundation customers judge you on.' },
  { key: 'Demand', title: 'Demand', blurb: 'Getting in front of people already looking.' },
  { key: 'Automate', title: 'Automate', blurb: 'Systems that work when you cannot.' },
  { key: 'Run', title: 'Run', blurb: 'Keeping all of it alive and current.' },
]

export default function ServicesIndexPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-[#0a0a0a] text-white pt-24">
        <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pb-14">
          <div className="absolute inset-0 hero-grid pointer-events-none" />
          <div aria-hidden className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#c9a84c]/5 blur-3xl pointer-events-none" />
          <div className="relative container-max">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">Full-service capabilities</p>
            <h1 className="mt-3 text-[clamp(2.25rem,5.5vw,3.75rem)] font-black leading-[1.05] tracking-tight text-balance max-w-4xl">
              One agency, <span className="gold-text">every channel covered.</span>
            </h1>
            <p className="mt-5 text-lg text-gray-400 max-w-2xl leading-relaxed">
              Most businesses end up juggling a web guy, an ads guy, and whoever set up their email. We handle the
              whole stack — so the site, the campaigns and the automation behind them are actually built to work together.
            </p>
          </div>
        </section>

        {GROUPS.map((group) => {
          const items = services.filter((service) => service.category === group.key)
          if (!items.length) return null
          return (
            <section key={group.key} className="px-4 sm:px-6 lg:px-8 pb-14">
              <div className="container-max">
                <div className="flex items-baseline gap-4 mb-6">
                  <h2 className="text-2xl font-bold">{group.title}</h2>
                  <p className="text-sm text-gray-500">{group.blurb}</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/services/${service.slug}`}
                      className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#c9a84c]/40 hover:bg-white/[0.04] transition-all"
                    >
                      <h3 className="text-lg font-semibold group-hover:text-[#c9a84c] transition-colors">{service.name}</h3>
                      <p className="mt-2 text-[15px] text-gray-400 leading-relaxed flex-1">{service.summary}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#c9a84c]">
                        {service.startingAt === 'Custom' ? 'Scoped per project' : `From ${service.startingAt}`}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )
        })}

        <section className="px-4 sm:px-6 lg:px-8 pb-24">
          <div className="container-max">
            <div className="rounded-2xl border border-[#c9a84c]/20 bg-gradient-to-br from-[#c9a84c]/[0.07] to-transparent p-9 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-balance">Not sure which of these you need?</h2>
              <p className="mt-3 text-gray-400 max-w-xl mx-auto leading-relaxed">
                That is what the call is for. Fifteen minutes, no pitch deck — we look at what you have and tell you
                straight what would actually move the needle, even if that is only one thing.
              </p>
              <a
                href={CAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/20 transition-all"
              >
                Book a free 15-min call
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
