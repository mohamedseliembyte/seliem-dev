'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check, CalendarIcon, Clock, Users } from 'lucide-react'
import type { Demo, DemoService, DemoStaff, TimeSlot } from '@/types'
import {
  generateTimeSlots,
  generateRestaurantSlots,
  getDaysInMonth,
  getFirstDayOfMonth,
  MONTHS,
  DAYS,
} from '@/lib/utils'

interface BookingFlowProps {
  demo: Demo
}

// ─── Barbershop Flow ───────────────────────────────────────────────────────────

export function BarbershopBooking({ demo }: BookingFlowProps) {
  const [step, setStep] = useState(0)
  const [service, setService] = useState<DemoService | null>(null)
  const [staff, setStaff] = useState<DemoStaff | null>(null)
  const [date, setDate] = useState<number | null>(null)
  const [slot, setSlot] = useState<TimeSlot | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear] = useState(new Date().getFullYear())

  const today = new Date().getDate()
  const todayMonth = new Date().getMonth()
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const slots = generateTimeSlots()
  const p = demo.theme.primary

  const stepTitles = ['Choose a Service', 'Choose a Barber', 'Select a Date', 'Pick a Time']

  if (confirmed) {
    return (
      <div className="text-center py-10 px-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: `${p}20`, border: `2px solid ${p}40` }}
        >
          <Check className="w-8 h-8" style={{ color: p }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: demo.theme.text }}>Appointment Booked!</h3>
        <p className="text-sm mb-5" style={{ color: demo.theme.textMuted }}>
          {service?.name} with {staff?.name} on {MONTHS[calMonth]} {date} at {slot?.time}
        </p>
        <p className="text-xs" style={{ color: demo.theme.textMuted }}>
          A confirmation will be sent to your phone. See you soon!
        </p>
        <button
          onClick={() => { setConfirmed(false); setStep(0); setService(null); setStaff(null); setDate(null); setSlot(null) }}
          className="mt-6 text-sm underline underline-offset-2 transition-colors"
          style={{ color: p }}
        >
          Book another appointment
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: demo.theme.surface, border: `1px solid ${demo.theme.border}` }}>
      {/* Step indicator */}
      <div className="flex" style={{ borderBottom: `1px solid ${demo.theme.border}` }}>
        {stepTitles.map((title, i) => (
          <div
            key={i}
            className="flex-1 py-3 text-center text-xs font-semibold transition-colors"
            style={{
              color: i === step ? p : i < step ? `${p}80` : demo.theme.textMuted,
              borderBottom: i === step ? `2px solid ${p}` : '2px solid transparent',
              background: i === step ? `${p}08` : 'transparent',
            }}
          >
            <span className="hidden sm:inline">{title}</span>
            <span className="sm:hidden">{i + 1}</span>
          </div>
        ))}
      </div>

      <div className="p-5">
        {/* Step 0 — Service */}
        {step === 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold mb-4" style={{ color: demo.theme.text }}>Select a Service</h4>
            {demo.services.map((svc) => (
              <button
                key={svc.name}
                onClick={() => setService(svc)}
                className="w-full text-left p-4 rounded-lg border transition-all duration-200"
                style={{
                  background: service?.name === svc.name ? `${p}12` : `${demo.theme.bg}`,
                  borderColor: service?.name === svc.name ? p : demo.theme.border,
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: demo.theme.text }}>{svc.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: demo.theme.textMuted }}>{svc.description}</div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="font-bold text-sm" style={{ color: p }}>{svc.price}</div>
                    {svc.duration && <div className="text-xs" style={{ color: demo.theme.textMuted }}>{svc.duration}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 1 — Staff */}
        {step === 1 && (
          <div>
            <h4 className="font-semibold mb-4" style={{ color: demo.theme.text }}>Choose Your Barber</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {demo.staff?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStaff(s)}
                  className="p-4 rounded-lg border text-center transition-all duration-200"
                  style={{
                    background: staff?.id === s.id ? `${p}12` : demo.theme.bg,
                    borderColor: staff?.id === s.id ? p : demo.theme.border,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2"
                    style={{ background: `${p}20`, color: p }}
                  >
                    {s.initials}
                  </div>
                  <div className="font-semibold text-sm" style={{ color: demo.theme.text }}>{s.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: demo.theme.textMuted }}>{s.role}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Date */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold" style={{ color: demo.theme.text }}>Select a Date</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalMonth((m) => Math.max(m - 1, todayMonth))}
                  className="p-1 rounded hover:opacity-70 transition-opacity"
                  style={{ color: demo.theme.textMuted }}
                  disabled={calMonth === todayMonth}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium" style={{ color: demo.theme.text }}>
                  {MONTHS[calMonth]} {calYear}
                </span>
                <button
                  onClick={() => setCalMonth((m) => Math.min(m + 1, 11))}
                  className="p-1 rounded hover:opacity-70 transition-opacity"
                  style={{ color: demo.theme.textMuted }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: demo.theme.textMuted }}>
                  {d.slice(0, 1)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const isPast = calMonth === todayMonth && dayNum < today
                const isSelected = date === dayNum
                const isSunday = (firstDay + i) % 7 === 0
                return (
                  <button
                    key={dayNum}
                    disabled={isPast || isSunday}
                    onClick={() => setDate(dayNum)}
                    className="h-8 w-full rounded-md text-xs font-medium transition-all duration-150"
                    style={{
                      background: isSelected ? p : 'transparent',
                      color: isSelected ? '#000' : isPast || isSunday ? `${demo.theme.textMuted}40` : demo.theme.text,
                      cursor: isPast || isSunday ? 'not-allowed' : 'pointer',
                      border: `1px solid ${isSelected ? p : 'transparent'}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isPast && !isSunday) {
                        ;(e.target as HTMLButtonElement).style.background = `${p}20`
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        ;(e.target as HTMLButtonElement).style.background = 'transparent'
                      }
                    }}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3 — Time */}
        {step === 3 && (
          <div>
            <h4 className="font-semibold mb-4" style={{ color: demo.theme.text }}>
              Available Times — {MONTHS[calMonth]} {date}
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((s) => (
                <button
                  key={s.time}
                  disabled={!s.available}
                  onClick={() => setSlot(s)}
                  className="py-2.5 px-2 rounded-lg text-xs font-medium text-center transition-all duration-150"
                  style={{
                    background: slot?.time === s.time ? p : !s.available ? `${demo.theme.border}50` : `${demo.theme.bg}`,
                    color: slot?.time === s.time ? '#000' : !s.available ? `${demo.theme.textMuted}50` : demo.theme.textMuted,
                    border: `1px solid ${slot?.time === s.time ? p : demo.theme.border}`,
                    cursor: !s.available ? 'not-allowed' : 'pointer',
                    textDecoration: !s.available ? 'line-through' : 'none',
                  }}
                >
                  {s.time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${demo.theme.border}` }}>
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
            style={{ color: demo.theme.textMuted, border: `1px solid ${demo.theme.border}` }}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && !service) ||
                (step === 1 && !staff) ||
                (step === 2 && !date)
              }
              className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
              style={{ background: p, color: '#000' }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setConfirmed(true)}
              disabled={!slot}
              className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
              style={{ background: p, color: '#000' }}
            >
              <Check className="w-4 h-4" /> Book Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Restaurant Flow ───────────────────────────────────────────────────────────

export function RestaurantBooking({ demo }: BookingFlowProps) {
  const [step, setStep] = useState(0)
  const [partySize, setPartySize] = useState<string | null>(null)
  const [date, setDate] = useState<number | null>(null)
  const [seating, setSeating] = useState<string | null>(null)
  const [slot, setSlot] = useState<TimeSlot | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [calMonth] = useState(new Date().getMonth())
  const [calYear] = useState(new Date().getFullYear())

  const today = new Date().getDate()
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const slots = generateRestaurantSlots()
  const p = demo.theme.primary

  const partySizes = ['1–2', '3–4', '5–6', '7–8', 'Private Dining']
  const seatingOptions = demo.seatingOptions ?? ['Indoor', 'Outdoor', 'Bar']
  const stepTitles = ['Party Size', 'Date', 'Seating', 'Time']

  if (confirmed) {
    return (
      <div className="text-center py-10 px-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: `${p}20`, border: `2px solid ${p}40` }}
        >
          <Check className="w-8 h-8" style={{ color: p }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: demo.theme.text }}>Reservation Confirmed!</h3>
        <p className="text-sm mb-5" style={{ color: demo.theme.textMuted }}>
          Party of {partySize} · {MONTHS[calMonth]} {date} · {seating} · {slot?.time}
        </p>
        <p className="text-xs" style={{ color: demo.theme.textMuted }}>
          A confirmation has been sent. We look forward to your visit.
        </p>
        <button
          onClick={() => { setConfirmed(false); setStep(0); setPartySize(null); setDate(null); setSeating(null); setSlot(null) }}
          className="mt-6 text-sm underline underline-offset-2"
          style={{ color: p }}
        >
          Make another reservation
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: demo.theme.surface, border: `1px solid ${demo.theme.border}` }}>
      {/* Step tabs */}
      <div className="flex" style={{ borderBottom: `1px solid ${demo.theme.border}` }}>
        {stepTitles.map((title, i) => (
          <div
            key={i}
            className="flex-1 py-3 text-center text-xs font-semibold"
            style={{
              color: i === step ? p : i < step ? `${p}80` : demo.theme.textMuted,
              borderBottom: i === step ? `2px solid ${p}` : '2px solid transparent',
              background: i === step ? `${p}08` : 'transparent',
            }}
          >
            <span className="hidden sm:inline">{title}</span>
            <span className="sm:hidden">{i + 1}</span>
          </div>
        ))}
      </div>

      <div className="p-5">
        {/* Step 0 — Party size */}
        {step === 0 && (
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: demo.theme.text }}>
              <Users className="w-4 h-4" style={{ color: p }} /> How many guests?
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {partySizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setPartySize(size)}
                  className="py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: partySize === size ? p : demo.theme.bg,
                    color: partySize === size ? '#000' : demo.theme.textMuted,
                    border: `1px solid ${partySize === size ? p : demo.theme.border}`,
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Date */}
        {step === 1 && (
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: demo.theme.text }}>
              <CalendarIcon className="w-4 h-4" style={{ color: p }} /> Select a Date
            </h4>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold" style={{ color: demo.theme.textMuted }}>
                  {d.slice(0, 1)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const isPast = dayNum < today
                const isSelected = date === dayNum
                return (
                  <button
                    key={dayNum}
                    disabled={isPast}
                    onClick={() => setDate(dayNum)}
                    className="h-8 w-full rounded-md text-xs font-medium transition-all duration-150"
                    style={{
                      background: isSelected ? p : 'transparent',
                      color: isSelected ? '#000' : isPast ? `${demo.theme.textMuted}40` : demo.theme.text,
                      cursor: isPast ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2 — Seating */}
        {step === 2 && (
          <div>
            <h4 className="font-semibold mb-4" style={{ color: demo.theme.text }}>Seating Preference</h4>
            <div className="grid grid-cols-2 gap-3">
              {seatingOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSeating(opt)}
                  className="py-4 px-3 rounded-lg text-sm font-medium text-center transition-all duration-200"
                  style={{
                    background: seating === opt ? p : demo.theme.bg,
                    color: seating === opt ? '#000' : demo.theme.textMuted,
                    border: `1px solid ${seating === opt ? p : demo.theme.border}`,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Time */}
        {step === 3 && (
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: demo.theme.text }}>
              <Clock className="w-4 h-4" style={{ color: p }} /> Available Times
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((s) => (
                <button
                  key={s.time}
                  disabled={!s.available}
                  onClick={() => setSlot(s)}
                  className="py-2.5 px-2 rounded-lg text-xs font-medium text-center transition-all duration-150"
                  style={{
                    background: slot?.time === s.time ? p : !s.available ? `${demo.theme.border}50` : demo.theme.bg,
                    color: slot?.time === s.time ? '#000' : !s.available ? `${demo.theme.textMuted}50` : demo.theme.textMuted,
                    border: `1px solid ${slot?.time === s.time ? p : demo.theme.border}`,
                    cursor: !s.available ? 'not-allowed' : 'pointer',
                    textDecoration: !s.available ? 'line-through' : 'none',
                  }}
                >
                  {s.time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${demo.theme.border}` }}>
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
            style={{ color: demo.theme.textMuted, border: `1px solid ${demo.theme.border}` }}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && !partySize) ||
                (step === 1 && !date) ||
                (step === 2 && !seating)
              }
              className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
              style={{ background: p, color: '#000' }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setConfirmed(true)}
              disabled={!slot}
              className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
              style={{ background: p, color: '#000' }}
            >
              <Check className="w-4 h-4" /> Reserve Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Request Form ──────────────────────────────────────────────────────────────

export function RequestForm({ demo }: BookingFlowProps) {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', message: '' })
  const p = demo.theme.primary
  const isDark = demo.theme.bg.startsWith('#0') || demo.theme.bg.startsWith('#1')

  const inputStyle = {
    background: isDark ? `${demo.theme.bg}` : '#f8fafc',
    border: `1px solid ${demo.theme.border}`,
    color: demo.theme.text,
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="text-center py-10 px-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: `${p}20`, border: `2px solid ${p}40` }}
        >
          <Check className="w-7 h-7" style={{ color: p }} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: demo.theme.text }}>Request Received!</h3>
        <p className="text-sm" style={{ color: demo.theme.textMuted }}>
          We'll reach out within 24 hours to confirm your appointment.
        </p>
        <button
          onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', date: '', message: '' }) }}
          className="mt-5 text-sm underline underline-offset-2"
          style={{ color: p }}
        >
          Submit another request
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: demo.theme.textMuted }}>Your Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: demo.theme.textMuted }}>Email *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@email.com"
            style={inputStyle}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: demo.theme.textMuted }}>Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(555) 000-0000"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: demo.theme.textMuted }}>Preferred Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: demo.theme.textMuted }}>Message / Notes</label>
        <textarea
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Tell us about your project or what you're looking for..."
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>
      <button
        type="submit"
        className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.01]"
        style={{ background: p, color: p === '#3b82f6' || p === '#22c55e' || p === '#06b6d4' ? '#fff' : '#000' }}
      >
        Send Request
      </button>
    </form>
  )
}
