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
    'Full-service digital agency: websites, advertising, marketing, AI automations and AI infrastructure for local businesses and growing brands.',
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
  serviceType: ['Web Design', 'Web Development', 'Website Redesign', 'Digital Advertising', 'Paid Media Management', 'Search Engine Optimization', 'Digital Marketing', 'Branding', 'AI Automation', 'AI Infrastructure', 'Lead Capture'],
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://seliem.dev'),
  title: 'Seliem.dev — Web, Advertising, Marketing & AI Agency',
  description:
    'Full-service agency for websites, advertising, marketing, AI automations and AI infrastructure. Built to get you found, booked, and running on autopilot.',
  keywords: ['digital agency', 'web design agency', 'marketing agency', 'advertising agency', 'AI automations', 'AI infrastructure', 'SEO', 'paid media', 'business websites'],
  alternates: {
    canonical: 'https://seliem.dev',
  },
  openGraph: {
    title: 'Seliem.dev — Web, Advertising, Marketing & AI Agency',
    description:
      'Websites, advertising, marketing and AI systems — designed, built and managed under one roof.',
    url: 'https://seliem.dev',
    siteName: 'Seliem.dev',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Seliem.dev — Web, Advertising, Marketing & AI Agency',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seliem.dev — Web, Advertising, Marketing & AI Agency',
    description:
      'Websites, advertising, marketing and AI systems — designed, built and managed under one roof.',
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
