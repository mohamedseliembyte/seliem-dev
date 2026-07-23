'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ── Hand-rolled dark slippy map ─────────────────────────────────────────────
// A real Google/Apple-style map with zero map libraries and no new deps: raster
// tiles from CARTO's free dark basemap (matches the gold-on-black theme), Web
// Mercator done inline, and drag-pan / wheel-zoom / pinch / +- buttons. Gold
// teardrop pins sit on top, one per city, sized by lead count; clicking a pin
// filters the lead list to that city.

const TILE = 256
const MIN_Z = 3
const MAX_Z = 15
const FIT_MAX_Z = 11 // don't fit tighter than city level, even for a single pin
const HOSTS = ['a', 'b', 'c', 'd']

const lon2x = (lon: number, z: number) => ((lon + 180) / 360) * TILE * 2 ** z
const lat2y = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TILE * 2 ** z
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function canonCity(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, '').replace(/\bsaint\b/g, 'st').replace(/\bfort\b/g, 'ft').replace(/\bmount\b/g, 'mt').replace(/\s+/g, ' ')
}

type CityRow = { city: string | null; count: number }
type Pin = { city: string; count: number; lat: number; lon: number }
type View = { z: number; cx: number; cy: number } // cx,cy = world px of the map centre at zoom z

type Props = {
  stateCode: string
  stateName: string
  index: Record<string, [number, number]> | undefined
  cities: CityRow[]
  selectedCity: string
  onSelect: (state: string, city: string) => void
}

