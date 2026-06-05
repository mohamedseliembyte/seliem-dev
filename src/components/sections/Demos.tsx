'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { demos } from '@/data/demos'
import type { Demo } from '@/types'

const THUMB: Record<string, string> = {
  'prestige-cuts':      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=80',
  'velour-dining':      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
  'apex-construction':  'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&q=80',
  'elevate-fitness':    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80',
  'brightsmile-dental': 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80',
  'prime-realty':       'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
  'sparkle-clean':      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'luxe-auto':          'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=400&q=80',
}

function Thumb({ demo, className }: { demo: Demo; className?: string }) {
  return (
    <img
      src={THUMB[demo.slug] ?? demo.heroImage}
      alt={demo.name}
      crossOrigin="anonymous"
      className={className}
      onError={(e) => { e.currentTarget.style.opacity = '0' }}
    />
  )
}

/* ─── macOS-style window button ──────────────────────────────────────── */
function MacBtn({
  color, tooltip, onClick, icon,
}: {
  color: string
  tooltip: string
  onClick: () => void
  icon: string
}) {
  const [showTip, setShowTip] = useState(false)
  const timerRef    = useRef<ReturnType<typeof setTimeout>>()
  const longPressRef = useRef(false)

  const handleTouchStart = () => {
    longPressRef.current = false
    timerRef.current = setTimeout(() => {
      longPressRef.current = true
      setShowTip(true)
    }, 500)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    clearTimeout(timerRef.current)
    if (longPressRef.current) {
      e.preventDefault()
      setTimeout(() => setShowTip(false), 2000)
    }
    longPressRef.current = false
  }
  const handleTouchMove = () => clearTimeout(timerRef.current)
  const handleClick = () => { if (!longPressRef.current) onClick() }

  return (
    <div
      role="button"
      aria-label={tooltip}
      className="relative flex items-center justify-center group/btn select-none"
      style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }}
      onClick={handleClick}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {showTip && (
        <div
          className="absolute pointer-events-none z-[200] whitespace-nowrap"
          style={{
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15,15,15,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {tooltip}
        </div>
      )}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: color,
          boxShadow: 'inset 0 -0.5px 0 rgba(0,0,0,0.3), 0 0 0 0.5px rgba(0,0,0,0.35)',
        }}
      >
        <span
          className="absolute inset-0 flex items-center justify-center leading-none opacity-0 group-hover/btn:opacity-100 transition-opacity"
          style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.55)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
        >
          {icon}
        </span>
      </div>
    </div>
  )
}

