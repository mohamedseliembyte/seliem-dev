import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdmin, enforceRateLimit } from '@/lib/admin-api'
import { GOOGLE_SHEET_ID, GOOGLE_SHEET_RANGE, googleAccessToken } from '@/lib/google-sheets'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = await authorizeAdmin(req); if (auth.response) return auth.response
  const limited = await enforceRateLimit(auth.supabase!, auth.email!, 'prospect-sync', 3, 900); if (limited) return limited
  const { data: sync } = await auth.supabase!.from('google_sheet_syncs').insert({ source_sheet_id: GOOGLE_SHEET_ID, status: 'running' }).select('id').single()
  try {
    const token = await googleAccessToken()
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${encodeURIComponent(GOOGLE_SHEET_RANGE)}?majorDimension=ROWS`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (!response.ok) throw new Error(`Google Sheets returned ${response.status}.`)
    const payload = await response.json() as { values?: unknown }
    if (!Array.isArray(payload.values) || payload.values.length > 50_000) throw new Error('The spreadsheet response is invalid or too large.')
    const rows = payload.values.map((row) => {
      if (!Array.isArray(row)) throw new Error('The spreadsheet contains an invalid row.')
      return row.slice(0, 10).map((cell) => typeof cell === 'string' ? cell.trim().slice(0, 2_000) : '')
    })
    const now = new Date().toISOString()
    const records = rows.map((row, index) => ({ source_sheet_id: GOOGLE_SHEET_ID, sheet_row: index + 2, priority: row[0] || null, business: row[1] || '(Unnamed business)', niche: row[2] || null, city: row[3] || null, state: row[4] || null, phone: row[5] || null, address: row[6] || null, website: row[7] || null, maps_url: row[8] || null, sheet_status: row[9] || null, imported_at: now, updated_at: now }))
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await auth.supabase!.from('prospect_leads').upsert(records.slice(i, i + 500), { onConflict: 'source_sheet_id,sheet_row' })
      if (error) throw error
    }
    if (sync?.id) await auth.supabase!.from('google_sheet_syncs').update({ status: 'completed', row_count: records.length, completed_at: now }).eq('id', sync.id)
    return NextResponse.json({ success: true, imported: records.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed.'
    if (sync?.id) await auth.supabase!.from('google_sheet_syncs').update({ status: 'failed', error: message, completed_at: new Date().toISOString() }).eq('id', sync.id)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
