'use client'

import { useEffect } from 'react'

// Adds smooth scroll-in animations site-wide. Marks <html> with `js` so the
// reveal styles only apply when JS is running (content never stays hidden).
export default function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('js')

    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    if (els.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    els.forEach((el, i) => {
      // Gentle stagger for elements revealing together
      el.style.transitionDelay = `${Math.min(i % 6, 5) * 70}ms`
      io.observe(el)
    })

    return () => io.disconnect()
  }, [])

  return null
}
