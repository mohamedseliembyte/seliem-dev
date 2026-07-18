'use client'

import { useRef, useEffect } from 'react'
import { Mail, Instagram } from 'lucide-react'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.79a8.28 8.28 0 0 0 4.84 1.54V6.86a4.84 4.84 0 0 1-1.07-.17z" />
    </svg>
  )
}

const channels = [
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@seliem.dev',
    href: 'mailto:hello@seliem.dev',
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

export default function Contact() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('[data-animate]').forEach((el, i) => {
              setTimeout(() => {
                ;(el as HTMLElement).style.opacity = '1'
                ;(el as HTMLElement).style.transform = 'translateY(0)'
              }, i * 100)
            })
          }
        })
      },
      { threshold: 0.15 },
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="contact" ref={sectionRef} className="section-padding bg-[#0a0a0a]">
      <div className="container-max">
        <div className="text-center mb-14">
          <p
            data-animate
            style={{ opacity: 0, transform: 'translateY(16px)', transition: 'opacity 0.5s ease-out, transform 0.5s ease-out' }}
            className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3"
          >
            Let&apos;s Stay Connected
          </p>
          <h2
            data-animate
            style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.6s ease-out 80ms, transform 0.6s ease-out 80ms' }}
            className="text-4xl sm:text-5xl font-black text-white mb-4"
          >
            Find me anywhere.
          </h2>
          <p
            data-animate
            style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.6s ease-out 160ms, transform 0.6s ease-out 160ms' }}
            className="text-gray-400 text-lg max-w-md mx-auto"
          >
            Reach out through whatever channel works best for you. I respond fast.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {channels.map((channel, i) => {
            const Icon = channel.icon
            return (
              <a
                key={channel.label}
                href={channel.href}
                target={channel.href.startsWith('http') ? '_blank' : undefined}
                rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                data-animate
                style={{
                  opacity: 0,
                  transform: 'translateY(24px)',
                  transition: `opacity 0.6s ease-out ${i * 100 + 200}ms, transform 0.6s ease-out ${i * 100 + 200}ms`,
                }}
                className="group flex flex-col items-center text-center p-6 sm:p-8 rounded-xl border border-white/5 bg-white/[0.02] hover:border-[#c9a84c]/30 hover:bg-[#c9a84c]/3 transition-all duration-300 w-full min-w-0"
              >
                <div className="w-14 h-14 rounded-xl border border-[#c9a84c]/30 flex items-center justify-center mb-4 group-hover:border-[#c9a84c] group-hover:bg-[#c9a84c]/10 transition-all duration-300">
                  <Icon className="w-6 h-6 text-[#c9a84c]" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-1">{channel.label}</p>
                <p className="font-semibold text-white mb-1 break-all text-[13px] w-full leading-snug">{channel.value}</p>
                <p className="text-xs text-gray-500">{channel.description}</p>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
