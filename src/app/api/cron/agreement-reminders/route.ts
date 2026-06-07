import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runAgreementReminders } from '@/lib/cron-jobs'

// Direct endpoint (still callable on its own; auth via CRON_SECRET).
// The scheduled run happens via the consolidated /api/cron/maintenance route.
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runAgreementReminders()
  return NextResponse.json(result, result.ok ? undefined : { status: 500 })
}
