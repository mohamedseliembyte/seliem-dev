import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Seliem.dev',
  description: 'The terms and conditions for using Seliem.dev and our services.',
  alternates: { canonical: 'https://seliem.dev/terms' },
}

const LAST_UPDATED = 'June 5, 2026'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-300">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link href="/" className="text-sm text-[#c9a84c] hover:text-[#f5d485]">← Back to Seliem.dev</Link>

        <h1 className="mt-8 text-3xl font-black gold-text">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using seliem.dev (the &ldquo;Site&rdquo;) and our services, you agree to be bound by these
              Terms of Service. If you do not agree, please do not use the Site or our services.
            </p>
          </Section>

          <Section title="2. Our Services">
            <p>
              Seliem.dev provides web design, AI automation, domain &amp; email setup, and related digital services. The
              specific scope, deliverables, and pricing for any project are agreed separately in writing before work
              begins.
            </p>
          </Section>

          <Section title="3. Quotes & Estimates">
            <p>
              Any prices, ranges, or timelines mentioned on the Site or by our AI chat assistant are estimates for
              general guidance only and are <strong className="text-gray-100">not binding offers</strong>. Final pricing,
              scope, and timelines are confirmed in a written agreement before a project starts.
            </p>
          </Section>

          <Section title="4. Client Responsibilities">
            <ul>
              <li>Provide accurate information and timely feedback and materials.</li>
              <li>Ensure you have the rights to any content (text, images, logos) you provide to us.</li>
              <li>Make payments according to the agreed schedule.</li>
            </ul>
          </Section>

          <Section title="5. Payments">
            <p>
              Payment terms (including any deposits, milestones, or recurring fees) are set out in your project
              agreement. Unless otherwise stated, deposits are non-refundable once work has begun. Recurring services
              (such as maintenance) continue until cancelled per the agreement.
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              Upon full payment, ownership of the final deliverables transfers to you, except for third-party components,
              open-source software, and our own pre-existing tools or templates, which remain owned by their respective
              owners or by us. We may display non-confidential work in our portfolio unless you request otherwise.
            </p>
          </Section>

          <Section title="7. Third-Party Services">
            <p>
              Our services may rely on third-party platforms (e.g. hosting, domains, email, analytics, payment
              processors). Your use of those services may be subject to their own terms, and we are not responsible for
              their availability or actions.
            </p>
          </Section>

          <Section title="8. AI Assistant">
            <p>
              Our AI chat assistant provides general information about our services. It may occasionally be inaccurate or
              incomplete, has no authority to make binding commitments on our behalf, and should not be relied upon as
              professional advice.
            </p>
          </Section>

          <Section title="9. Disclaimers">
            <p>
              The Site and our services are provided &ldquo;as is&rdquo; without warranties of any kind, express or
              implied, to the fullest extent permitted by law. We do not guarantee that the Site will be uninterrupted,
              error-free, or secure.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Seliem.dev shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the Site or our services. Our total liability for any claim
              shall not exceed the amount you paid us for the service giving rise to the claim.
            </p>
          </Section>

          <Section title="11. Termination">
            <p>
              We may suspend or terminate access to the Site or our services at our discretion, including for misuse or
              violation of these Terms. Project-specific termination terms are governed by your project agreement.
            </p>
          </Section>

          <Section title="12. Governing Law">
            <p>
              These Terms are governed by the laws of the jurisdiction in which Seliem.dev operates, without regard to
              conflict-of-law principles. Any disputes shall be resolved in the courts of that jurisdiction.
            </p>
          </Section>

          <Section title="13. Changes to These Terms">
            <p>
              We may update these Terms from time to time. The &ldquo;Last updated&rdquo; date above reflects the latest
              version. Continued use of the Site after changes means you accept the updated Terms.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              Questions about these Terms? Email us at{' '}
              <a href="mailto:hello@seliem.dev" className="text-[#c9a84c] hover:text-[#f5d485] underline underline-offset-2">hello@seliem.dev</a>.
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t border-white/5 pt-8">
          <Link href="/privacy" className="text-sm text-[#c9a84c] hover:text-[#f5d485]">View our Privacy Policy →</Link>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-gray-100">{title}</h2>
      <div className="space-y-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div>
    </section>
  )
}
