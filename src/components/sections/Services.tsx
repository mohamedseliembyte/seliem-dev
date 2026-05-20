'use client'

import { motion } from 'framer-motion'
import { Globe, RefreshCw, Bot, CalendarCheck, LayoutTemplate, Rocket } from 'lucide-react'

const services = [
  {
    icon: Globe,
    title: 'Premium Website Design',
    description:
      'Fully custom-designed sites built from scratch. No templates, no drag-and-drop — just a site that actually reflects your brand and converts visitors.',
    highlight: true,
  },
  {
    icon: RefreshCw,
    title: 'Website Redesign',
    description:
      'Already have a site that\'s letting you down? I rebuild it from the ground up — faster, sharper, and built to perform.',
  },
  {
    icon: Bot,
    title: 'AI Automations',
    description:
      'Automate your follow-ups, lead capture, scheduling, and more. AI workflows that work while you sleep.',
  },
  {
    icon: CalendarCheck,
    title: 'Booking & Lead Capture',
    description:
      'Integrated booking systems and lead forms that turn website visitors into real appointments and real revenue.',
  },
  {
    icon: LayoutTemplate,
    title: 'Business Website Templates',
    description:
      'Premium pre-built templates for specific industries — ready to launch fast, with professional results every time.',
  },
  {
    icon: Rocket,
    title: 'Launch & Support',
    description:
      'From domain setup to deployment, I handle the technical side so you can focus on running your business.',
  },
]

const cardVariants = {
  hidden: { y: 28, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function Services() {
  const [featured, ...rest] = services

  return (
    <section id="services" className="section-padding bg-[#0a0a0a]">
      <div className="container-max">
        {/* Header */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3">What I Build</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Every service,{' '}
            <span className="gold-text">built to deliver.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl">
            Whether you need a full website build, a redesign, or smart automations — I handle it.
          </p>
        </motion.div>

        {/* Featured card */}
        <motion.div
          initial={{ y: 32, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.01 }}
          className="mb-6 relative rounded-2xl border border-[#c9a84c]/20 bg-gradient-to-br from-[#c9a84c]/8 to-transparent p-8 md:p-10 overflow-hidden group hover:border-[#c9a84c]/40 transition-all duration-300 cursor-default"
        >
          {/* Animated glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#c9a84c]/6 rounded-full blur-3xl pointer-events-none group-hover:bg-[#c9a84c]/10 transition-all duration-500" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#f5d485]/4 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-14 h-14 rounded-xl gold-gradient flex items-center justify-center shrink-0 shadow-lg shadow-[#c9a84c]/20">
              <featured.icon className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">{featured.title}</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full gold-gradient text-black">
                  Most Popular
                </span>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-2xl">{featured.description}</p>
            </div>
            <a
              href="#contact"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/25 hover:scale-[1.02] transition-all duration-200"
            >
              Get Started
            </a>
          </div>
        </motion.div>

        {/* 5-card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map((service, i) => {
            const Icon = service.icon
            return (
              <motion.div
                key={service.title}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                whileHover={{ y: -4, borderColor: 'rgba(201,168,76,0.3)' }}
                className="group rounded-xl border border-white/5 bg-white/[0.02] p-6 transition-colors duration-300"
              >
                <div className="w-10 h-10 rounded-lg border border-[#c9a84c]/30 flex items-center justify-center mb-4 group-hover:border-[#c9a84c]/70 group-hover:bg-[#c9a84c]/5 transition-all duration-300">
                  <Icon className="w-5 h-5 text-[#c9a84c]" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{service.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{service.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
