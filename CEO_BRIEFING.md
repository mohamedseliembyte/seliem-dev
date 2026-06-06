# Daily CEO Briefing

A daily Telegram summary of your business — leads, projects, payments, tasks, and alerts.

## What it sends

```
🚀 Good Morning Mohamed

📈 Leads
• New Leads: X        (created in the last 24h)
• Total Leads: X

💼 Projects
• Active Projects: X   (leads with status "won")
• Completed Projects: X (leads with status "completed")

💰 Payments
• Unpaid Invoices: X   (payments with status "pending")
• Overdue Invoices: X  (pending payments older than 7 days)

📋 Tasks
• Tasks Due Today: X   (from a `tasks` table if present, else 0)

⚠️ Alerts
• Overdue invoices, new leads awaiting contact, live chats in progress
```

## Architecture (modular)

| Piece | File |
|-------|------|
| Summary service | `src/lib/briefing.ts` — `generateBriefing()` builds the message from Supabase |
| Scheduler (cron) | `src/app/api/cron/ceo-briefing/route.ts` — runs daily, CRON_SECRET-protected |
| Telegram delivery | `src/lib/telegram.ts` — `sendTelegramMessage()` (existing bot) |
| Manual test page | `src/app/admin/test-ceo-briefing` (admin-only UI) |
| Manual test API | `src/app/api/admin/ceo-briefing/route.ts` (admin-authed) |

## Schedule

Configured in `vercel.json`:

```json
{ "path": "/api/cron/ceo-briefing", "schedule": "0 10 * * *" }
```

`0 10 * * *` = **10:00 UTC = 6:00 AM Eastern (EDT)**. Adjust the hour if your timezone changes (cron is always UTC).

## Manual testing

1. Go to **`/admin/test-ceo-briefing`**
2. Sign in with the admin Google account
3. Click **"Send test briefing"** → it generates the summary, sends it to Telegram, and previews the text on screen

## Environment

- `CRON_SECRET` — secures the cron endpoint (Vercel sends it automatically as a Bearer token)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — existing bot creds
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` — DB access

## Data-model mapping & extending

The briefing maps to the current schema:
- **Projects** are derived from lead `status` (`won` = active, `completed` = completed). Add a "completed" status to leads in the admin to populate Completed Projects.
- **Tasks** read from an optional `tasks` table (`status`, `due_date`). It doesn't exist yet — the briefing safely reports 0. To enable, create:

```sql
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  status text not null default 'open',  -- open | done
  due_date timestamptz,
  lead_id uuid references public.leads(id) on delete set null
);
alter table public.tasks enable row level security;
```

Error handling: every query is wrapped — a failure logs `[briefing] …` and counts as 0, so the briefing always sends.
