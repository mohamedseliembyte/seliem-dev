'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Check } from 'lucide-react'

// ── Work ────────────────────────────────────────────────────────────────────
// Real shipped product, not a mockup and not a testimonial. Everything stated
// here is verifiable by clicking through to the live site — which is the point:
// it's proof of capability that a prospect can check for themselves.

const BUILT = [
  'Full product design and build',
  'Custom domains for every user',
  'Live analytics: views, clicks, referrers',
  'Email capture and audience broadcasts',
  'AI-assisted page builder',
  'QR codes and trackable NFC links',
  'Subscriptions and billing',
]

export default function Work() {
  return (
    <section id="work" className="section-padding bg-[#0a0a0a]">
      <div className="container-max">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3">Our work</p>
          <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4 text-balance">
            We don&apos;t just build sites — <span className="gold-text">we ship products.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
            The fastest way to judge an agency is to look at what it has actually put into the world.
            Here is ours — live, in production, and running on the same stack we build clients on.
          </p>
        </motion.div>

        <motion.article
          initial={{ y: 32, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl border border-[#c9a84c]/20 bg-gradient-to-br from-[#c9a84c]/[0.07] to-transparent p-8 sm:p-10"
        >
          <div aria-hidden className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#c9a84c]/[0.06] blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h3 className="text-2xl sm:text-3xl font-black">Flit</h3>
                <span className="rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#e0bd70]">
                  In production
                </span>
              </div>
              <p className="text-lg gold-text font-semibold mb-4">Everything you are, one link away.</p>
              <p className="text-gray-400 leading-relaxed mb-4">
                A link-in-bio platform for creators, musicians and small businesses — built end to end
                in-house: product, design, front end, back end, billing and infrastructure.
              </p>
              <p className="text-gray-400 leading-relaxed mb-7">
                It is a full SaaS with custom domains, analytics, audience tools and subscriptions —
                the same problems your project runs into, solved on something we own and operate.
              </p>

              <a
                href="https://flitbio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/20 transition-all"
              >
                See it live
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-4">What we built</p>
              <ul className="space-y-2.5">
                {BUILT.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-300 leading-relaxed">
                    <Check className="w-4 h-4 text-[#c9a84c] mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.article>

        <p className="mt-6 text-sm text-gray-600">
          Client work is covered by agreements — case studies go up here as clients approve them.
        </p>
      </div>
    </section>
  )
}
