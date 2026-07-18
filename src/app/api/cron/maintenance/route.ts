import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runPaymentReminders, runAgreementReminders, runArchiveConversations } from '@/lib/cron-jobs'

// Consolidated daily maintenance cron. The Hobby plan caps cron jobs at 2, so
// instead of registering payment-reminders, agreement-reminders, and
// archive-conversations separately, this single route runs all three. Each is
// wrapped in try/catch so one failure never blocks the others.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const safe = async <T>(label: string, fn: () => Promise<T>) => {
    try { return await fn() } catch (err) {
      console.error(`[cron/maintenance] ${label} failed:`, err instanceof Error ? err.message : String(err))
      return { ok: false as const, error: String(err) }
    }
  }

  const payments = await safe('payment-reminders', runPaymentReminders)
  const agreements = await safe('agreement-reminders', runAgreementReminders)
  const archive = await safe('archive-conversations', runArchiveConversations)

  return NextResponse.json({ ok: true, payments, agreements, archive })
}
