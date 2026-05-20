import Link from 'next/link'
import { Instagram, Mail } from 'lucide-react'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.79a8.28 8.28 0 0 0 4.84 1.54V6.86a4.84 4.84 0 0 1-1.07-.17z" />
    </svg>
  )
}

const navLinks = [
  { label: 'Home',         href: '/' },
  { label: 'Live Demos',   href: '#demos' },
  { label: 'Services',     href: '#services' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Contact',      href: '#contact' },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0a0a0a]" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

          {/* Brand */}
          <div>
            <Link href="/" className="text-2xl font-black gold-text inline-block mb-3">
              Seliem.dev
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Websites &amp; AI Automations for businesses, creators, and professionals ready to look serious online.
            </p>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer navigation">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">Navigation</p>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Connect */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">Connect</p>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:mohamed.seliem.dev@gmail.com"
                  aria-label="Email Mohamed Seliem"
                  className="flex items-start gap-2.5 text-sm text-gray-400 hover:text-[#c9a84c] transition-colors duration-200 min-w-0"
                >
                  <Mail className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="break-all min-w-0">mohamed.seliem.dev@gmail.com</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.tiktok.com/@seliem.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok @seliem.dev (opens in new tab)"
                  className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#c9a84c] transition-colors duration-200"
                >
                  <TikTokIcon className="w-4 h-4 text-[#c9a84c] shrink-0" />
                  <span>@seliem.dev</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/seliem.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram @seliem.dev (opens in new tab)"
                  className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#c9a84c] transition-colors duration-200"
                >
                  <Instagram className="w-4 h-4 text-[#c9a84c] shrink-0" aria-hidden="true" />
                  <span>@seliem.dev</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © 2025 Seliem.dev. All rights reserved.
          </p>
          <p className="text-xs text-gray-700">Built by Mohamed Seliem</p>
        </div>
      </div>
    </footer>
  )
}
