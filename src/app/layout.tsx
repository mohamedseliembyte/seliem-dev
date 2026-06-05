import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ChatWidget from '@/components/chat/ChatWidget'
import ScrollReveal from '@/components/ui/ScrollReveal'
import CookieBanner from '@/components/ui/CookieBanner'
import './globals.css'

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
        <CookieBanner />
        <Analytics />
        <SpeedInsights />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-75NZQG8VB3" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-75NZQG8VB3');
        `}</Script>
      </body>
    </html>
  )
}
