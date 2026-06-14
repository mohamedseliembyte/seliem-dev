'use client'

import { motion } from 'framer-motion'
import { Clock, ShieldCheck, User } from 'lucide-react'

const promises = [
  {
    icon: Clock,
    title: '48-hour launch',
    body: 'Your site goes live in two days — or you don\'t pay. No drawn-out timelines.',
  },
  {
    icon: ShieldCheck,
    title: 'Free consultation, zero commitment',
    body: 'We map out your project before you spend a cent. No pressure, no obligation.',
  },
  {
    icon: User,
    title: 'Work directly with me',
    body: 'You deal with the person actually building your site — never a call center.',
  },
]

export default function Guarantee() {
  return (
    <section id="guarantee" className="section-padding bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#c9a84c]/4 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />
      <div className="container-max relative z-10">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3">
            My promise to you
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Launched in 48 hours —{' '}
            <span className="gold-text">or it&apos;s free.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mt-4">
            No agencies, no runaround. If I don&apos;t deliver on time, you don&apos;t pay.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {promises.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.title}
                initial={{ y: 28, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-7 text-center"
              >
                <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#c9a84c]/20">
                  <Icon className="w-6 h-6 text-black" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{p.body}</p>
              </motion.div>
            )
          })}
        </div>

        <div className="text-center mt-10">
          <a
            href="#contact"
            className="inline-flex items-center justify-center px-7 py-4 rounded-lg text-base font-semibold gold-gradient text-black hover:shadow-xl hover:shadow-[#c9a84c]/25 hover:scale-[1.02] transition-all duration-200"
          >
            Start your project — risk-free
          </a>
        </div>
      </div>
    </section>
  )
}
