'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { demos } from '@/data/demos'
import type { Demo } from '@/types'
import ErrorBoundary from '@/components/ErrorBoundary'

// Load MeshGradient client-side only (WebGL)
const MeshGradient = dynamic(
  () => import('@paper-design/shaders-react').then((m) => m.MeshGradient),
  { ssr: false, loading: () => null },
)

// ─── Orbit constants ──────────────────────────────────────────────────────────
const ORBIT_RX = 185       // horizontal radius
const ORBIT_RY = 105       // vertical radius
const ORBIT_DURATION = 30  // seconds per full revolution
const CARD_W = 160
const CARD_H = 88

// ─── Single orbiting card ─────────────────────────────────────────────────────
function OrbitCard({ demo, startAngle }: { demo: Demo; startAngle: number }) {
  const angle = useMotionValue(startAngle)

  useEffect(() => {
    const controls = animate(angle, startAngle + Math.PI * 2, {
      duration: ORBIT_DURATION,
      repeat: Infinity,
      ease: 'linear',
    })
    return controls.stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const x = useTransform(angle, (a) => Math.cos(a) * ORBIT_RX)
  const y = useTransform(angle, (a) => Math.sin(a) * ORBIT_RY)
  // Depth cues: cards in front (sin > 0) are larger and more opaque
  const scale   = useTransform(angle, (a) => 0.82 + (Math.sin(a) + 1) * 0.09)
  const opacity = useTransform(angle, (a) => 0.55 + (Math.sin(a) + 1) * 0.22)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 1 }}
      style={{
        x,
        y,
        scale,
        opacity,
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: CARD_W,
        marginTop: -(CARD_H / 2),
        marginLeft: -(CARD_W / 2),
      }}
      className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 select-none"
    >
      <div className="relative" style={{ height: CARD_H }}>
        <Image
          src={demo.cardImage}
          alt={demo.name}
          fill
          sizes="160px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-[9px] font-bold text-[#c9a84c] uppercase tracking-widest mb-0.5">
            {demo.category}
          </div>
          <div className="text-[11px] font-semibold text-white leading-tight truncate">
            {demo.name}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Framer variants ──────────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
}
const wordVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}
const fadeUp = {
  hidden: { y: 24, opacity: 0 },
  visible: (d: number) => ({
    y: 0, opacity: 1,
    transition: { delay: d, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
}

const headline = ['Websites', 'That', 'Actually', 'Work']

// ─── Hero ─────────────────────────────────────────────────────────────────────
const meshFallback = (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      width: '100%',
      height: '100%',
      background: 'radial-gradient(ellipse at 50% 30%, #1a1500 0%, #0a0a0a 65%)',
    }}
  />
)

export default function Hero() {
  const orbitDemos = [demos[0], demos[1], demos[3]]
  const [meshReady, setMeshReady] = useState(false)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl') ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
      if (gl) {
        const frame = requestAnimationFrame(() => setMeshReady(true))
        // Release the test context immediately to avoid exhausting mobile GPU limits
        const ext = gl.getExtension('WEBGL_lose_context')
        ext?.loseContext()
        return () => cancelAnimationFrame(frame)
      }
    } catch {
      // WebGL unavailable — CSS fallback will render
    }
  }, [])

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Animated mesh gradient background — guarded against WebGL failures on mobile */}
      <ErrorBoundary fallback={meshFallback}>
        {meshReady ? (
          <MeshGradient
            colors={['#0a0a0a', '#111111', '#1a1500', '#0a0a0a']}
            speed={0.3}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              width: '100%',
              height: '100%',
            }}
          />
        ) : (
          meshFallback
        )}
      </ErrorBoundary>

      {/* Dot grid overlay */}
      <div className="absolute inset-0 hero-grid pointer-events-none z-[1]" />

      {/* Rotating dashed ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-[#c9a84c]/5 animate-spin-slow pointer-events-none z-[1]"
        style={{ borderStyle: 'dashed' }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/5 px-4 py-2 mb-8"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span className="text-xs font-semibold tracking-widest uppercase text-[#c9a84c]/80">
                Premium Web Design & AI Automations
              </span>
            </motion.div>

            <motion.h1
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-[clamp(3rem,8vw,5.5rem)] font-black leading-none tracking-tight mb-6"
            >
              <span className="block text-white overflow-hidden">
                {headline.slice(0, 2).map((word, i) => (
                  <motion.span key={i} variants={wordVariants} className="inline-block mr-[0.25em]">
                    {word}
                  </motion.span>
                ))}
              </span>
              <span className="block overflow-hidden">
                {headline.slice(2).map((word, i) => (
                  <motion.span key={i} variants={wordVariants} className="inline-block mr-[0.25em] gold-text">
                    {word}
                  </motion.span>
                ))}
              </span>
            </motion.h1>

            <motion.p
              custom={0.5} variants={fadeUp} initial="hidden" animate="visible"
              className="text-lg text-gray-400 leading-relaxed mb-8 max-w-lg"
            >
              Premium websites and AI automations built to help you get noticed, capture leads, and turn visitors into action.
            </motion.p>

            <motion.div
              custom={0.65} variants={fadeUp} initial="hidden" animate="visible"
              className="flex flex-col sm:flex-row gap-4 mb-10"
            >
              <a
                href="#contact"
                className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg text-base font-semibold gold-gradient text-black hover:shadow-xl hover:shadow-[#c9a84c]/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Start a project
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </a>
              <a
                href="#demos"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg text-base font-semibold border border-[#c9a84c]/40 text-[#c9a84c] hover:bg-[#c9a84c]/10 hover:border-[#c9a84c]/70 transition-all duration-200"
              >
                View our work
              </a>
            </motion.div>

            <motion.p
              custom={0.75} variants={fadeUp} initial="hidden" animate="visible"
              className="text-sm text-gray-600"
            >
              For businesses, creators, professionals, and brands ready to look serious online.
            </motion.p>

            {/* Honest service commitments — no unsupported vanity metrics */}
            <motion.div
              custom={0.85} variants={fadeUp} initial="hidden" animate="visible"
              className="mt-12 pt-8 border-t border-white/5 grid grid-cols-3 gap-6 max-w-sm"
            >
              {['Custom scope', 'Clear agreement', 'Direct support'].map((label) => (
                <div key={label}>
                  <div className="w-6 h-px bg-[#c9a84c] mb-3" />
                  <div className="text-xs text-gray-400 leading-snug">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Orbiting demo cards */}
          <div className="hidden lg:flex items-center justify-center relative h-[480px]">
            {/* Orbiting cards — 120° apart */}
            {orbitDemos.map((demo, i) => (
              <OrbitCard
                key={demo.id}
                demo={demo}
                startAngle={(i * 2 * Math.PI) / orbitDemos.length}
              />
            ))}

            {/* Center info card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 bg-[#111]/90 backdrop-blur-sm border border-[#c9a84c]/30 rounded-2xl px-5 py-3 text-center shadow-2xl"
            >
              <div className="text-xs text-gray-500 mb-0.5">Live demos ready</div>
              <div className="text-sm font-bold text-white">8 Industries</div>
              <div className="flex justify-center gap-1 mt-1.5">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full bg-[#c9a84c]"
                    style={{ opacity: 0.35 + i * 0.09 }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Ambient glow at center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-[#c9a84c]/6 blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.a
        href="#demos"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/20 hover:text-[#c9a84c] transition-colors duration-300 animate-bounce z-10"
        aria-label="Scroll down"
      >
        <ChevronDown className="w-6 h-6" />
      </motion.a>
    </section>
  )
}
