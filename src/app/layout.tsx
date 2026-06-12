import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ChatWidget from '@/components/chat/ChatWidget'
import ScrollReveal from '@/components/ui/ScrollReveal'
import './globals.css'

// Structured data — helps Google show rich results for the business.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Seliem.dev',
  description:
    'Premium custom websites and AI automations for businesses, creators, and professionals.',
  url: 'https://seliem.dev',
  email: 'hello@seliem.dev',
  image: 'https://seliem.dev/logo.png',
  priceRange: '$$',
  founder: { '@type': 'Person', name: 'Mohamed Seliem' },
  sameAs: [
    'https://www.instagram.com/seliem.dev',
    'https://www.tiktok.com/@seliem.dev',
  ],
  areaServed: 'Worldwide',
  serviceType: ['Web Design', 'Website Redesign', 'AI Automation', 'Lead Capture'],
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://seliem.dev'),
  title: 'Seliem.dev — Premium Websites & AI Automations',
  description:
    'Premium websites and AI automations for businesses, creators, and professionals. Built to convert visitors into leads.',
  keywords: ['web design', 'AI automations', 'premium websites', 'business websites', 'Next.js'],
  alternates: {
    canonical: 'https://seliem.dev',
  },
  openGraph: {
    title: 'Seliem.dev — Premium Websites & AI Automations',
    description:
      'Premium websites and AI automations built to help you get noticed, capture leads, and turn visitors into action.',
    url: 'https://seliem.dev',
    siteName: 'Seliem.dev',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Seliem.dev — Premium Websites & AI Automations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seliem.dev — Premium Websites & AI Automations',
    description:
      'Premium websites and AI automations built to help you get noticed, capture leads, and turn visitors into action.',
    images: ['/logo.png'],
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/logo.png',
    },
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0a0a0a] text-white antialiased">
        {/* Skip to main content — visible only on keyboard focus */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        {children}
        <ChatWidget />
        <ScrollReveal />
        {/* Cookieless analytics only (Vercel) — no consent banner needed. */}
        <Analytics />
        <SpeedInsights />
        <Script id="ld-json" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(jsonLd)}
        </Script>
      </body>
    </html>
  )
}
