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

- **Next.js 14** (App Router)
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
      DemoScrollytelling.tsx # Scroll-driven demo narrative
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