export function LeadTileMap({ stateCode, stateName, index, cities, selectedCity, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View | null>(null)
  const [hover, setHover] = useState<{ city: string; count: number; x: number; y: number } | null>(null)
  const touched = useRef(false)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchBase = useRef(0)
  const wheelAcc = useRef(0)

  const pins = useMemo<Pin[]>(() => {
    if (!index) return []
    const idx: Record<string, [number, number]> = {}
    for (const name in index) { const c = canonCity(name); if (!(c in idx)) idx[c] = index[name] }
    for (const name in index) { const c = canonCity(name), co = index[name]; const head = c.split(/[-/]/)[0].trim(); if (head && !(head in idx)) idx[head] = co; if (c.startsWith('urban ')) { const u = c.slice(6).trim(); if (u && !(u in idx)) idx[u] = co } }
    return cities
      .map((row) => {
        const key = canonCity(row.city || '')
        if (!key || key === 'unknown city') return null
        const coords = idx[key]
        return coords ? { city: row.city as string, count: row.count, lat: coords[0], lon: coords[1] } : null
      })
      .filter((p): p is Pin => !!p)
      .sort((a, b) => b.count - a.count)
      .slice(0, 300)
  }, [index, cities])

  const maxCount = useMemo(() => Math.max(1, ...pins.map((p) => p.count)), [pins])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Re-fit whenever the state changes, until the user pans/zooms.
  useEffect(() => { touched.current = false; setHover(null) }, [stateCode])
  useEffect(() => {
    if (touched.current || !size.w || !size.h || !pins.length) return
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity
    for (const p of pins) { minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon); minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat) }
    let z = MAX_Z
    for (; z > MIN_Z; z--) {
      if (lon2x(maxLon, z) - lon2x(minLon, z) <= size.w * 0.84 && lat2y(minLat, z) - lat2y(maxLat, z) <= size.h * 0.84) break
    }
    z = clamp(z, MIN_Z, FIT_MAX_Z)
    setView({ z, cx: (lon2x(minLon, z) + lon2x(maxLon, z)) / 2, cy: (lat2y(minLat, z) + lat2y(maxLat, z)) / 2 })
  }, [pins, size, stateCode])

  const zoomBy = useCallback((delta: number, px: number, py: number) => {
    touched.current = true
    setView((v) => {
      if (!v) return v
      const nz = clamp(v.z + delta, MIN_Z, MAX_Z)
      if (nz === v.z) return v
      const originX = v.cx - size.w / 2, originY = v.cy - size.h / 2
      const scale = 2 ** (nz - v.z)
      const wx = (originX + px) * scale, wy = (originY + py) * scale
      return { z: nz, cx: wx - px + size.w / 2, cy: wy - py + size.h / 2 }
    })
  }, [size])

  // Native, non-passive wheel listener so preventDefault actually stops the page
  // from scrolling while you zoom the map.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      wheelAcc.current += e.deltaY
      if (Math.abs(wheelAcc.current) < 40) return
      const dir = wheelAcc.current > 0 ? -1 : 1
      wheelAcc.current = 0
      const rect = el.getBoundingClientRect()
      zoomBy(dir, e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [zoomBy])

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchBase.current = Math.hypot(a.x - b.x, a.y - b.y)
      drag.current = null
    } else {
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const rect = wrapRef.current?.getBoundingClientRect()
      if (pinchBase.current && rect) {
        const ratio = dist / pinchBase.current
        if (ratio > 1.6 || ratio < 0.62) {
          zoomBy(ratio > 1 ? 1 : -1, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top)
          pinchBase.current = dist
        }
      }
      return
    }
    if (!drag.current || drag.current.id !== e.pointerId) return
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    touched.current = true
    setView((v) => (v ? { ...v, cx: v.cx - dx, cy: v.cy - dy } : v))
  }
  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (drag.current?.id === e.pointerId) drag.current = null
    if (pointers.current.size < 2) pinchBase.current = 0
  }

  const ready = view && size.w > 0
  let tiles: { key: string; x: number; y: number; url: string }[] = []
  let originX = 0, originY = 0
  if (ready) {
    originX = view.cx - size.w / 2
    originY = view.cy - size.h / 2
    const n = 2 ** view.z
    for (let tx = Math.floor(originX / TILE); tx <= Math.floor((originX + size.w) / TILE); tx++) {
      for (let ty = Math.floor(originY / TILE); ty <= Math.floor((originY + size.h) / TILE); ty++) {
        if (ty < 0 || ty >= n) continue
        const wx = ((tx % n) + n) % n
        tiles.push({ key: `${tx}-${ty}`, x: tx * TILE - originX, y: ty * TILE - originY, url: `https://${HOSTS[Math.abs(tx + ty) % HOSTS.length]}.basemaps.cartocdn.com/dark_all/${view.z}/${wx}/${ty}.png` })
      }
    }
  }

  const message = !index ? 'Loading map…' : !pins.length ? `No mappable cities in ${stateName} yet` : !ready ? 'Loading map…' : ''

  return (
    <div
      ref={wrapRef}
      style={s.wrap}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onMouseLeave={() => setHover(null)}
    >
      {message && <div style={s.msg}>{message}</div>}

      {ready && !message && (
        <>
          <div style={s.layer}>
            {tiles.map((t) => (
              <img key={t.key} src={t.url} alt="" draggable={false} width={TILE} height={TILE} style={{ position: 'absolute', left: t.x, top: t.y, width: TILE, height: TILE, pointerEvents: 'none', userSelect: 'none' }} />
            ))}
          </div>

          {pins.map((pin) => {
            const px = lon2x(pin.lon, view!.z) - originX
            const py = lat2y(pin.lat, view!.z) - originY
            if (px < -40 || py < -60 || px > size.w + 40 || py > size.h + 20) return null
            const d = clamp(20 + Math.sqrt(pin.count / maxCount) * 30, 20, 52)
            const active = selectedCity === pin.city
            return (
              <button
                key={pin.city}
                title={`${pin.city}: ${pin.count.toLocaleString()} leads`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onSelect(stateCode, pin.city) }}
                onMouseEnter={() => setHover({ city: pin.city, count: pin.count, x: px, y: py })}
                onMouseLeave={() => setHover(null)}
                style={{ ...s.pin, left: px, top: py, width: d, height: d, zIndex: active ? 30 : 22 - Math.floor((pin.count / maxCount) * 9) }}
              >
                <span style={{ ...s.pinDrop, background: active ? '#f5d485' : '#d4a853', borderColor: active ? '#fff' : 'rgba(0,0,0,.4)' }} />
                <span style={{ ...s.pinLabel, fontSize: d >= 30 ? 11 : 9 }}>{pin.count >= 1000 ? `${Math.round(pin.count / 100) / 10}k` : pin.count}</span>
              </button>
            )
          })}

          {hover && (
            <div style={{ ...s.tip, left: clamp(hover.x + 16, 8, size.w - 170), top: clamp(hover.y - 8, 8, size.h - 70) }}>
              <strong style={s.tipTitle}>{hover.city}</strong>
              <span style={s.tipCount}>{hover.count.toLocaleString()} leads</span>
              <span style={s.tipHint}>{selectedCity === hover.city ? 'Filtering this city' : 'Click to filter to this city'}</span>
            </div>
          )}

          <div style={s.zoomCtl}>
            <button aria-label="Zoom in" style={s.zoomBtn} onClick={() => zoomBy(1, size.w / 2, size.h / 2)}>+</button>
            <button aria-label="Zoom out" style={{ ...s.zoomBtn, borderTop: '1px solid #333' }} onClick={() => zoomBy(-1, size.w / 2, size.h / 2)}>−</button>
          </div>
          <div style={s.badge}>{stateName} · {pins.length} cities pinned</div>
          <a href="https://carto.com/attributions" target="_blank" rel="noreferrer" style={s.attr} onPointerDown={(e) => e.stopPropagation()}>© OpenStreetMap · CARTO</a>
        </>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap: { position: 'relative', width: '100%', height: 470, overflow: 'hidden', borderRadius: 12, background: '#0b0b0b', border: '1px solid #202020', cursor: 'grab', touchAction: 'none', userSelect: 'none' },
  layer: { position: 'absolute', inset: 0 },
  msg: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#777', fontSize: 13 },
  pin: { position: 'absolute', transform: 'translate(-50%, -100%)', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.6))' },
  pinDrop: { position: 'absolute', inset: 0, borderRadius: '50% 50% 50% 0', transform: 'rotate(45deg)', border: '2px solid' },
  pinLabel: { position: 'absolute', left: 0, right: 0, top: '26%', textAlign: 'center', color: '#141414', fontWeight: 800, pointerEvents: 'none' },
  tip: { position: 'absolute', zIndex: 40, pointerEvents: 'none', display: 'grid', gap: 3, minWidth: 130, maxWidth: 165, padding: '9px 11px', background: 'rgba(14,14,14,.97)', border: '1px solid rgba(212,168,83,.4)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.6)' },
  tipTitle: { color: '#f5d485', fontSize: 13 }, tipCount: { color: '#eee', fontSize: 12 }, tipHint: { color: '#8d8d8d', fontSize: 10 },
  zoomCtl: { position: 'absolute', top: 12, right: 12, zIndex: 35, display: 'grid', borderRadius: 9, overflow: 'hidden', border: '1px solid #333', boxShadow: '0 4px 14px rgba(0,0,0,.5)' },
  zoomBtn: { width: 34, height: 34, background: '#141414', color: '#e9dcc0', border: 0, fontSize: 20, cursor: 'pointer', lineHeight: 1 },
  badge: { position: 'absolute', left: 12, top: 12, zIndex: 35, padding: '6px 10px', background: 'rgba(14,14,14,.85)', border: '1px solid #2a2a2a', borderRadius: 8, color: '#cfcfcf', fontSize: 11, pointerEvents: 'none' },
  attr: { position: 'absolute', right: 8, bottom: 6, zIndex: 35, color: '#8a8a8a', fontSize: 9, textDecoration: 'none', background: 'rgba(10,10,10,.6)', padding: '2px 5px', borderRadius: 5 },
}
