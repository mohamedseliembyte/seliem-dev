'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// EDIT ME: prices + features are sensible defaults — tune to your real packages.
// The "Book a free call" buttons point to CAL_URL below.
// ─────────────────────────────────────────────────────────────────────────────
// Where "Book a free call" sends people. Points to the contact form for now —
// swap in a real scheduling link (Cal.com / Calendly) anytime you set one up.
const CAL_URL = '#contact'

const tiers = [
  {
    name: 'Starter',
    price: 'Custom quote',
    blurb: 'A polished one-page site to get you online fast.',
    features: [
      'Custom one-page design',
      'Mobile-optimized & fast',
      'Contact form + lead alerts',
      'Basic SEO setup',
      'Fast turnaround',
    ],
    featured: false,
  },
  {
    name: 'Premium',
    price: 'Custom quote',
    blurb: 'A full multi-page site built to convert visitors into leads.',
    features: [
      'Up to 6 custom pages',
      'Booking & lead capture',
      'SEO + analytics',
      'Copywriting included',
      '30 days of support',
    ],
    featured: true,
  },
  {
    name: 'Premium + AI',
    price: 'Custom quote',
    blurb: 'Everything in Premium, plus your own AI sales assistant.',
    features: [
      'Everything in Premium',
      'Sage AI chat that captures leads',
      'Automations & follow-ups',
      'CRM dashboard + invoices',
      'Priority support',
    ],
    featured: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="section-padding bg-[#0c0c0c]">
      <div className="container-max">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Simple pricing,{' '}
            <span className="gold-text">no surprises.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Every project is custom-built. Book a call and I&apos;ll give you an exact quote — no surprises, no pressure.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ y: 28, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className={`relative rounded-2xl p-7 flex flex-col ${
                tier.featured
                  ? 'border border-[#c9a84c]/40 bg-gradient-to-br from-[#c9a84c]/[0.08] to-transparent shadow-xl shadow-[#c9a84c]/5'
                  : 'border border-white/8 bg-white/[0.02]'
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full gold-gradient text-black">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold text-white">{tier.name}</h3>
              <div className="mt-3 mb-1 flex items-baseline gap-1">
                <span className="text-2xl font-black gold-text">{tier.price}</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">{tier.blurb}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={CAL_URL}
                className={`w-full inline-flex items-center justify-center py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  tier.featured
                    ? 'gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/25 hover:scale-[1.02]'
                    : 'border border-[#c9a84c]/40 text-[#c9a84c] hover:bg-[#c9a84c]/10'
                }`}
              >
                Book a free call
              </a>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">
          Not sure what you need?{' '}
          <a href="#contact" className="text-[#c9a84c] underline underline-offset-2 hover:text-[#f5d485]">
            Tell us about your project
          </a>{' '}
          and we&apos;ll recommend the right fit.
        </p>
      </div>
    </section>
  )
}
