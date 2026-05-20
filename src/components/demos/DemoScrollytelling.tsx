'use client'

import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { Demo } from '@/types'

interface Step {
  icon: string
  label: string
  desc: string
}

interface Config {
  sectionTitle: string
  tagline: string
  steps: Step[]
}

const CONFIGS: Record<string, Config> = {
  Barbershop: {
    sectionTitle: 'The Barber Experience',
    tagline: 'More than a haircut — a ritual',
    steps: [
      { icon: '💬', label: 'Consultation', desc: 'We discuss your style goals and find the perfect cut for your face shape before a single snip.' },
      { icon: '✂️', label: 'The Cut', desc: 'Precision work by experienced barbers using professional-grade tools and total attention to detail.' },
      { icon: '💈', label: 'The Finish', desc: 'Hot towel, straight-razor edge, premium product. Leave looking sharp — and feeling it.' },
    ],
  },
  Restaurant: {
    sectionTitle: 'The Dining Journey',
    tagline: 'An experience for every sense',
    steps: [
      { icon: '🕯️', label: 'Arrive', desc: 'Step into an intimate setting crafted to make every dinner feel like a special occasion.' },
      { icon: '🍽️', label: 'Savor', desc: 'Chef-curated dishes built from locally sourced, seasonal ingredients — every plate elevated.' },
      { icon: '🥂', label: 'Linger', desc: 'Impeccable service and a curated wine list. The best meals should never feel rushed.' },
    ],
  },
  Construction: {
    sectionTitle: 'How We Build',
    tagline: 'Built right, built to last',
    steps: [
      { icon: '📋', label: 'Plan', desc: 'Detailed blueprints and transparent timelines established before a single nail is struck.' },
      { icon: '🏗️', label: 'Build', desc: 'Expert crews, premium materials, rigorous safety standards — on schedule and on budget.' },
      { icon: '🔑', label: 'Deliver', desc: 'Full walkthrough, quality inspection, and handover with a comprehensive warranty.' },
    ],
  },
  Fitness: {
    sectionTitle: 'Your Transformation',
    tagline: 'Every rep gets you closer',
    steps: [
      { icon: '📊', label: 'Assess', desc: "Body composition analysis and goal-setting with a certified trainer. We know where you're starting." },
      { icon: '💪', label: 'Train', desc: 'Personalized programming: strength, cardio, mobility — your plan, your pace, your results.' },
      { icon: '🥗', label: 'Fuel', desc: 'In-house nutrition coaching to power performance and accelerate every transformation.' },
    ],
  },
  Dental: {
    sectionTitle: 'Your Smile Journey',
    tagline: 'Comfortable, confident care',
    steps: [
      { icon: '🪥', label: 'Check In', desc: 'Full digital X-rays and oral health assessment in minutes — no long waits, no surprises.' },
      { icon: '😁', label: 'Treatment', desc: 'Pain-free procedures using the latest dental technology and a gentle, experienced team.' },
      { icon: '✨', label: 'Aftercare', desc: 'Personalized home-care plan and follow-up reminders so your results last.' },
    ],
  },
  'Real Estate': {
    sectionTitle: 'Finding Your Home',
    tagline: 'Every deal, handled personally',
    steps: [
      { icon: '🔑', label: 'Discover', desc: "We learn your must-haves and pre-qualify you — ready to move when the right property appears." },
      { icon: '🏡', label: 'Search', desc: 'Curated listings, private showings, and daily market insights delivered to your inbox.' },
      { icon: '📄', label: 'Close', desc: 'Expert negotiation and end-to-end paperwork handled. You sign once — we handle the rest.' },
    ],
  },
  Cleaning: {
    sectionTitle: 'The Clean Process',
    tagline: 'Spotless, every single time',
    steps: [
      { icon: '🔍', label: 'Assess', desc: 'Walkthrough to identify priority areas and customize the clean to your exact space.' },
      { icon: '🧴', label: 'Deep Clean', desc: 'Eco-friendly products and HEPA-filtered equipment for a clean that goes beyond the surface.' },
      { icon: '✅', label: 'Inspect', desc: "Quality check before we leave — if it isn't right, we make it right. Guaranteed." },
    ],
  },
  'Auto Detailing': {
    sectionTitle: 'The Detail Experience',
    tagline: 'Showroom finish, guaranteed',
    steps: [
      { icon: '🔍', label: 'Inspect', desc: 'Thorough assessment of paint, interior, and wheels. We know what your vehicle needs before we start.' },
      { icon: '💧', label: 'Deep Wash', desc: 'Hand-wash, clay bar decontamination, and wheel cleaning with pH-safe, swirl-free products.' },
      { icon: '✨', label: 'Polish', desc: 'Machine polishing removes swirl marks and restores a deep, mirror-like gloss to the paint.' },
      { icon: '🛡️', label: 'Protect', desc: 'Ceramic coating or carnauba wax seals the finish — months of protection from one treatment.' },
    ],
  },
}

