'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const CAL_URL = 'https://cal.com/seliem.dev'

const tiers = [
  {
    name: 'Landing Page',
    price: '$500',
    suffix: 'starting at',
    blurb: 'A focused one-page presence built to turn visits into inquiries.',
    features: [
      'Custom one-page design',
      'Mobile-optimized & fast',
      'Contact form + lead alerts',
      'Basic SEO setup',
      'One revision round',
    ],
    featured: false,
  },
  {
    name: 'Business Website',
    price: '$900+',
    suffix: 'starting at',
    blurb: 'A complete site for businesses ready to look established and grow.',
    features: [
      'Up to 6 custom pages',
      'Booking & lead capture',
      'SEO + analytics',
      'Two revision rounds',
      'Launch support',
    ],
    featured: true,
  },
  {
    name: 'Growth + AI',
    price: '$1,500+',
    suffix: 'starting at',
    blurb: 'A lead-generating website with booking, CRM, or AI automation.',
    features: [
      'Everything in Business Website',
      'Sage AI chat that captures leads',
      'Automations & follow-ups',
      'CRM dashboard + invoices',
      'Custom scope and support',
    ],
    featured: false,
  },
]

const monthlyPlans = [
  {
    name: 'Basic',
    price: '$30',
    blurb: 'Essential care for a simple website that is already live.',
    features: [
      'Website monitoring',
      'Routine software updates',
      'Up to 30 minutes of small edits',
      'Monthly website checkup',
      'Email support',
    ],
    featured: false,
  },
  {
    name: 'Pro',
    price: '$79',
    blurb: 'Ongoing improvements and faster support for a growing business.',
    features: [
      'Everything in Basic',
      'Up to 2 hours of edits',
      'Analytics summary',
      'Lead-form and booking checks',
      'Priority email support',
    ],
    featured: true,
  },
  {
    name: 'Ultra',
    price: '$149',
    blurb: 'Hands-on optimization for websites with active lead generation.',
    features: [
      'Everything in Pro',
      'Up to 5 hours of edits',
      'Monthly conversion improvement',
      'Automation health checks',
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
            A clear starting point.{' '}
            <span className="gold-text">A quote built around you.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Start with a proven package, then add only what your business actually needs. Every project begins with a 50% deposit.
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
              <span className="mb-3 text-[11px] uppercase tracking-[0.16em] text-gray-600">{tier.suffix}</span>
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
                target="_blank"
                rel="noopener noreferrer"
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

        <div className="mx-auto mb-8 mt-20 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">Monthly care</p>
          <h3 className="text-3xl font-black text-white sm:text-4xl">Keep your website working after launch.</h3>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Choose ongoing care only if you need it. Plans are month-to-month and do not include third-party subscriptions or major redesigns.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {monthlyPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ y: 28, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className={`relative flex flex-col rounded-2xl p-7 ${
                plan.featured
                  ? 'border border-[#c9a84c]/40 bg-gradient-to-br from-[#c9a84c]/[0.08] to-transparent shadow-xl shadow-[#c9a84c]/5'
                  : 'border border-white/8 bg-white/[0.02]'
              }`}
            >
              {plan.featured && (
                <span className="gold-gradient absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-black">
                  Best Value
                </span>
              )}
              <h4 className="text-lg font-bold text-white">{plan.name}</h4>
              <div className="mb-4 mt-3 flex items-baseline gap-1">
                <span className="gold-text text-3xl font-black">{plan.price}</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-gray-400">{plan.blurb}</p>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={CAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex w-full items-center justify-center rounded-lg py-3 text-sm font-semibold transition-all duration-200 ${
                  plan.featured
                    ? 'gold-gradient text-black hover:scale-[1.02] hover:shadow-lg hover:shadow-[#c9a84c]/25'
                    : 'border border-[#c9a84c]/40 text-[#c9a84c] hover:bg-[#c9a84c]/10'
                }`}
              >
                Choose {plan.name}
              </a>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl gap-4 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-gray-400 sm:grid-cols-2 lg:grid-cols-4">
          <p><strong className="block text-white">50% to begin</strong>The remaining 50% is due before launch or final delivery.</p>
          <p><strong className="block text-white">Care from $30/mo</strong>Monitoring, updates, and up to 30 minutes of small edits.</p>
          <p><strong className="block text-white">Domain setup $50</strong>Optional configuration; registration and renewal stay in your name at cost.</p>
          <p><strong className="block text-white">Extra work $50/hr</strong>For requests beyond the written scope or included care allowance.</p>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-gray-600">Prices are starting estimates, not binding offers. Larger builds, stores, custom apps, usage-based AI, premium software, email, and hosting upgrades are quoted separately. You own client-specific accounts and subscriptions; Seliem.dev covers its own internal development tools.</p>
      </div>
    </section>
  )
}
