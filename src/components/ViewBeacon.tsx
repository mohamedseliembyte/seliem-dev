'use client'

import { useEffect, useRef } from 'react'

// Fires one anonymous "this prospect opened their preview" ping ~1.2s after the
// page becomes visible — long enough to skip bot prefetches and instant bounces,
// so a view is a real signal the admin can act on. No cookies, no PII: just the
// prospect id and a timestamp on the server.
export function ViewBeacon({ prospectId }: { prospectId: string }) {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    const timer = setTimeout(() => {
      if (sent.current || document.visibilityState !== 'visible') return
      sent.current = true
      fetch('/api/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prospectId }),
        keepalive: true,
      }).catch(() => {})
    }, 1200)
    return () => clearTimeout(timer)
  }, [prospectId])
  return null
}
