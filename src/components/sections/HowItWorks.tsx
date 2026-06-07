'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Sliders, Zap } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Lightbulb,
    title: 'Choose Your Direction',
    description:
      'We start with a conversation — about your business, your goals, and the impression you want to make. I\'ll recommend the right approach, whether that\'s a fresh build, a redesign, or a template.',
  },
  {
    number: '02',
    icon: Sliders,
    title: 'Customize Your Website',
    description:
      'I design and build your site to match your brand exactly — your colors, your copy, your personality. You review every section and we refine until it\'s exactly right.',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Launch & Start Collecting Leads',
    description:
      'Your site goes live. Booking forms, lead capture, and automations are connected and tested. You start getting results from day one — not month three.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0d0d0d]" />
      <div className="absolute inset-0 hero-grid opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#c9a84c]/4 rounded-full blur-[120px] pointer-events-none" />

      <div className="container-max relative z-10">
        {/* Header */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-20"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3">The Process</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Simple. Fast.{' '}
            <span className="gold-text">Results-focused.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto">
            Three clear steps from idea to a site that works for you around the clock.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ y: 40, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.15, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="relative text-center md:text-left group"
              >
                {/* Step number — large background */}
                <div
                  className="absolute -top-6 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 text-[120px] font-black leading-none select-none pointer-events-none"
                  style={{ color: 'rgba(201,168,76,0.04)' }}
                >
                  {step.number}
                </div>

                <div className="relative">
                  {/* Icon */}
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 3 }}
                    transition={{ duration: 0.2 }}
                    className="relative inline-flex mb-6"
                  >
                    <div className="w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center shadow-lg shadow-[#c9a84c]/20">
                      <Icon className="w-8 h-8 text-black" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0d0d0d] border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                  </motion.div>

                  <div className="text-xs font-semibold text-[#c9a84c]/50 tracking-widest uppercase mb-2">
                    Step {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 text-center"
        >
          <a
            href="#lead-form"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-lg text-base font-semibold gold-gradient text-black hover:shadow-xl hover:shadow-[#c9a84c]/25 hover:scale-[1.02] transition-all duration-200"
          >
            Start the Process
          </a>
        </motion.div>
      </div>
    </section>
  )
}
