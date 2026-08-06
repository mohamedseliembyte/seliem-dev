import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Public read-only status check for a delivered site.
//
// A site we build can call this with its own project key and show a suspension
// notice when the project is paused. It deliberately returns nothing else — no
// client name, no billing detail, no lead id — so the key leaking reveals only
// whether one project is active.
//
//   GET /api/project-status?key=<project_key>  ->  { active: true | false }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || ''
  // Unknown or malformed keys fail open: a delivered site should never go dark
  // because of a typo or a database blip on our side.
  if (!UUID.test(key)) return NextResponse.json({ active: true }, { headers: cache() })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ active: true }, { headers: cache() })

  const { data, error } = await supabase
    .from('leads')
    .select('project_status')
    .eq('project_key', key)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ active: true }, { headers: cache() })
  return NextResponse.json({ active: data.project_status !== 'paused' }, { headers: cache() })
}

// Short cache: a resume should take effect quickly, but this must not become a
// per-pageview database hit on a client's busy site.
function cache() {
  return { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' }
}
