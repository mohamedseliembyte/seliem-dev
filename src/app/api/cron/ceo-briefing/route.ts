import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateBriefing } from '@/lib/briefing'
import { sendTelegramMessage } from '@/lib/telegram'

// Scheduled daily (Vercel Cron) — sends the CEO briefing to Telegram.
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const message = await generateBriefing()
    const ok = await sendTelegramMessage(message)
    console.log(`[ceo-briefing] sent: ${ok}`)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[ceo-briefing] error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}
