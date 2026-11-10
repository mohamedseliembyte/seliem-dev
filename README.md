# Seliem.dev

Premium websites and AI automations — Mohamed Seliem.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build for Production

```bash
npm run build
npm start
```

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** (animations)
- **React Hook Form** (lead form validation)
- **Resend** (email — plug in API key to activate)

## Editing Content

| What | Where |
|------|-------|
| All 8 demo businesses (names, images, services, testimonials, booking) | `src/data/demos.ts` |
| Your services section | `src/components/sections/Services.tsx` |
| How It Works steps | `src/components/sections/HowItWorks.tsx` |
| Social links & email | `src/components/layout/Navbar.tsx`, `Footer.tsx`, `sections/Contact.tsx` |
| Lead form budget options | `src/components/sections/LeadForm.tsx` |
| Site metadata & SEO | `src/app/layout.tsx` |
| Colors & fonts | `tailwind.config.ts` + `src/app/globals.css` |

## Adding Resend Email

1. Create an account at [resend.com](https://resend.com)
2. Generate an API key
3. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   CONTACT_TO_EMAIL=your@email.com
   ```
4. Update the `from` address in `src/app/api/contact/route.ts` to match your verified Resend domain

Without `RESEND_API_KEY`, the form returns success and logs to the console (safe for local dev).

## Billing (Stripe)

Clients pay invoices and payment requests by card, and start or manage a care
plan (Basic / Pro / Ultra, monthly or annual) from **seliem.dev/account**.
Payments are recorded **only by the webhook**, never by the return page: the
row flips to `paid` (with a "card" badge in admin), and you get a Telegram
alert. PayPal links keep working alongside as a fallback.

Until `STRIPE_SECRET_KEY` is set, the site behaves exactly as before (PayPal only).

### One-time setup

1. **Apply the migration.** In Supabase → SQL editor, run
   `supabase/migrations/20261110000000_stripe_billing.sql`. Do this *before*
   step 4, or card checkout will fail.
2. **Create a sandbox first.** Stripe Dashboard → account picker → *Sandboxes* →
   create one for seliem.dev. Do steps 3–5 there, test end to end, then repeat
   with live keys.
3. **Create the products, portal and webhook.** From your own machine, using a
   full secret key (only this script needs one):
   ```bash
   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs --webhook-url https://seliem.dev/api/stripe/webhook
   ```
   It prints `STRIPE_PORTAL_CONFIGURATION_ID` and `STRIPE_WEBHOOK_SECRET`
   (the secret is shown once). The script is safe to re-run: to change a price,
   edit `PLANS` in the script and run it again. New subscribers get the new
   price; existing subscribers stay on the old one.
4. **Create a restricted key for the app.** Dashboard → Developers → API keys →
   *Create restricted key*, with:
   | Resource | Permission |
   |---|---|
   | Checkout Sessions | Write |
   | Customers | Write |
   | Customer portal | Write |
   | Prices | Read |
   | Subscriptions | Read |
   | Webhook endpoints | none (signature uses the signing secret) |

   If checkout ever fails with a permissions error in the Vercel logs, add
   *Products: Write* (invoices create their line items on the fly).
5. **Add to Vercel** (Settings → Environment Variables, Production), then redeploy:
   | Variable | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | the restricted key, `rk_live_…` |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` from step 3 |
   | `STRIPE_PORTAL_CONFIGURATION_ID` | `bpc_…` from step 3 |
   | `NEXT_PUBLIC_SITE_URL` | `https://seliem.dev` (optional; used for return URLs) |
6. **Dashboard settings** worth turning on: Settings → Payments → *Payment
   methods* (cards, Apple Pay and Google Pay are dynamic; nothing to code);
   Settings → *Customer emails* → successful payments (receipts) and
   failed-payment emails; Billing → *Revenue recovery* → Smart Retries.

**Sales tax:** none is collected today. If you take on clients in a state or
country where you're registered, add the registration under Stripe Tax and
enable `automatic_tax` on the Checkout Sessions in
`src/app/api/account/checkout/route.ts`. Prices are created tax-exclusive.

### Testing in a sandbox

Sign in to `/account` as a client with a sent invoice, click **Pay**, and use
card `4242 4242 4242 4242` with any future date and any CVC. To see a decline,
use `4000 0000 0000 9995`. To rehearse a failed renewal, start a care plan, then
advance it with a test clock in the Dashboard. For local webhook
testing:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

| Code | What |
|---|---|
| `src/lib/stripe.ts` | client, care-plan lookup keys, customer per lead |
| `src/app/api/account/checkout/route.ts` | Checkout for invoices, payment requests, care plans |
| `src/app/api/account/billing-portal/route.ts` | Customer Portal (card, plan, cancel, receipts) |
| `src/app/api/stripe/webhook/route.ts` | marks rows paid, mirrors subscriptions, refund/dispute/fraud alerts |
| `scripts/stripe-setup.mjs` | creates products/prices, portal config, webhook endpoint |

## Deployment

Deploy to [Vercel](https://vercel.com) in one command:

```bash
npx vercel
```

Add environment variables in the Vercel dashboard under **Settings → Environment Variables**.

## File Structure

```
src/
  app/
    layout.tsx              # Root layout + metadata
    page.tsx                # Home page
    globals.css             # Base styles + utilities
    demos/[slug]/page.tsx   # Individual demo routes
    api/contact/route.ts    # Contact form API (Resend)
  components/
    layout/
      Navbar.tsx
      Footer.tsx
    sections/
      Hero.tsx
      Demos.tsx
      Services.tsx
      HowItWorks.tsx
      LeadForm.tsx
      Contact.tsx
    demos/
      DemoModal.tsx         # Full-screen overlay demo viewer
      DemoPage.tsx          # Renders a realistic business website
      BookingFlow.tsx       # Barbershop, Restaurant, Request flows
    ui/
      Button.tsx
      Badge.tsx
  data/
    demos.ts                # All demo content — edit here
  lib/
    utils.ts                # cn(), time slot generators, calendar helpers
  types/
    index.ts                # TypeScript types
```
