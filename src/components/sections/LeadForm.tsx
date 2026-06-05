'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle, AlertCircle, Loader2, Send, X } from 'lucide-react'
import type { ContactFormData, FormStatus } from '@/types'

const budgetOptions = [
  '$300–$500',
  '$500–$1,000',
  '$1,000–$2,500',
  '$2,500–$5,000',
  '$5,000+',
  'Not sure yet',
]

/* ─── Privacy Policy Modal ─────────────────────────────────────────── */
function PrivacyModal({ onClose }: { onClose: () => void }) {
  // Trap focus and close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: '#111111' }}
      >
        <button
          onClick={onClose}
          aria-label="Close privacy policy"
          className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white transition-colors rounded-md"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          <h2 id="privacy-modal-title" className="text-xl font-bold text-white mb-1">
            Privacy Policy
          </h2>
          <p className="text-xs text-gray-600 mb-6">Last updated: April 2025</p>

          <div className="space-y-5 text-sm text-gray-400 leading-relaxed">
            <section>
              <h3 className="text-white font-semibold mb-2 text-sm">What data is collected</h3>
              <p>
                When you submit the contact form, we collect your name, email address, phone number
                (optional), business name (optional), business type (optional), estimated budget,
                and your message.
              </p>
            </section>

            <section>
              <h3 className="text-white font-semibold mb-2 text-sm">How it is used</h3>
              <p>
                Your information is used solely to respond to your inquiry and discuss your project.
                We do not use your data for marketing or any other purpose without your explicit
                consent.
              </p>
            </section>

            <section>
              <h3 className="text-white font-semibold mb-2 text-sm">Data sharing</h3>
              <p>Your data is never sold, rented, or shared with any third parties. Period.</p>
            </section>

            <section>
              <h3 className="text-white font-semibold mb-2 text-sm">Data requests</h3>
              <p>
                To request access to, correction of, or deletion of your data, contact us at{' '}
                <a
                  href="mailto:hello@seliem.dev"
                  className="text-[#c9a84c] hover:text-[#f5d485] underline underline-offset-2 transition-colors"
                >
                  hello@seliem.dev
                </a>
                .
              </p>
            </section>
          </div>

          <button
            onClick={onClose}
            className="mt-8 w-full py-3 rounded-lg text-sm font-semibold gold-gradient text-black hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Lead Form ─────────────────────────────────────────────────────── */
export default function LeadForm() {
  const [status,      setStatus]      = useState<FormStatus>('idle')
  const [showPrivacy, setShowPrivacy] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    defaultValues: { privacyPolicy: false },
  })

  const selectedBudget = watch('budget')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('[data-animate]').forEach((el, i) => {
              setTimeout(() => {
                ;(el as HTMLElement).style.opacity = '1'
                ;(el as HTMLElement).style.transform = 'translateY(0)'
              }, i * 80)
            })
          }
        })
      },
      { threshold: 0.1 },
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const onSubmit = async (data: ContactFormData) => {
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('success')
      reset()
    } catch {
      setStatus('error')
    }
  }

  const inputClass =
    'w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#c9a84c]/60 focus:bg-white/[0.06] transition-all duration-200'
  const errorClass = 'mt-1 text-xs text-red-400'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2'

  return (
    <>
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      <section
        ref={sectionRef}
        id="lead-form"
        aria-label="Get your website — contact form"
        className="section-padding relative overflow-hidden bg-[#0c0c0c]"
      >
        {/* Background */}
        <div className="absolute inset-0 hero-grid opacity-30" aria-hidden="true" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#c9a84c]/4 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

        <div className="container-max relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">

            {/* Left column */}
            <div className="lg:col-span-2">
              <p
                data-animate
                style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.5s ease-out, transform 0.5s ease-out' }}
                className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c] mb-3"
              >
                Get Your Website
              </p>
              <h2
                data-animate
                style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.6s ease-out 80ms, transform 0.6s ease-out 80ms' }}
                className="text-4xl sm:text-5xl font-black text-white leading-tight mb-5"
              >
                Let&apos;s build something{' '}
                <span className="gold-text">worth showing off.</span>
              </h2>
              <p
                data-animate
                style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.6s ease-out 160ms, transform 0.6s ease-out 160ms' }}
                className="text-gray-400 text-base leading-relaxed mb-8"
              >
                Tell me about your business and what you&apos;re looking for. I&apos;ll get back to you
                within 24 hours.
              </p>

              <div
                data-animate
                style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.6s ease-out 240ms, transform 0.6s ease-out 240ms' }}
                className="space-y-3"
              >
                {[
                  'Response within 24 hours',
                  'No commitment required',
                  'Free consultation included',
                  'Custom quote for your project',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] shrink-0" aria-hidden="true" />
                    <span className="text-sm text-gray-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div
              data-animate
              style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.6s ease-out 200ms, transform 0.6s ease-out 200ms' }}
              className="lg:col-span-3"
            >
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:p-8">
                {status === 'success' ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-[#c9a84c] mx-auto mb-4" aria-hidden="true" />
                    <h3 className="text-xl font-bold text-white mb-2">Message sent!</h3>
                    <p className="text-gray-400 text-sm">
                      I&apos;ll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => setStatus('idle')}
                      className="mt-6 text-sm text-[#c9a84c] hover:text-[#f5d485] transition-colors underline underline-offset-2"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-5"
                    noValidate
                    aria-label="Contact form"
                  >
                    {/* Row 1: Name + Business Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className={labelClass}>Name *</label>
                        <input
                          id="name"
                          {...register('name', { required: 'Name is required' })}
                          placeholder="John Smith"
                          className={inputClass}
                          autoComplete="name"
                        />
                        {errors.name && <p className={errorClass} role="alert">{errors.name.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="businessName" className={labelClass}>Business Name</label>
                        <input
                          id="businessName"
                          {...register('businessName')}
                          placeholder="Smith & Co."
                          className={inputClass}
                          autoComplete="organization"
                        />
                      </div>
                    </div>

                    {/* Row 2: Email + Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="email" className={labelClass}>Email *</label>
                        <input
                          id="email"
                          type="email"
                          {...register('email', {
                            required: 'Email is required',
                            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                          })}
                          placeholder="john@example.com"
                          className={inputClass}
                          autoComplete="email"
                        />
                        {errors.email && <p className={errorClass} role="alert">{errors.email.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="phone" className={labelClass}>Phone</label>
                        <input
                          id="phone"
                          type="tel"
                          {...register('phone')}
                          placeholder="(555) 000-0000"
                          className={inputClass}
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    {/* Row 3: Business Type + Budget */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="businessType" className={labelClass}>Type of Business</label>
                        <input
                          id="businessType"
                          {...register('businessType')}
                          placeholder="e.g. Restaurant, Dental, Retail..."
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="budget" className={labelClass}>Estimated Budget *</label>
                        <select
                          id="budget"
                          {...register('budget', { required: 'Please select a budget' })}
                          className={`${inputClass} cursor-pointer`}
                          defaultValue=""
                        >
                          <option value="" disabled>Select a range...</option>
                          {budgetOptions.map((opt) => (
                            <option key={opt} value={opt} className="bg-[#1a1a1a] text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                        {errors.budget && <p className={errorClass} role="alert">{errors.budget.message}</p>}
                      </div>
                    </div>

                    {/* Conditional goals field */}
                    {selectedBudget === 'Not sure yet' && (
                      <div>
                        <label htmlFor="goals" className={labelClass}>What are you looking to achieve? *</label>
                        <input
                          id="goals"
                          {...register('goals', {
                            required: selectedBudget === 'Not sure yet' ? 'Please describe your goals' : false,
                          })}
                          placeholder="e.g. More leads, better first impression, sell online..."
                          className={inputClass}
                        />
                        {errors.goals && <p className={errorClass} role="alert">{errors.goals.message}</p>}
                      </div>
                    )}

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className={labelClass}>Message *</label>
                      <textarea
                        id="message"
                        {...register('message', { required: 'Please add a message' })}
                        rows={4}
                        placeholder="Tell me about your project..."
                        className={`${inputClass} resize-none`}
                      />
                      {errors.message && <p className={errorClass} role="alert">{errors.message.message}</p>}
                    </div>

                    {/* Privacy Policy checkbox */}
                    <div>
                      <div className="flex items-start gap-3">
                        <input
                          id="privacy-policy"
                          type="checkbox"
                          {...register('privacyPolicy', {
                            required: 'Please agree to the privacy policy to continue.',
                          })}
                          className="mt-0.5 flex-none cursor-pointer"
                          style={{ accentColor: '#c9a84c', width: 16, height: 16 }}
                        />
                        <label
                          htmlFor="privacy-policy"
                          className="text-xs text-gray-400 leading-relaxed cursor-pointer"
                        >
                          I agree to the{' '}
                          <button
                            type="button"
                            onClick={() => setShowPrivacy(true)}
                            className="text-[#c9a84c] hover:text-[#f5d485] underline underline-offset-2 transition-colors"
                          >
                            Privacy Policy
                          </button>
                          {' '}and consent to being contacted about my project.
                        </label>
                      </div>
                      {errors.privacyPolicy && (
                        <p className={errorClass} role="alert">{errors.privacyPolicy.message}</p>
                      )}
                    </div>

                    {/* Error state */}
                    {status === 'error' && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20" role="alert">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-sm text-red-400">
                          Something went wrong. Please email me at{' '}
                          <a
                            href="mailto:hello@seliem.dev"
                            className="underline hover:text-red-300 transition-colors"
                          >
                            hello@seliem.dev
                          </a>
                        </p>
                      </div>
                    )}

                    {/* Honeypot — hidden from humans, bots fill it in */}
                    <input
                      type="text"
                      {...register('website')}
                      aria-hidden="true"
                      tabIndex={-1}
                      autoComplete="off"
                      style={{ display: 'none' }}
                    />

                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-lg text-base font-semibold gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none transition-all duration-200"
                    >
                      {status === 'loading' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" aria-hidden="true" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
