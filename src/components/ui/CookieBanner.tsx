'use client'

import { useState, useEffect } from 'react'

const COOKIE_KEY = 'seliem_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-[360px] z-[140] rounded-xl border border-[#c9a84c]/20 bg-[#111] p-4 shadow-2xl shadow-black/60"
      style={{
        animation: 'fadeUp 0.4s ease forwards',
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <p className="text-[13px] text-gray-300 leading-relaxed mb-3">
        We use cookies to analyze site traffic and improve your experience.{' '}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#c9a84c] underline underline-offset-2 hover:text-[#f5d485] transition-colors"
        >
          Learn more
        </a>
      </p>

      <div className="flex gap-2">
        <button
          onClick={accept}
          className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-black gold-gradient hover:opacity-90 active:scale-95 transition-all"
        >
          Accept
        </button>
        <button
          onClick={decline}
          className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-gray-400 border border-white/10 hover:text-white hover:border-white/20 active:scale-95 transition-all"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
