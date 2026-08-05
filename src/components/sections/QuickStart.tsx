'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'

// ── Quick-start survey ──────────────────────────────────────────────────────
// Replaces the long typed form. Almost every answer is a tap, so a prospect on
// a phone can get through it in seconds; only the contact details need typing.
// The structured answers are composed into a readable message for the email,
// so the existing /api/contact contract still gets something useful.

type Option = { value: string; label: string; hint?: string }
type Step = {
  id: string
  question: string
  sub?: string
  options: Option[]
  /** Only ask this step when the predicate passes (used for the app branch). */
  when?: (answers: Record<string, string>) => boolean
}

const STEPS: Step[] = [
  {
    id: 'projectType',
    question: 'What do you need?',
    sub: 'Pick the closest one — we can sort out the details on the call.',
    options: [
      { value: 'New website', label: 'A new website', hint: 'Starting from nothing' },
      { value: 'Website redesign', label: 'Rebuild my site', hint: 'Have one, it underperforms' },
      { value: 'App', label: 'An app', hint: 'Build one or publish to the stores' },
      { value: 'Ads & marketing', label: 'More customers', hint: 'Ads, SEO, marketing' },
      { value: 'AI & automation', label: 'AI & automation', hint: 'Answer and follow up for me' },
      { value: 'Not sure', label: "I'm not sure yet", hint: 'Help me work it out' },
    ],
  },
  {
    id: 'appDetail',
    question: 'Tell us about the app',
    when: (a) => a.projectType === 'App',
    options: [
      { value: 'Have a site, want it as an app', label: 'I have a site — make it an app' },
      { value: 'Have an app, needs publishing', label: 'I have an app — get it on the stores' },
      { value: 'Want an app built from scratch', label: 'Build one from scratch' },
      { value: 'Existing app needs updates', label: 'My app needs updates or fixes' },
    ],
  },
  {
    id: 'timeline',
    question: 'How soon?',
    options: [
      { value: 'ASAP', label: 'As soon as possible' },
      { value: 'Within a month', label: 'Within a month' },
      { value: '1–3 months', label: 'In the next few months' },
      { value: 'Just exploring', label: 'Just exploring for now' },
    ],
  },
  {
    id: 'budget',
    question: "What's your budget?",
    sub: 'A rough range is fine. It only helps us recommend the right scope.',
    options: [
      { value: 'Under $500', label: 'Under $500' },
      { value: '$500 – $1,000', label: '$500 – $1,000' },
      { value: '$1,000 – $2,500', label: '$1,000 – $2,500' },
      { value: '$2,500+', label: '$2,500+' },
      { value: 'Not sure yet', label: 'Not sure yet' },
    ],
  },
]

function visibleSteps(answers: Record<string, string>) {
  return STEPS.filter((step) => !step.when || step.when(answers))
}

