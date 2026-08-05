import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { services, getServiceBySlug } from '@/data/services'

const CAL_URL = 'https://cal.com/seliem.dev'

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) return {}
  const title = `${service.name} — Seliem.dev`
  // Declaring openGraph REPLACES the layout's block rather than merging into
  // it, so siteName/type/images have to be repeated or the share card loses
  // its image. Same reason twitter is spelled out instead of inherited.
  return {
    title,
    description: service.summary,
    alternates: { canonical: `https://seliem.dev/services/${service.slug}` },
    openGraph: {
      title,
      description: service.summary,
      url: `https://seliem.dev/services/${service.slug}`,
      siteName: 'Seliem.dev',
      type: 'website',
      images: [{ url: '/logo.png', width: 1200, height: 630, alt: `${service.name} — Seliem.dev` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: service.summary,
      images: ['/logo.png'],
    },
  }
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) notFound()

  const related = service.related.map(getServiceBySlug).filter(Boolean)

  // FAQ structured data — makes the Q&A eligible for rich results in search.
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: service.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Navbar />
      <main id="main-content" className="min-h-screen bg-[#0a0a0a] text-white pt-24">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pb-16">
          <div className="absolute inset-0 hero-grid pointer-events-none" />
          <div aria-hidden className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#c9a84c]/5 blur-3xl pointer-events-none" />
          <div className="relative container-max">
            <Link href="/services" className="text-sm text-gray-500 hover:text-[#c9a84c] transition-colors">
              ← All services
            </Link>
            <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">{service.category}</p>
            <h1 className="mt-3 text-[clamp(2.25rem,5.5vw,3.75rem)] font-black leading-[1.05] tracking-tight text-balance max-w-4xl">
              {service.name}
            </h1>
            <p className="mt-5 text-xl sm:text-2xl gold-text font-semibold max-w-3xl text-balance">{service.tagline}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
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
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold border border-white/15 hover:bg-white/5 transition-all"
              >
                {service.startingAt === 'Custom' ? 'See pricing' : `From ${service.startingAt}`}
              </Link>
            </div>
          </div>
        </section>

        {/* Overview + deliverables */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="container-max grid lg:grid-cols-[1.1fr_.9fr] gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-5">What this actually is</h2>
              {service.overview.map((paragraph) => (
                <p key={paragraph} className="text-gray-400 leading-relaxed mb-4 text-[17px]">
                  {paragraph}
                </p>
              ))}

              <h2 className="text-2xl font-bold mt-12 mb-5">What it does for you</h2>
              <ul className="space-y-3">
                {service.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-3">
                    <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-[#c9a84c]/15 flex items-center justify-center">
                      <Check className="w-3 h-3 text-[#c9a84c]" />
                    </span>
                    <span className="text-gray-300 leading-relaxed">{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 h-fit lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-5">What&apos;s included</p>
              <ul className="space-y-3">
                {service.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-300 leading-relaxed">
                    <Check className="w-4 h-4 text-[#c9a84c] mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 pt-6 border-t border-white/10">
                <p className="text-sm text-gray-500">
                  {service.startingAt === 'Custom' ? 'Scoped per project' : `Starting at ${service.startingAt}`}
                </p>
                <a
                  href={CAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/20 transition-all"
                >
                  Get a quote
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </aside>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="container-max max-w-3xl">
            <h2 className="text-2xl font-bold mb-7">Straight answers</h2>
            <div className="space-y-4">
              {service.faqs.map((faq) => (
                <div key={faq.q} className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-gray-400 leading-relaxed text-[15px]">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 pb-24">
            <div className="container-max">
              <h2 className="text-2xl font-bold mb-7">Often paired with</h2>
              <div className="grid sm:grid-cols-3 gap-5">
                {related.map((item) => (
                  <Link
                    key={item!.slug}
                    href={`/services/${item!.slug}`}
                    className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#c9a84c]/40 transition-all"
                  >
                    <p className="text-xs uppercase tracking-widest text-[#c9a84c] mb-2">{item!.category}</p>
                    <h3 className="font-semibold mb-2 group-hover:text-[#c9a84c] transition-colors">{item!.name}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{item!.summary}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