/* ─── Mobile demo card ───────────────────────────────────────────────── */
function MobileDemoCard({ demo }: { demo: Demo }) {
  return (
    <a
      href={`/demos/${demo.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-4 rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.02] active:scale-[0.98] transition-transform duration-150"
    >
      <div className="w-28 shrink-0 relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <Thumb
          demo={demo}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30 pointer-events-none" />
      </div>
      <div className="flex-1 min-w-0 py-3 pr-4">
        <div
          className="text-[9px] font-bold uppercase tracking-wide mb-1 inline-block px-1.5 py-0.5 rounded-full"
          style={{ background: demo.theme.primary, color: '#000' }}
        >
          {demo.category}
        </div>
        <p className="text-[13px] font-bold text-white leading-tight mb-1 truncate">{demo.name}</p>
        {demo.cardDescription && (
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-2">
            {demo.cardDescription}
          </p>
        )}
        <span
          className="text-[10px] font-bold text-black px-2.5 py-1 rounded-md inline-block"
          style={{ background: `linear-gradient(90deg, ${demo.theme.primary}, ${demo.theme.primaryLight ?? demo.theme.primary})` }}
        >
          View Demo →
        </span>
      </div>
    </a>
  )
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function Demos() {
  const [selected,     setSelected]     = useState<Demo | null>(null)
  const [loaded,       setLoaded]       = useState(false)
  const [visible,      setVisible]      = useState(true)
  const [isHidden,     setIsHidden]     = useState(false)
  const [isHiding,     setIsHiding]     = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isShaking,    setIsShaking]    = useState(false)
  const [baseH,        setBaseH]        = useState(550)
  const [homePressed,  setHomePressed]  = useState(false)

  useEffect(() => {
    const update = () => setBaseH(window.innerWidth >= 768 ? 550 : 420)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const fade = (fn: () => void) => {
    setVisible(false)
    setTimeout(() => { fn(); setVisible(true) }, 200)
  }

  const pick = (demo: Demo) => {
    if (selected?.id === demo.id) return
    fade(() => { setLoaded(false); setSelected(demo) })
  }

  const goHome = () => {
    if (!selected) return
    fade(() => setSelected(null))
  }

  const handleRed = () => {
    if (isFullscreen) setIsFullscreen(false)
    setIsHiding(true)
    setTimeout(() => { setIsHiding(false); setIsHidden(true) }, 300)
  }

  const handleYellow = () => {
    if (isFullscreen) {
      setIsFullscreen(false)
    } else {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }

  const handleGreen = () => setIsFullscreen(s => !s)

  /* ─── VIEW A — home grid ─── */
  const viewA = (
    <div className="h-full overflow-y-auto" style={{ background: '#0a0a0a' }}>
      <div className="p-5">
        <p
          className="text-center text-[10px] font-semibold uppercase tracking-widest mb-5 pt-1"
          style={{ color: '#c9a84c' }}
        >
          Choose a Demo
        </p>
        <div className="grid grid-cols-2 gap-3">
          {demos.map((demo) => (
            <button
              key={demo.id}
              onClick={() => pick(demo)}
              className="flex flex-col rounded-xl overflow-hidden text-left group transition-transform duration-200 hover:scale-[1.02] active:scale-95"
              style={{
                background: '#111111',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <Thumb
                  demo={demo}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                <div
                  className="absolute top-1.5 left-1.5 text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                  style={{ background: demo.theme.primary, color: '#000' }}
                >
                  {demo.category}
                </div>
              </div>
              <div className="p-2.5 flex flex-col gap-1.5">
                <p className="text-white text-[10px] font-bold truncate">{demo.name}</p>
                <div
                  className="text-[10px] font-bold text-black text-center py-1 rounded-md"
                  style={{ background: `linear-gradient(90deg, ${demo.theme.primary}, ${demo.theme.primaryLight ?? demo.theme.primary})` }}
                >
                  View Demo →
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  /* ─── VIEW B — full iframe ─── */
  const viewB = selected ? (
    <div className="flex flex-col h-full">
      <div
        className="flex-none flex items-center justify-between"
        style={{ height: 44, padding: '0 14px', background: '#0d0d0d', borderBottom: '1px solid #222222' }}
      >
        <button
          onClick={goHome}
          className="flex items-center gap-1.5 transition-colors hover:opacity-80 active:opacity-60"
          style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, minWidth: 44, minHeight: 44 }}
        >
          <ArrowLeft style={{ width: 13, height: 13 }} />
          Back
        </button>
        <span className="font-bold truncate mx-4" style={{ fontSize: 12, color: '#ffffff' }}>
          {selected.name}
        </span>
        <a
          href="#contact"
          className="flex-none flex items-center gap-1 rounded-lg font-bold text-black gold-gradient hover:opacity-90 transition-opacity active:opacity-70"
          style={{ fontSize: 10, padding: '5px 10px', minHeight: 36 }}
        >
          Get This Website
          <ArrowRight style={{ width: 10, height: 10 }} />
        </a>
      </div>
      <div className="flex-1 relative">
        <iframe
          key={selected.slug}
          src={`/demos/${selected.slug}?embed=true`}
          className="w-full h-full border-0"
          style={{ display: 'block', touchAction: 'pan-y' }}
          title={selected.name}
          onLoad={() => setLoaded(true)}
        />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none transition-opacity duration-300"
          style={{ background: '#0a0a0a', opacity: loaded ? 0 : 1 }}
        >
          <div
            className="rounded-full border-2 animate-spin"
            style={{ width: 30, height: 30, borderColor: '#c9a84c30', borderTopColor: '#c9a84c' }}
          />
          <span style={{ color: '#4b5563', fontSize: 12 }}>Loading {selected.name}…</span>
        </div>
      </div>
    </div>
  ) : null

  const screenContent = selected ? viewB : viewA

  /* ─── Frame styles ─── */
  const BEZEL_TOP    = 18
  const BEZEL_SIDE   = 18
  const BEZEL_BOTTOM = 55
  const FRAME_GRADIENT = 'linear-gradient(145deg, #d0d0d0 0%, #888888 30%, #b8b8b8 55%, #707070 80%, #909090 100%)'

  const outerStyle: React.CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0a0a0a',
        padding: `${BEZEL_TOP}px ${BEZEL_SIDE}px ${BEZEL_BOTTOM}px`,
        pointerEvents: 'auto',
      }
    : {
        position: 'relative',
        background: FRAME_GRADIENT,
        borderRadius: 36,
        padding: `${BEZEL_TOP}px ${BEZEL_SIDE}px ${BEZEL_BOTTOM}px`,
        boxShadow: [
          '0 40px 100px rgba(0,0,0,0.85)',
          '0 20px 40px rgba(0,0,0,0.5)',
          '0 0 0 1px rgba(255,255,255,0.15)',
          'inset 0 1px 0 rgba(255,255,255,0.35)',
          'inset 0 -1px 0 rgba(0,0,0,0.3)',
        ].join(', '),
        opacity: isHiding ? 0 : 1,
        transform: isHiding ? 'translateY(-20px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease, transform 0.3s ease, border-radius 0.3s ease',
        /* Frame never intercepts page scroll — only the screen area does */
        pointerEvents: 'none',
        maxWidth: 900,
        margin: '0 auto',
      }

  const screenStyle: React.CSSProperties = {
    height: isFullscreen
      ? `calc(100vh - ${BEZEL_TOP + BEZEL_BOTTOM}px)`
      : baseH,
    borderRadius: isFullscreen ? 0 : 20,
    overflow: 'hidden',
    background: '#000',
    boxShadow: isFullscreen
      ? 'none'
      : [
          'inset 0 0 0 1px rgba(0,0,0,0.6)',
          'inset 0 2px 8px rgba(0,0,0,0.5)',
        ].join(', '),
    position: 'relative',
    /* Override parent pointer-events: none so screen is interactive */
    pointerEvents: 'auto',
  }

  return (
    <section id="demos" className="bg-[#0a0a0a] py-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Section title */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3">
            Live Website Demos
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white">
            See what your site{' '}
            <span className="gold-text">could look like.</span>
          </h2>
        </div>

        {/* ── HIDDEN STATE ── */}
        {isHidden ? (
          <div className="flex justify-center py-10">
            <button
              onClick={() => setIsHidden(false)}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                border: '1px solid #c9a84c',
                color: '#c9a84c',
                background: 'rgba(201,168,76,0.06)',
                boxShadow: '0 0 24px rgba(201,168,76,0.1)',
                minHeight: 44,
              }}
            >
              <span>👀</span>
              Reveal Demo
            </button>
          </div>
        ) : (
          <>
            {/* ── Desktop: iPad FRAME (hidden on mobile) ── */}
            <div className="hidden md:block">
              <div
                className={isShaking ? 'animate-shake' : ''}
                style={outerStyle}
              >
                {/* ── Hardware ridges (normal mode only) ── */}
                {!isFullscreen && (
                  <>
                    {/* Volume up */}
                    <div style={{
                      position: 'absolute', left: 3, top: '22%',
                      width: 4, height: 44,
                      borderRadius: '0 3px 3px 0',
                      background: 'linear-gradient(90deg, #3e3e3e, #323232, #3e3e3e)',
                      boxShadow: 'inset 1px 0 1px rgba(255,255,255,0.06), -1px 0 3px rgba(0,0,0,0.65)',
                      zIndex: 2,
                    }} />
                    {/* Volume down */}
                    <div style={{
                      position: 'absolute', left: 3, top: 'calc(22% + 58px)',
                      width: 4, height: 36,
                      borderRadius: '0 3px 3px 0',
                      background: 'linear-gradient(90deg, #3e3e3e, #323232, #3e3e3e)',
                      boxShadow: 'inset 1px 0 1px rgba(255,255,255,0.06), -1px 0 3px rgba(0,0,0,0.65)',
                      zIndex: 2,
                    }} />
                  </>
                )}

                {/* ── Mac buttons — anchored to top bezel ── */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 16,
                  height: BEZEL_TOP,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  zIndex: 20,
                  pointerEvents: 'auto',
                }}>
                  <MacBtn color="#ff5f57" tooltip="You shouldn't be here 👀" onClick={handleRed} icon="×" />
                  <MacBtn color="#febc2e" tooltip={isFullscreen ? 'Restore size' : 'Restore size'} onClick={handleYellow} icon="−" />
                  <MacBtn color="#28c840" tooltip={isFullscreen ? 'Exit full screen' : 'Full screen'} onClick={handleGreen} icon={isFullscreen ? '⤡' : '⤢'} />
                </div>

                {/* ── Screen ── */}
                <div style={screenStyle}>
                  {/* Recessed screen vignette */}
                  {!isFullscreen && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 1,
                      pointerEvents: 'none',
                      borderRadius: 20,
                      background: [
                        'linear-gradient(to right,  rgba(0,0,0,0.28) 0px, transparent 18px)',
                        'linear-gradient(to left,   rgba(0,0,0,0.28) 0px, transparent 18px)',
                        'linear-gradient(to bottom, rgba(0,0,0,0.28) 0px, transparent 18px)',
                        'linear-gradient(to top,    rgba(0,0,0,0.18) 0px, transparent 12px)',
                      ].join(', '),
                    }} />
                  )}

                  {/* Screen content */}
                  <div style={{
                    height: '100%',
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    position: 'relative',
                    zIndex: 0,
                  }}>
                    {screenContent}
                  </div>
                </div>

                {/* ── Home button — re-enable pointer events ── */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: BEZEL_BOTTOM,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isFullscreen ? '#0a0a0a' : 'transparent',
                  pointerEvents: 'auto',
                }}>
                  <button
                    onClick={goHome}
                    title="Return to demo selector"
                    onMouseDown={() => setHomePressed(true)}
                    onMouseUp={() => setHomePressed(false)}
                    onMouseLeave={() => setHomePressed(false)}
                    onTouchStart={() => setHomePressed(true)}
                    onTouchEnd={() => setHomePressed(false)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: isFullscreen
                        ? 'linear-gradient(145deg, #2c2c2c 0%, #1a1a1a 100%)'
                        : 'linear-gradient(145deg, #d8d8d8 0%, #a0a0a0 50%, #c0c0c0 100%)',
                      boxShadow: [
                        '0 2px 8px rgba(0,0,0,0.7)',
                        'inset 0 1px 2px rgba(255,255,255,0.45)',
                        'inset 0 -1px 2px rgba(0,0,0,0.3)',
                      ].join(', '),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: homePressed ? 'scale(0.92)' : 'scale(1)',
                      transition: 'transform 0.1s ease',
                      cursor: 'pointer',
                      border: 'none',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: isFullscreen
                        ? 'linear-gradient(145deg, #333 0%, #222 100%)'
                        : 'linear-gradient(145deg, #9a9a9a 0%, #6a6a6a 100%)',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.18)',
                      pointerEvents: 'none',
                    }} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Mobile: vertical card list (hidden on md+) ── */}
            <div className="md:hidden grid gap-3">
              {demos.map((demo) => (
                <MobileDemoCard key={demo.id} demo={demo} />
              ))}
            </div>
          </>
        )}

      </div>
    </section>
  )
}
