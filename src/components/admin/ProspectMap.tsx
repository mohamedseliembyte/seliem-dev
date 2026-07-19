'use client'

import { useEffect, useMemo, useState } from 'react'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import statesTopology from 'us-atlas/states-10m.json'

type LocationCount = { state: string; city: string | null; count: number }
type Props = { token: string; selectedState: string; selectedCity: string; onSelect: (state: string, city: string) => void }

const fipsToState: Record<string, string> = { '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY' }

export function ProspectMap({ token, selectedState, selectedCity, onSelect }: Props) {
  const [states, setStates] = useState<LocationCount[]>([]), [cities, setCities] = useState<LocationCount[]>([]), [citySearch, setCitySearch] = useState(''), [error, setError] = useState('')
  useEffect(() => { if (!token) return; fetch('/api/admin/prospects/locations', { headers: { Authorization: `Bearer ${token}` } }).then(async (r) => { const p = await r.json(); if (!r.ok) throw new Error(p.error); setStates(p.locations) }).catch(() => setError('Map counts could not be loaded.')) }, [token])
  useEffect(() => { if (!token || !selectedState) return; fetch(`/api/admin/prospects/locations?state=${selectedState}`, { headers: { Authorization: `Bearer ${token}` } }).then(async (r) => { const p = await r.json(); if (!r.ok) throw new Error(p.error); setCities(p.locations) }).catch(() => setError('City counts could not be loaded.')) }, [token, selectedState])

  const counts = useMemo(() => Object.fromEntries(states.map((row) => [row.state, row.count])), [states])
  const max = Math.max(1, ...states.map((row) => row.count))
  const shapes = useMemo(() => {
    const collection = feature(statesTopology, statesTopology.objects.states) as GeoJSON.FeatureCollection
    const projection = geoAlbersUsa().fitSize([960, 600], collection)
    const path = geoPath(projection)
    return collection.features.map((shape) => ({ code: fipsToState[String(shape.id).padStart(2, '0')], path: path(shape) || '' })).filter((shape) => shape.code && shape.path)
  }, [])
  const visibleCities = cities.filter((row) => !citySearch || (row.city || '').toLowerCase().includes(citySearch.toLowerCase()))

  function fill(code: string) { if (selectedState === code) return '#d4a853'; const ratio = (counts[code] || 0) / max; return counts[code] ? `rgba(212,168,83,${0.18 + Math.sqrt(ratio) * 0.62})` : '#171717' }
  function chooseState(code: string) { setCitySearch(''); onSelect(selectedState === code ? '' : code, '') }

  return <section className="lead-map" style={s.shell}>
    <div style={s.heading}><div><span style={s.eyebrow}>LEAD MAP</span><h2 style={s.title}>Explore prospects by location</h2><p style={s.muted}>Select a state, then choose a city or borough to filter the complete lead list below.</p></div>{selectedState && <button onClick={() => onSelect('', '')} style={s.clear}>Clear location</button>}</div>
    {error && <p style={s.error}>{error}</p>}
    <div style={s.layout}>
      <div style={s.mapWrap}>
        <svg role="img" aria-label="Interactive map of United States lead counts" viewBox="0 0 960 600" style={s.map}>
          {shapes.map((shape) => <path key={shape.code} d={shape.path} fill={fill(shape.code)} stroke={selectedState === shape.code ? '#f5d485' : '#3a342a'} strokeWidth={selectedState === shape.code ? 2.5 : 1} tabIndex={0} role="button" aria-label={`${shape.code}: ${(counts[shape.code] || 0).toLocaleString()} leads`} onClick={() => chooseState(shape.code)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chooseState(shape.code) } }} style={s.state}><title>{shape.code}: {(counts[shape.code] || 0).toLocaleString()} leads</title></path>)}
        </svg>
        <div style={s.legend}><span>Fewer leads</span><i style={{ ...s.swatch, background: 'rgba(212,168,83,.2)' }}/><i style={{ ...s.swatch, background: 'rgba(212,168,83,.5)' }}/><i style={{ ...s.swatch, background: 'rgba(212,168,83,.8)' }}/><span>More leads</span></div>
      </div>
      <aside style={s.panel}>
        <div style={s.panelHead}><div><span style={s.eyebrow}>{selectedState || 'ALL STATES'}</span><strong style={s.panelTitle}>{selectedState ? `${(counts[selectedState] || 0).toLocaleString()} leads` : `${states.reduce((sum, row) => sum + row.count, 0).toLocaleString()} mapped leads`}</strong></div></div>
        {selectedState ? <><input value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder="Search city or borough…" style={s.input}/><div style={s.cityList}><button onClick={() => onSelect(selectedState, '')} style={!selectedCity ? s.cityActive : s.city}><span>All of {selectedState}</span><strong>{(counts[selectedState] || 0).toLocaleString()}</strong></button>{visibleCities.map((row) => <button key={row.city || 'Unknown city'} onClick={() => onSelect(selectedState, row.city === 'Unknown city' ? '' : row.city || '')} style={selectedCity === row.city ? s.cityActive : s.city}><span>{row.city}</span><strong>{row.count.toLocaleString()}</strong></button>)}</div></> : <div style={s.stateList}>{states.map((row) => <button key={row.state} onClick={() => chooseState(row.state)} style={s.city}><span>{row.state}</span><strong>{row.count.toLocaleString()}</strong></button>)}</div>}
      </aside>
    </div>
  </section>
}

const s: Record<string, React.CSSProperties> = {
  shell: { margin: '14px 0', padding: 18, background: '#101010', border: '1px solid #252525', borderRadius: 14 }, heading: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 14 }, eyebrow: { color: '#d4a853', fontSize: 10, letterSpacing: 1.8 }, title: { margin: '6px 0 0', fontSize: 22 }, muted: { color: '#8d8d8d', margin: '6px 0 0', fontSize: 13 }, clear: { color: '#d4a853', background: 'transparent', border: '1px solid #45391f', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }, layout: { display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(240px,.7fr)', gap: 14 }, mapWrap: { minWidth: 0, padding: 10, background: '#0b0b0b', border: '1px solid #202020', borderRadius: 12 }, map: { display: 'block', width: '100%', height: 'auto', maxHeight: 470 }, state: { cursor: 'pointer', outline: 'none', transition: 'fill .15s ease' }, legend: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, color: '#707070', fontSize: 10 }, swatch: { width: 18, height: 8, borderRadius: 2 }, panel: { display: 'flex', flexDirection: 'column', minHeight: 340, maxHeight: 500, padding: 13, background: '#141414', border: '1px solid #252525', borderRadius: 12 }, panelHead: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 }, panelTitle: { display: 'block', marginTop: 5 }, input: { padding: '10px 11px', color: '#eee', background: '#0d0d0d', border: '1px solid #303030', borderRadius: 8 }, cityList: { display: 'grid', gap: 5, marginTop: 9, overflowY: 'auto' }, stateList: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 5, overflowY: 'auto' }, city: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '9px 10px', color: '#bbb', background: '#181818', border: '1px solid #292929', borderRadius: 7, cursor: 'pointer', textAlign: 'left' }, cityActive: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '9px 10px', color: '#111', background: '#d4a853', border: '1px solid #d4a853', borderRadius: 7, cursor: 'pointer', textAlign: 'left' }, error: { color: '#ff9999', fontSize: 13 },
}
