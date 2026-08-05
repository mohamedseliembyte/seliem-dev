import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/sections/Hero'
import Demos from '@/components/sections/Demos'
import Services from '@/components/sections/Services'
import Pricing from '@/components/sections/Pricing'
// Guarantee section removed per request (the 48-hour claim).
// Testimonials hidden until real client quotes are available — re-enable below.
// import Testimonials from '@/components/sections/Testimonials'
import HowItWorks from '@/components/sections/HowItWorks'
import Work from '@/components/sections/Work'
import QuickStart from '@/components/sections/QuickStart'
import Contact from '@/components/sections/Contact'
import Marquee from '@/components/ui/Marquee'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <ErrorBoundary>
          <Hero />
        </ErrorBoundary>
        <ErrorBoundary>
          <Marquee />
        </ErrorBoundary>
        <ErrorBoundary>
          <Demos />
        </ErrorBoundary>
        <ErrorBoundary>
          <Services />
        </ErrorBoundary>
        <ErrorBoundary>
          <Work />
        </ErrorBoundary>
        <ErrorBoundary>
          <Pricing />
        </ErrorBoundary>
        {/* Testimonials stay hidden until real client quotes exist — Work above
            shows shipped product instead, which is checkable rather than claimed. */}
        <ErrorBoundary>
          <HowItWorks />
        </ErrorBoundary>
        <ErrorBoundary>
          <QuickStart />
        </ErrorBoundary>
        <ErrorBoundary>
          <Contact />
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  )
}
