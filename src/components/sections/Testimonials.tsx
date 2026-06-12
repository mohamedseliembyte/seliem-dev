'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// EDIT ME: replace these with REAL client testimonials as you collect them.
// Social proof is the #1 trust driver — even 2–3 genuine quotes beat none.
// Until you have real ones, you can keep these but mark the section honestly,
// or swap this for a "Be our first case study" offer.
// ─────────────────────────────────────────────────────────────────────────────
const testimonials = [
  {
    quote:
      'Mohamed rebuilt our site in a weekend and we booked three new clients the first week. It finally looks like the business we are.',
    name: 'Client Name', // EDIT
    role: 'Owner, Local Business', // EDIT
    rating: 5,
  },
  {
    quote:
      'The AI chat answers our customers at 2am and sends us the leads. It pays for itself. Wish we’d done this a year ago.',
    name: 'Client Name', // EDIT
    role: 'Founder, Service Company', // EDIT
    rating: 4,
  },
  {
    quote:
      'Fast, premium, and zero hand-holding needed. He handled the domain, the design, everything. Just sent me the keys.',
    name: 'Client Name', // EDIT
    role: 'Creator', // EDIT
    rating: 5,
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="section-padding bg-[#0a0a0a]">
      <div className="container-max">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3">
            What clients say
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Results, <span className="gold-text">not just websites.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.figure
              key={i}
              initial={{ y: 28, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-7 flex flex-col"
            >
              <div className="flex gap-1 mb-4" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-[#c9a84c] text-[#c9a84c]" aria-hidden="true" />
                ))}
              </div>
              <blockquote className="text-gray-300 leading-relaxed flex-1">“{t.quote}”</blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/5">
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-gray-500">{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
