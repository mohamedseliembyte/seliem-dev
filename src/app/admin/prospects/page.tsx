'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase-client'
import { exchangeGoogleToken, googlePopupSignIn } from '@/lib/google-auth'

type Prospect = { id: string; priority: string | null; business: string; niche: string | null; city: string | null; state: string | null; phone: string | null; address: string | null; website: string | null; maps_url: string | null; sheet_status: string | null; status: string | null }
type Payload = { prospects: Prospect[]; total: number; page: number; pageSize: number; integration?: { account_email: string; updated_at: string } | null; sync?: { status: string; row_count: number; completed_at?: string } | null }

export default function ProspectsPage() {
  const [token, setToken] = useState(''), [data, setData] = useState<Payload | null>(null)
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true), [working, setWorking] = useState(''), [error, setError] = useState('')

  const load = useCallback(async (accessToken: string, currentPage = page, q = query) => {
    setLoading(true); setError('')
    const params = new URLSearchParams({ page: String(currentPage), search: q })
    const response = await fetch(`/api/admin/prospects?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    const payload = await response.json()
    if (!response.ok) setError(payload.error || 'Could not load prospects.'); else setData(payload)
    setLoading(false)
  }, [page, query])

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    supabase.auth.getSession().then(({ data: sessionData }) => {
      const accessToken = sessionData.session?.access_token || ''
      setToken(accessToken); if (accessToken) load(accessToken, 1, ''); else setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn() {
    setError('')
    try {
      const google = await googlePopupSignIn(), supabase = getSupabaseBrowser()
      const { data: authData, error: authError } = await exchangeGoogleToken(supabase, google.idToken, google.nonce)
      if (authError || !authData.session) throw authError || new Error('Sign-in failed')
      setToken(authData.session.access_token); await load(authData.session.access_token, 1, '')
    } catch { setError('Admin sign-in did not complete.') }
  }

  async function connect() {
    setWorking('Connecting…')
    const response = await fetch('/api/admin/google-sheets/connect', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const payload = await response.json(); if (response.ok) window.location.href = payload.url; else { setError(payload.error); setWorking('') }
  }

  async function sync() {
    setWorking('Importing about 29,000 businesses…'); setError('')
    const response = await fetch('/api/admin/prospects/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const payload = await response.json(); setWorking('')
    if (!response.ok) setError(payload.error || 'Sync failed.'); else await load(token, 1, query)
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/admin/prospects', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    setData((current) => current ? { ...current, prospects: current.prospects.map((p) => p.id === id ? { ...p, status } : p) } : current)
  }

  if (!token && !loading) return <main style={styles.center}><div style={styles.login}><div style={styles.eyebrow}>SELIEM.DEV</div><h1>Prospect intelligence</h1><p style={styles.muted}>Sign in with the approved admin account.</p><button style={styles.goldButton} onClick={signIn}>Continue with Google</button>{error && <p style={styles.error}>{error}</p>}</div></main>

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / (data?.pageSize || 50)))
  return <main style={styles.page}>
    <header style={styles.header}><div><Link href="/admin" style={styles.back}>← Admin</Link><h1 style={styles.title}>Prospect intelligence</h1><p style={styles.muted}>{(data?.total || 0).toLocaleString()} businesses ready for outreach</p></div><div style={styles.actions}>{data?.integration ? <button disabled={!!working} onClick={sync} style={styles.goldButton}>{working || 'Sync Google Sheet'}</button> : <button disabled={!!working} onClick={connect} style={styles.goldButton}>{working || 'Connect Google Sheets'}</button>}</div></header>
    <section style={styles.stats}>
      <div style={styles.card}><span style={styles.label}>TOTAL PROSPECTS</span><strong style={styles.big}>{(data?.total || 0).toLocaleString()}</strong></div>
      <div style={styles.card}><span style={styles.label}>GOOGLE ACCOUNT</span><strong style={styles.value}>{data?.integration?.account_email || 'Not connected'}</strong></div>
      <div style={styles.card}><span style={styles.label}>LAST IMPORT</span><strong style={styles.value}>{data?.sync?.completed_at ? new Date(data.sync.completed_at).toLocaleString() : 'Never'}</strong></div>
    </section>
    <form style={styles.searchbar} onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1); load(token, 1, search) }}><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search business, niche, city, or phone…" style={styles.input}/><button style={styles.searchButton}>Search</button></form>
    {error && <div style={styles.errorBox}>{error}</div>}
    <section style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Priority</th><th>Business</th><th>Niche</th><th>Location</th><th>Contact</th><th>Status</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan={7} style={styles.empty}>Loading prospects…</td></tr> : data?.prospects.map((p) => <tr key={p.id}><td><span style={priorityStyle(p.priority)}>{p.priority || '—'}</span></td><td><strong>{p.business}</strong><small style={styles.address}>{p.address}</small></td><td>{p.niche || '—'}</td><td>{[p.city, p.state].filter(Boolean).join(', ') || '—'}</td><td>{p.phone ? <a style={styles.link} href={`tel:${p.phone}`}>{p.phone}</a> : '—'}{p.website && <a style={styles.smallLink} href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank">Website ↗</a>}</td><td><select value={p.status || ''} onChange={(e) => updateStatus(p.id, e.target.value)} style={styles.select}><option value="">Uncontacted</option><option>Researching</option><option>Contacted</option><option>Interested</option><option>Follow up</option><option>Closed</option><option>Not a fit</option></select></td><td>{p.maps_url && <a style={styles.mapLink} href={p.maps_url} target="_blank">Map ↗</a>}</td></tr>)}</tbody></table></section>
    <footer style={styles.pagination}><button disabled={page <= 1} style={styles.pageButton} onClick={() => { const n = page - 1; setPage(n); load(token, n) }}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} style={styles.pageButton} onClick={() => { const n = page + 1; setPage(n); load(token, n) }}>Next</button></footer>
  </main>
}

const priorityStyle = (priority: string | null): React.CSSProperties => ({ padding: '5px 9px', borderRadius: 99, fontSize: 11, whiteSpace: 'nowrap', color: priority?.includes('HOT') ? '#ffcd72' : '#aaa', background: priority?.includes('HOT') ? 'rgba(212,168,83,.14)' : '#202020', border: `1px solid ${priority?.includes('HOT') ? 'rgba(212,168,83,.3)' : '#303030'}` })
const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#090909', color: '#f5f2ea', padding: '0 28px 40px', fontFamily: 'Arial, sans-serif' }, center: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#090909', color: '#fff' }, login: { width: 380, padding: 36, border: '1px solid #242424', borderRadius: 18, background: '#111', textAlign: 'center' }, eyebrow: { color: '#d4a853', fontSize: 11, letterSpacing: 3 }, muted: { color: '#8c8c8c', margin: '6px 0 0', fontSize: 14 }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 0 22px', position: 'sticky', top: 0, zIndex: 5, background: 'rgba(9,9,9,.94)', backdropFilter: 'blur(12px)' }, back: { color: '#888', textDecoration: 'none', fontSize: 13 }, title: { margin: '8px 0 0', fontSize: 28, letterSpacing: '-.6px' }, actions: { display: 'flex', gap: 10 }, goldButton: { marginTop: 18, background: '#d4a853', color: '#090909', border: 0, borderRadius: 9, padding: '11px 17px', fontWeight: 800, cursor: 'pointer' }, stats: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12, marginBottom: 16 }, card: { background: '#111', border: '1px solid #222', borderRadius: 14, padding: 18, minHeight: 78, display: 'flex', flexDirection: 'column', gap: 9 }, label: { color: '#777', fontSize: 10, letterSpacing: 1.5 }, big: { color: '#d4a853', fontSize: 28 }, value: { fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }, searchbar: { display: 'flex', gap: 8, margin: '18px 0' }, input: { flex: 1, background: '#111', color: '#fff', border: '1px solid #292929', borderRadius: 10, padding: '13px 15px', outline: 'none' }, searchButton: { background: '#222', border: '1px solid #333', color: '#eee', borderRadius: 9, padding: '0 20px', cursor: 'pointer' }, tableWrap: { overflowX: 'auto', border: '1px solid #222', borderRadius: 14, background: '#101010' }, table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, empty: { padding: 50, textAlign: 'center', color: '#777' }, address: { display: 'block', color: '#666', marginTop: 5, maxWidth: 260 }, link: { color: '#ddd', textDecoration: 'none' }, smallLink: { display: 'block', color: '#d4a853', marginTop: 5, fontSize: 11, textDecoration: 'none' }, mapLink: { color: '#d4a853', textDecoration: 'none', whiteSpace: 'nowrap' }, select: { background: '#171717', color: '#ddd', border: '1px solid #303030', borderRadius: 7, padding: '7px' }, pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 20, color: '#888', fontSize: 13 }, pageButton: { background: '#171717', color: '#ddd', border: '1px solid #303030', padding: '8px 14px', borderRadius: 7 }, error: { color: '#ff8e8e' }, errorBox: { background: '#2a1111', color: '#ffaaaa', border: '1px solid #542020', padding: 12, borderRadius: 8, marginBottom: 12 },
}
