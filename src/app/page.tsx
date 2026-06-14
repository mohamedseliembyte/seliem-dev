import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/sections/Hero'
import Demos from '@/components/sections/Demos'
import Services from '@/components/sections/Services'
// Pricing section removed per request.
// Guarantee section removed per request (the 48-hour claim).
// Testimonials hidden until real client quotes are available — re-enable below.
// import Testimonials from '@/components/sections/Testimonials'
import HowItWorks from '@/components/sections/HowItWorks'
import LeadForm from '@/components/sections/LeadForm'
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
        {/* Pricing removed per request. Testimonials hidden until real client quotes exist. */}
        <ErrorBoundary>
          <HowItWorks />
        </ErrorBoundary>
        <ErrorBoundary>
          <LeadForm />
        </ErrorBoundary>
        <ErrorBoundary>
          <Contact />
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  )
}
