'use client'

import { useState } from 'react'
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
    name: 'Growth Engine',
    price: '$1,500+',
    suffix: 'starting at',
    blurb: 'The full stack: site, campaigns and AI systems working together.',
    features: [
      'Everything in Business Website',
      'Ad campaigns built & managed',
      'SEO, content & review generation',
      'AI receptionist + follow-up automation',
      'CRM, dashboards & integrations',
    ],
    featured: false,
  },
  {
    name: 'AI Infrastructure',
    price: 'Custom',
    suffix: 'scoped per project',
    blurb: 'Custom AI built on your data, wired into the tools you already use.',
    features: [
      'Internal assistants & knowledge systems',
      'Document, intake & data pipelines',
      'CRM / API / webhook integrations',
      'Model routing with fallbacks',
      'Ongoing tuning & monitoring',
    ],
    featured: false,
  },
]

// Annual = 10x the monthly rate, i.e. two months free. Kept as explicit
// numbers rather than computed at render so the discount can be tuned per plan.
const monthlyPlans = [
  {
    name: 'Basic',
    price: '$30',
    annual: '$300',
    monthlyNum: 30,
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
    annual: '$790',
    monthlyNum: 79,
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
    annual: '$1,490',
    monthlyNum: 149,
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

// Services quoted per engagement rather than sold as a package. Ranges are
// starting points so a prospect can self-qualify before the call.
const serviceRates = [
  { name: 'Advertising & paid media', rate: 'from $400/mo', note: 'Management only — ad spend is paid to the platforms directly, in your name.' },
  { name: 'Marketing & SEO', rate: 'from $350/mo', note: 'Local SEO, Google Business, content and reviews. Compounds; needs a few months.' },
  { name: 'Branding & creative', rate: 'from $400', note: 'Logo, identity, photo direction and the copy that carries it.' },
  { name: 'Apps & App Store launch', rate: 'from $1,200', note: 'Packaging an existing site starts lower than a build from scratch.' },
  { name: 'AI automations', rate: 'from $1,500', note: 'AI receptionist, instant follow-up, booking and review automation.' },
  { name: 'AI infrastructure', rate: 'Quoted', note: 'Assistants on your data, pipelines and integrations. Scoped per project.' },
]

export default function Pricing() {
  const [annual, setAnnual] = useState(false)

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
            Choose ongoing care only if you need it. Cancel any time; major redesigns and services registered for your business are separate.
          </p>

          <div className="mt-7 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${!annual ? 'gold-gradient text-black' : 'text-gray-400 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${annual ? 'gold-gradient text-black' : 'text-gray-400 hover:text-white'}`}
            >
              Annual <span className={annual ? 'text-black/70' : 'text-[#c9a84c]'}>&middot; 2 months free</span>
            </button>
          </div>
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
              <div className="mb-1 mt-3 flex items-baseline gap-1">
                <span className="gold-text text-3xl font-black">{annual ? plan.annual : plan.price}</span>
                <span className="text-sm text-gray-500">{annual ? '/year' : '/month'}</span>
              </div>
              <p className="mb-4 text-xs text-gray-500">
                {annual
                  ? `Works out to $${Math.round(plan.monthlyNum * 10 / 12)}/mo \u00B7 you save $${(plan.monthlyNum * 2).toLocaleString()}`
                  : 'Billed monthly, cancel any time'}
              </p>
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

        {/* Everything not sold as a fixed package. Starting points, so a prospect
            can self-qualify before booking a call. */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="mb-6 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">Everything else</p>
            <h3 className="text-2xl font-black text-white sm:text-3xl">Other services, quoted per project.</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm text-gray-400">
              These depend too much on your market to sell as a fixed package. Here is where they start, so you know
              before you book a call.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            {serviceRates.map((item, i) => (
              <div
                key={item.name}
                className={`flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
              >
                <div className="sm:flex-1">
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{item.note}</p>
                </div>
                <span className="shrink-0 font-bold text-[#c9a84c]">{item.rate}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl gap-4 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-gray-400 sm:grid-cols-2 lg:grid-cols-4">
          <p><strong className="block text-white">50% to begin</strong>The remaining 50% is due before launch or final delivery.</p>
          <p><strong className="block text-white">Care from $30/mo</strong>Monitoring, updates, and up to 30 minutes of small edits.</p>
          <p><strong className="block text-white">Domain setup $50</strong>Optional configuration; registration and renewal stay in your name at cost.</p>
          <p><strong className="block text-white">Extra work $50/hr</strong>For requests beyond the written scope or included care allowance.</p>
        </div>
        <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="text-lg font-bold text-white">Your business accounts stay yours</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">
            You are never charged for the tools Seliem.dev uses to do its work. You only pay providers directly for optional accounts or usage created specifically for your business.
          </p>
          <ul className="mt-5 grid gap-3 text-sm text-gray-300 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Domain registration and renewal',
              'Professional business email',
              'Upgraded hosting, if needed',
              'Premium apps or software you choose',
              'Payment processing fees',
              'Business SMS or phone usage',
              'AI or API usage for your live product',
              'Other services approved by you first',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-gray-600">Prices are starting estimates, not binding offers. Larger builds, stores, and custom apps are quoted separately. No client-owned service is added without your approval.</p>
      </div>
    </section>
  )
}
