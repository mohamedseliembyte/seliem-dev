'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Instagram, Mail } from 'lucide-react'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.79a8.28 8.28 0 0 0 4.84 1.54V6.86a4.84 4.84 0 0 1-1.07-.17z" />
    </svg>
  )
}

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Live Demos', href: '#demos' },
  { label: 'Services', href: '#services' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMobile = () => setMobileOpen(false)

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center select-none">
            <span className="text-xl font-black tracking-tight gold-text">Seliem.dev</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors duration-200 font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop social + mobile toggle */}
          <div className="flex items-center gap-3">
            <a
              href="https://www.tiktok.com/@seliem.dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="hidden md:flex items-center text-[#c9a84c] hover:text-[#f5d485] transition-colors duration-200"
            >
              <TikTokIcon className="w-[18px] h-[18px]" />
            </a>
            <a
              href="https://www.instagram.com/seliem.dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hidden md:flex items-center text-[#c9a84c] hover:text-[#f5d485] transition-colors duration-200"
            >
              <Instagram className="w-[18px] h-[18px]" />
            </a>
            <a
              href="mailto:hello@seliem.dev"
              aria-label="Email"
              className="hidden md:flex items-center text-[#c9a84c] hover:text-[#f5d485] transition-colors duration-200"
            >
              <Mail className="w-[18px] h-[18px]" />
            </a>

            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 text-white hover:text-[#c9a84c] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-[#0a0a0a]/98 backdrop-blur-md border-t border-white/5 px-6 pt-4 pb-6 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMobile}
              className="block py-3 text-gray-300 hover:text-white text-base font-medium border-b border-white/5 last:border-0 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-5 pt-5">
            <a
              href="https://www.tiktok.com/@seliem.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c9a84c] hover:text-[#f5d485] transition-colors"
            >
              <TikTokIcon className="w-5 h-5" />
            </a>
            <a
              href="https://www.instagram.com/seliem.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c9a84c] hover:text-[#f5d485] transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="mailto:hello@seliem.dev"
              aria-label="Email"
              className="text-[#c9a84c] hover:text-[#f5d485] transition-colors"
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
