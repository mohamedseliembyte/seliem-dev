'use client'

import { useEffect, useRef } from 'react'
import { X, ArrowRight } from 'lucide-react'
import type { Demo } from '@/types'
import DemoPage from './DemoPage'

interface DemoModalProps {
  demo: Demo
  onClose: () => void
}

export default function DemoModal({ demo, onClose }: DemoModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    // Reset to top whenever a new demo opens
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose, demo])

  return (
    /* overflow-hidden on the root so nothing bleeds outside the fixed layer */
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85" onClick={onClose} />

      {/* Modal panel — flex column, clips to viewport */}
      <div className="absolute inset-0 z-10 flex flex-col">

        {/* Top bar — fixed height, never scrolls */}
        <div className="flex-none flex items-center justify-between bg-[#0a0a0a] border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Live Demo</p>
              <p className="text-sm font-semibold text-white leading-tight">{demo.name}</p>
            </div>
          </div>

          <a
            href="#contact"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/20 hover:scale-[1.02] transition-all duration-200"
          >
            Get This Website
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Scrollable body — minHeight:0 is critical for overflow-y to work in a flex child */}
        <div
          ref={scrollRef}
          style={{
            flex: '1 1 0',
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}
        >
          <DemoPage demo={demo} />
        </div>

      </div>
    </div>
  )
}
