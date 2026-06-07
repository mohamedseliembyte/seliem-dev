import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendTelegramMessage } from '@/lib/telegram'

// Runs (Vercel Cron) to prune stale chat history. Deletes conversations — and
// their messages — with no activity for longer than the retention window.
// Retention is configurable via CONVERSATION_RETENTION_DAYS (default 365).
export async function GET(req: NextRequest) {
  // Secure: Vercel sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

  const days = Number(process.env.CONVERSATION_RETENTION_DAYS) || 365
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  // Stale = last activity (updated_at, falling back to created_at) before cutoff.
  const { data: stale, error } = await supabase
    .from('conversations')
    .select('id, updated_at, created_at')
    .or(`updated_at.lt.${cutoff},and(updated_at.is.null,created_at.lt.${cutoff})`)
    .limit(1000)

  if (error) {
    console.error('[cron] archive-conversations select failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ids = (stale ?? []).map((c) => c.id)
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, archived: 0, retentionDays: days })
  }

  // Delete messages first (they reference the conversation), then conversations.
  let deletedMessages = 0
  const { count: msgCount } = await supabase
    .from('messages')
    .delete({ count: 'exact' })
    .in('conversation_id', ids)
  deletedMessages = msgCount ?? 0

  const { error: cErr, count: convoCount } = await supabase
    .from('conversations')
    .delete({ count: 'exact' })
    .in('id', ids)
  if (cErr) {
    console.error('[cron] archive-conversations delete failed:', cErr.message)
    return NextResponse.json({ error: cErr.message }, { status: 500 })
  }

  const archived = convoCount ?? ids.length
  console.log(`[cron] archived ${archived} conversations (${deletedMessages} messages), retention ${days}d`)

  if (archived > 0) {
    await sendTelegramMessage(
      `🗄️ <b>Conversation archival</b>\n\nRemoved ${archived} conversation${archived > 1 ? 's' : ''} (${deletedMessages} message${deletedMessages === 1 ? '' : 's'}) inactive for >${days} days.`,
    )
  }

  return NextResponse.json({ ok: true, archived, deletedMessages, retentionDays: days })
}
