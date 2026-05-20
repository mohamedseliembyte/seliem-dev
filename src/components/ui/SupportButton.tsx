'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle } from 'lucide-react'

export default function SupportButton() {
  const [visible, setVisible] = useState(false)
  const [open, setOpen]       = useState(false)

  // Fade in after 2 s so it doesn't distract on first load
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="fixed bottom-5 right-5 z-[150] flex flex-col items-end gap-2"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* ── Popup ── */}
      <div
        aria-hidden={!open}
        style={{
          opacity:        open ? 1 : 0,
          transform:      open ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
          transition:     'opacity 0.2s ease, transform 0.2s ease',
          pointerEvents:  open ? 'auto' : 'none',
          transformOrigin: 'bottom right',
        }}
        className="w-64 rounded-xl border border-[#c9a84c]/30 bg-[#111] p-4 shadow-2xl shadow-black/60"
      >
        {/* Close */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close support popup"
          className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>

        <p className="text-[13px] text-gray-300 leading-relaxed pr-4">
          Having trouble? Contact our support team at{' '}
          <a
            href="mailto:support@seliem.dev"
            className="font-semibold text-[#c9a84c] hover:text-[#f5d485] transition-colors underline underline-offset-2"
          >
            support@seliem.dev
          </a>
        </p>
      </div>

      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Need help?"
        className="flex items-center gap-2 rounded-full border border-[#c9a84c]/60 bg-[#0a0a0a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/40 hover:border-[#c9a84c] hover:bg-[#111] hover:shadow-[#c9a84c]/10 hover:shadow-xl active:scale-95 transition-all duration-200 sm:px-4 sm:py-2.5"
      >
        <MessageCircle className="w-4 h-4 text-[#c9a84c] shrink-0" />
        <span className="hidden sm:inline">Need Help?</span>
      </button>
    </div>
  )
}
