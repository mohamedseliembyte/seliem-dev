-- Payment tracking: what a closed client owes, what's landed, and when the next
-- care-plan invoice needs sending. Deliberately manual-invoice shaped — payments
-- run through PayPal by hand, so the app tracks state rather than charging cards.

alter table public.prospect_leads
  add column if not exists deal_amount numeric(10,2),
  add column if not exists deposit_paid_on date,
  add column if not exists balance_paid_on date,
  add column if not exists care_plan_monthly numeric(10,2),
  add column if not exists next_invoice_on date;

-- Powers the "Owed" queue: unpaid project balances and care-plan invoices due.
create index if not exists prospect_leads_balance_due_idx
  on public.prospect_leads (balance_paid_on) where deal_amount is not null and balance_paid_on is null;
create index if not exists prospect_leads_next_invoice_idx
  on public.prospect_leads (next_invoice_on) where next_invoice_on is not null;
