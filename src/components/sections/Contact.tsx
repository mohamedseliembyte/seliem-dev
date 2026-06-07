'use client'

import { motion } from 'framer-motion'
import { Mail, Instagram } from 'lucide-react'
import { TikTokIcon } from '@/components/ui/TikTokIcon'

const channels = [
  {
    icon: Mail,
    label: 'Email',
    value: 'mohamed.seliem.dev@gmail.com',
    href: 'mailto:mohamed.seliem.dev@gmail.com',
    description: 'Best for project inquiries',
  },
  {
    icon: TikTokIcon,
    label: 'TikTok',
    value: '@seliem.dev',
    href: 'https://www.tiktok.com/@seliem.dev',
    description: 'Website previews & tips',
  },
  {
    icon: Instagram,
    label: 'Instagram',
    value: '@seliem.dev',
    href: 'https://www.instagram.com/seliem.dev',
    description: 'Behind-the-scenes & work',
  },
]

const fadeUp = {
  hidden: { y: 20, opacity: 0 },
  visible: (d: number) => ({
    y: 0,
    opacity: 1,
    transition: { delay: d, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function Contact() {
  return (
    <section id="contact" className="section-padding bg-[#0a0a0a]">
      <div className="container-max">
        <div className="text-center mb-14">
          <motion.p
            variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3"
          >
            Let&apos;s Stay Connected
          </motion.p>
          <motion.h2
            variants={fadeUp} custom={0.08} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-4xl sm:text-5xl font-black text-white mb-4"
          >
            Find me anywhere.
          </motion.h2>
          <motion.p
            variants={fadeUp} custom={0.16} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-gray-400 text-lg max-w-md mx-auto"
          >
            Reach out through whatever channel works best for you. I respond fast.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {channels.map((channel, i) => {
            const Icon = channel.icon
            return (
              <motion.a
                key={channel.label}
                href={channel.href}
                target={channel.href.startsWith('http') ? '_blank' : undefined}
                rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                variants={fadeUp} custom={0.2 + i * 0.1} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="group flex flex-col items-center text-center p-6 sm:p-8 rounded-xl border border-white/5 bg-white/[0.02] hover:border-[#c9a84c]/30 hover:bg-[#c9a84c]/3 transition-all duration-300 w-full min-w-0"
              >
                <div className="w-14 h-14 rounded-xl border border-[#c9a84c]/30 flex items-center justify-center mb-4 group-hover:border-[#c9a84c] group-hover:bg-[#c9a84c]/10 transition-all duration-300">
                  <Icon className="w-6 h-6 text-[#c9a84c]" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-1">{channel.label}</p>
                <p className="font-semibold text-white mb-1 break-all text-[13px] w-full leading-snug">{channel.value}</p>
                <p className="text-xs text-gray-500">{channel.description}</p>
              </motion.a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