export default function QuickStart() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  const [contact, setContact] = useState({ name: '', email: '', phone: '', businessName: '', note: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')

  const steps = visibleSteps(answers)
  const onContactStep = index >= steps.length
  const total = steps.length + 1
  const progress = Math.round(((onContactStep ? steps.length : index) / total) * 100)

  function choose(stepId: string, value: string) {
    // Selecting a different project type invalidates the branch answer below it.
    const next = { ...answers, [stepId]: value }
    if (stepId === 'projectType' && value !== 'App') delete next.appDetail
    setAnswers(next)
    setIndex((i) => i + 1)
  }

  function back() {
    setError('')
    setIndex((i) => Math.max(0, i - 1))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!contact.name.trim() || !contact.email.trim()) {
      setError('Name and email are needed so we can get back to you.')
      return
    }
    setStatus('sending')
    // Compose the structured answers into prose so the notification email reads
    // like a briefing rather than a set of raw field values.
    const lines = steps
      .map((step) => (answers[step.id] ? `${step.question} ${answers[step.id]}` : null))
      .filter(Boolean)
    const message = [...lines, contact.note.trim() ? `Notes: ${contact.note.trim()}` : null]
      .filter(Boolean)
      .join('\n')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contact.name,
          email: contact.email,
          phone: contact.phone || 'N/A',
          businessName: contact.businessName || 'N/A',
          businessType: answers.projectType || 'N/A',
          budget: answers.budget || 'Not sure yet',
          message: message || 'Quick-start enquiry',
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Something went wrong.')
      }
      setStatus('done')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Something went wrong. Email hello@seliem.dev instead.')
    }
  }

  if (status === 'done') {
    return (
      <section id="lead-form" className="section-padding bg-[#0a0a0a]">
        <div className="container-max max-w-2xl text-center">
          <div className="mx-auto w-14 h-14 rounded-full gold-gradient flex items-center justify-center mb-6">
            <Check className="w-7 h-7 text-black" />
          </div>
          <h2 className="text-3xl font-black mb-3">Got it — thanks, {contact.name.split(' ')[0]}.</h2>
          <p className="text-gray-400 leading-relaxed">
            Your answers are in. We&apos;ll come back to you personally, usually within a day, with a
            straight take on what would actually help — and what it would cost.
          </p>
        </div>
      </section>
    )
  }

  const step = steps[index]

  return (
    <section id="lead-form" className="section-padding bg-[#0a0a0a]">
      <div className="container-max max-w-2xl">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3">Start a project</p>
          <h2 className="text-3xl sm:text-4xl font-black text-balance">
            Tell us what you need — <span className="gold-text">it takes about 30 seconds.</span>
          </h2>
        </div>

        {/* Progress */}
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden mb-8">
          <div className="h-full gold-gradient transition-all duration-500" style={{ width: `${Math.max(progress, 6)}%` }} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-9">
          {!onContactStep ? (
            <>
              <h3 className="text-xl sm:text-2xl font-bold mb-1">{step.question}</h3>
              {step.sub && <p className="text-sm text-gray-500 mb-6">{step.sub}</p>}
              <div className={`grid gap-3 ${step.options.length > 4 ? 'sm:grid-cols-2' : ''} ${step.sub ? '' : 'mt-6'}`}>
                {step.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => choose(step.id, opt.value)}
                    className={`group text-left rounded-xl border px-5 py-4 transition-all ${
                      answers[step.id] === opt.value
                        ? 'border-[#c9a84c] bg-[#c9a84c]/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-[#c9a84c]/50 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="block font-semibold text-white group-hover:text-[#c9a84c] transition-colors">
                      {opt.label}
                    </span>
                    {opt.hint && <span className="block text-xs text-gray-500 mt-0.5">{opt.hint}</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={submit}>
              <h3 className="text-xl sm:text-2xl font-bold mb-1">Where do we send it?</h3>
              <p className="text-sm text-gray-500 mb-6">Last step — then we&apos;ll come back to you personally.</p>
              <div className="grid gap-4">
                <input
                  required
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  placeholder="Your name *"
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3.5 text-white placeholder-gray-600 focus:border-[#c9a84c] focus:outline-none"
                />
                <input
                  required
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="Email *"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3.5 text-white placeholder-gray-600 focus:border-[#c9a84c] focus:outline-none"
                />
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder="Phone (optional)"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3.5 text-white placeholder-gray-600 focus:border-[#c9a84c] focus:outline-none"
                />
                <input
                  value={contact.businessName}
                  onChange={(e) => setContact({ ...contact, businessName: e.target.value })}
                  placeholder="Business name (optional)"
                  autoComplete="organization"
                  className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3.5 text-white placeholder-gray-600 focus:border-[#c9a84c] focus:outline-none"
                />
                <textarea
                  value={contact.note}
                  onChange={(e) => setContact({ ...contact, note: e.target.value })}
                  rows={2}
                  placeholder="Anything else? (optional)"
                  className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3.5 text-white placeholder-gray-600 focus:border-[#c9a84c] focus:outline-none resize-none"
                />
              </div>
              {error && <p className="mt-4 text-sm text-[#ff9999]" role="alert">{error}</p>}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/20 transition-all disabled:opacity-60"
              >
                {status === 'sending' ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <>Send it <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="mt-3 text-center text-xs text-gray-600">
                No spam, no list. We only use this to reply about your project.
              </p>
            </form>
          )}

          {index > 0 && (
            <button type="button" onClick={back} className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#c9a84c] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
        </div>

        {/* Chosen answers stay visible so the flow feels like progress, not a quiz. */}
        {Object.keys(answers).length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {steps.map((s) =>
              answers[s.id] ? (
                <span key={s.id} className="rounded-full border border-[#c9a84c]/25 bg-[#c9a84c]/[0.08] px-3 py-1 text-xs text-[#e0bd70]">
                  {answers[s.id]}
                </span>
              ) : null,
            )}
          </div>
        )}
      </div>
    </section>
  )
}