CONFIGS['Auto'] = CONFIGS['Auto Detailing']

export default function DemoScrollytelling({ demo }: { demo: Demo }) {
  const config = CONFIGS[demo.category]
  const [activeStep, setActiveStep] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = panelRefs.current.indexOf(entry.target as HTMLDivElement)
            if (idx !== -1) setActiveStep(idx)
          }
        })
      },
      { root: container, threshold: 0.5 }
    )

    panelRefs.current.forEach((panel) => { if (panel) obs.observe(panel) })
    return () => obs.disconnect()
  }, [])

  if (!config) return null

  const { sectionTitle, tagline, steps } = config
  const p = demo.theme.primary

  return (
    /* Snap scroll container — 100vh tall, one panel per step */
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
      }}
    >
      {steps.map((step, i) => (
        <div
          key={i}
          ref={(el) => { panelRefs.current[i] = el }}
          className="relative flex flex-col items-center justify-center"
          style={{ height: '100vh', scrollSnapAlign: 'start' }}
        >
          {/* Background: hero image + theme overlay */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={demo.heroImage}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scale(1.08)' }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${demo.theme.bg}ee 0%, ${demo.theme.bg}aa 45%, ${demo.theme.bg}ee 100%)`,
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 55% 45% at 50% 50%, ${p}18 0%, transparent 70%)` }}
            />
          </div>

          {/* Step counter — top right */}
          <div className="absolute top-5 right-5 z-20">
            <span className="text-xs font-mono font-bold tabular-nums" style={{ color: `${p}80` }}>
              {String(i + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </span>
          </div>

          {/* Section label — top center */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: p }}>
              {sectionTitle}
            </p>
            <p className="text-xs mt-0.5" style={{ color: demo.theme.textMuted }}>{tagline}</p>
          </div>

          {/* Side progress indicator */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
            {steps.map((_, j) => (
              <div
                key={j}
                className="rounded-full transition-all duration-300"
                style={{
                  width: j === i ? 18 : 4,
                  height: 2,
                  background: p,
                  opacity: j === i ? 1 : 0.25,
                }}
              />
            ))}
          </div>

          {/* Step content — animates in when panel snaps into view */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ root: containerRef, once: false, amount: 0.5 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col items-center text-center max-w-md px-6"
          >
            {/* Ghost step number behind content */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden select-none pointer-events-none"
              aria-hidden
            >
              <span
                className="text-[10rem] sm:text-[13rem] font-black leading-none tabular-nums"
                style={{ color: `${p}09` }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>

            {/* Icon card */}
            <div
              className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6"
              style={{
                background: `linear-gradient(135deg, ${demo.theme.surface} 0%, ${demo.theme.bg} 100%)`,
                border: `1px solid ${p}45`,
                boxShadow: `0 0 0 1px ${p}12, 0 20px 50px ${p}28, 0 4px 16px rgba(0,0,0,0.45)`,
              }}
            >
              {step.icon}
            </div>

            <h3
              className="relative z-10 text-4xl sm:text-5xl font-black leading-tight mb-4"
              style={{ color: demo.theme.text }}
            >
              {step.label}
            </h3>
            <p
              className="relative z-10 text-base leading-relaxed"
              style={{ color: demo.theme.textMuted }}
            >
              {step.desc}
            </p>
          </motion.div>

          {/* Bottom progress bar */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-10">
            {steps.map((_, j) => (
              <div
                key={j}
                className="h-0.5 rounded-full transition-all duration-300"
                style={{
                  width: j === i ? 28 : 7,
                  background: p,
                  opacity: j <= i ? 1 : 0.2,
                }}
              />
            ))}
          </div>

          {/* Scroll hint — only on non-last panels */}
          {i < steps.length - 1 && (
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-px h-7 rounded-full z-10"
              style={{ background: `${p}55` }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
