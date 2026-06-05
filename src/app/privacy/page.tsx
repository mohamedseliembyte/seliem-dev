import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Seliem.dev',
  description: 'How Seliem.dev collects, uses, and protects your personal information.',
  alternates: { canonical: 'https://seliem.dev/privacy' },
}

const LAST_UPDATED = 'June 5, 2026'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-300">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link href="/" className="text-sm text-[#c9a84c] hover:text-[#f5d485]">← Back to Seliem.dev</Link>

        <h1 className="mt-8 text-3xl font-black gold-text">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

        <div className="prose-legal mt-10 space-y-8 text-[15px] leading-relaxed">
          <section>
            <p>
              This Privacy Policy explains how Seliem.dev (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
              collects, uses, and protects information when you visit{' '}
              <span className="text-gray-100">seliem.dev</span>, use our chat assistant, or contact us. By using our
              website, you agree to the practices described here.
            </p>
          </section>

          <Section title="1. Information We Collect">
            <p>We collect the following types of information:</p>
            <ul>
              <li>
                <strong className="text-gray-100">Information you provide.</strong> When you submit our contact form or
                chat with our AI assistant, we may collect your name, email address, phone number, business name,
                project details, budget range, and any other information you choose to share.
              </li>
              <li>
                <strong className="text-gray-100">Account / sign-in information.</strong> If you sign in with Google, we
                receive your name, email address, and profile picture from Google to identify you. We never receive your
                Google password.
              </li>
              <li>
                <strong className="text-gray-100">Chat messages.</strong> Messages you exchange with our AI assistant are
                stored so we can follow up on your inquiry and improve our service.
              </li>
              <li>
                <strong className="text-gray-100">Automatically collected data.</strong> Like most websites, we collect
                basic analytics such as pages visited, device/browser type, and approximate location via cookies and
                similar technologies.
              </li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul>
              <li>To respond to your inquiries and follow up about your project.</li>
              <li>To provide, operate, and improve our services and website.</li>
              <li>To communicate with you about quotes, projects, and support.</li>
              <li>To understand how visitors use our site (analytics).</li>
              <li>To prevent abuse, spam, and fraud.</li>
            </ul>
            <p>We do not sell your personal information.</p>
          </Section>

          <Section title="3. AI Chat Assistant">
            <p>
              Our website includes an AI-powered chat assistant. Messages you send are processed by a third-party AI
              provider (Groq) to generate responses, and are stored in our database so we can follow up with you. Please
              avoid sharing sensitive personal information (such as passwords, financial account numbers, or government
              IDs) in the chat.
            </p>
          </Section>

          <Section title="4. Cookies & Analytics">
            <p>
              We use cookies and similar technologies to analyze traffic and improve your experience. You can accept or
              decline non-essential cookies via the banner shown on your first visit, and you can control cookies through
              your browser settings. We use Google Analytics and Vercel Analytics to understand site usage.
            </p>
          </Section>

          <Section title="5. How We Share Information">
            <p>
              We share information only with trusted service providers who help us operate our website and services, and
              only as needed to perform their functions:
            </p>
            <ul>
              <li><strong className="text-gray-100">Supabase</strong> — database &amp; authentication</li>
              <li><strong className="text-gray-100">Resend</strong> — sending email</li>
              <li><strong className="text-gray-100">Groq</strong> — AI chat processing</li>
              <li><strong className="text-gray-100">Telegram</strong> — internal lead notifications</li>
              <li><strong className="text-gray-100">Google</strong> — sign-in &amp; analytics</li>
              <li><strong className="text-gray-100">Vercel</strong> — website hosting &amp; analytics</li>
              <li><strong className="text-gray-100">Cloudflare</strong> — domain &amp; email routing</li>
            </ul>
            <p>
              We may also disclose information if required by law or to protect our rights, safety, or property.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We keep your information for as long as needed to respond to your inquiry, provide our services, and comply
              with legal obligations. You may request deletion of your data at any time (see &ldquo;Your Rights&rdquo;).
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>
              Depending on your location, you may have the right to access, correct, or delete your personal information,
              or to object to or restrict its processing. To exercise any of these rights, email us at{' '}
              <a href="mailto:hello@seliem.dev" className="text-[#c9a84c] hover:text-[#f5d485]">hello@seliem.dev</a>.
            </p>
          </Section>

          <Section title="8. Data Security">
            <p>
              We use reasonable technical and organizational measures to protect your information. However, no method of
              transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              Our website is not directed to children under 13, and we do not knowingly collect personal information from
              them. If you believe a child has provided us information, please contact us and we will delete it.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date above reflects the
              latest version. Continued use of our website after changes means you accept the updated policy.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              Questions about this policy or your data? Email us at{' '}
              <a href="mailto:hello@seliem.dev" className="text-[#c9a84c] hover:text-[#f5d485]">hello@seliem.dev</a>.
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t border-white/5 pt-8">
          <Link href="/terms" className="text-sm text-[#c9a84c] hover:text-[#f5d485]">View our Terms of Service →</Link>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-gray-100">{title}</h2>
      <div className="space-y-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </section>
  )
}
