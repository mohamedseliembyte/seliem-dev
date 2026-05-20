'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, MapPin, Phone, Clock } from 'lucide-react'
import type { Demo } from '@/types'
import { BarbershopBooking, RestaurantBooking, RequestForm } from './BookingFlow'

interface DemoPageProps {
  demo: Demo
}

function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          fill={i <= rating ? color : 'transparent'}
          stroke={color}
        />
      ))}
    </div>
  )
}

function GalleryImage({ src, alt, fallbackColor }: { src: string; alt: string; fallbackColor: string }) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div
        className="w-full h-full rounded-xl"
        style={{ background: `${fallbackColor}22` }}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
    />
  )
}

export default function DemoPage({ demo }: DemoPageProps) {
  const p = demo.theme.primary
  const isDark = demo.theme.bg.startsWith('#0') || demo.theme.bg.startsWith('#1')

  return (
    <div style={{ background: demo.theme.bg, color: demo.theme.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ─── Business Navbar ─── */}
      <header
        className="sticky top-0 z-40 px-4 py-3"
        style={{ background: `${demo.theme.surface}ee`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${demo.theme.border}` }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-black text-lg" style={{ color: demo.theme.text }}>{demo.name.split(' ').slice(0, 2).join(' ')}</div>
          <nav className="hidden sm:flex items-center gap-6">
            {['Services', 'Gallery', 'Reviews', 'Book Now'].map((link) => (
              <a
                key={link}
                href={`#demo-${link.toLowerCase().replace(' ', '-')}`}
                className="text-xs font-medium transition-colors"
                style={{ color: link === 'Book Now' ? p : demo.theme.textMuted }}
              >
                {link}
              </a>
            ))}
          </nav>
          <a
            href="#demo-book-now"
            className="text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-90"
            style={{ background: p, color: isDark ? '#000' : '#fff' }}
          >
            Book Now
          </a>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative h-[70vh] min-h-[480px] flex items-end overflow-hidden">
        <Image
          src={demo.heroImage}
          alt={demo.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${demo.theme.bg} 0%, ${demo.theme.bg}80 40%, transparent 100%)` }}
        />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-12 w-full">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-widest"
            style={{ background: '#000000', color: p, border: `1px solid ${p}` }}
          >
            {demo.category}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-3" style={{ color: demo.theme.text }}>
            {demo.name}
          </h1>
          <p className="text-lg mb-6 max-w-xl" style={{ color: demo.theme.textMuted }}>{demo.tagline}</p>
          <a
            href="#demo-book-now"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
            style={{ background: p, color: '#000' }}
          >
            Book an Appointment
          </a>
        </div>
      </section>


      {/* ─── Info Bar ─── */}
      <div style={{ background: demo.theme.surface, borderBottom: `1px solid ${demo.theme.border}` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" style={{ color: p }} />
              <span className="text-sm" style={{ color: demo.theme.textMuted }}>{demo.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 shrink-0" style={{ color: p }} />
              <span className="text-sm" style={{ color: demo.theme.textMuted }}>{demo.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" style={{ color: p }} />
              <span className="text-sm" style={{ color: demo.theme.textMuted }}>{demo.hours}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── About ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: p }}>About Us</p>
          <p className="text-lg leading-relaxed" style={{ color: demo.theme.textMuted }}>{demo.about}</p>
        </div>
      </section>

      {/* ─── Services ─── */}
      <section id="demo-services" style={{ background: demo.theme.surface }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: p }}>Services</p>
          <h2 className="text-3xl font-black mb-10" style={{ color: demo.theme.text }}>What We Offer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {demo.services.map((service) => (
              <div
                key={service.name}
                className="p-5 rounded-xl"
                style={{ background: demo.theme.bg, border: `1px solid ${demo.theme.border}` }}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm" style={{ color: demo.theme.text }}>{service.name}</h3>
                  {service.price && (
                    <span className="text-sm font-bold ml-2 shrink-0" style={{ color: p }}>{service.price}</span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: demo.theme.textMuted }}>{service.description}</p>
                {service.duration && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" style={{ color: p }} />
                    <span className="text-xs" style={{ color: demo.theme.textMuted }}>{service.duration}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Gallery ─── */}
      <section id="demo-gallery">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: p }}>Gallery</p>
          <h2 className="text-3xl font-black mb-10" style={{ color: demo.theme.text }}>Our Work</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {demo.galleryImages.map((img, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ aspectRatio: '4/3' }}
              >
                <GalleryImage
                  src={img}
                  alt={`Gallery ${i + 1}`}
                  fallbackColor={p}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="demo-reviews" style={{ background: demo.theme.surface }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: p }}>Reviews</p>
          <h2 className="text-3xl font-black mb-10" style={{ color: demo.theme.text }}>What Clients Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {demo.testimonials.map((t, i) => (
              <div
                key={i}
                className="p-6 rounded-xl"
                style={{ background: demo.theme.bg, border: `1px solid ${demo.theme.border}` }}
              >
                <StarRating rating={t.rating} color={p} />
                <p className="mt-3 mb-4 text-sm leading-relaxed" style={{ color: demo.theme.textMuted }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div>
                  <div className="font-semibold text-sm" style={{ color: demo.theme.text }}>{t.name}</div>
                  {t.role && <div className="text-xs mt-0.5" style={{ color: demo.theme.textMuted }}>{t.role}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Booking Section ─── */}
      <section id="demo-book-now">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: p }}>
              {demo.bookingType === 'restaurant' ? 'Reservations' : 'Book an Appointment'}
            </p>
            <h2 className="text-3xl font-black mb-3" style={{ color: demo.theme.text }}>
              {demo.bookingType === 'restaurant' ? 'Reserve Your Table' : 'Schedule Your Visit'}
            </h2>
            <p className="text-sm" style={{ color: demo.theme.textMuted }}>
              {demo.bookingType === 'request'
                ? 'Fill out the form below and we\'ll confirm within 24 hours.'
                : 'Select your preferences below to book instantly.'}
            </p>
          </div>

          {demo.bookingType === 'barbershop' && <BarbershopBooking demo={demo} />}
          {demo.bookingType === 'restaurant' && <RestaurantBooking demo={demo} />}
          {demo.bookingType === 'request' && <RequestForm demo={demo} />}
        </div>
      </section>

      {/* ─── Disclaimer ─── */}
      <div
        className="py-3 px-4 text-center"
        style={{ background: demo.theme.surface, borderTop: `1px solid ${demo.theme.border}` }}
      >
        <p className="text-[11px] max-w-2xl mx-auto leading-relaxed" style={{ color: demo.theme.textMuted, opacity: 0.55 }}>
          This is a demo website created by Seliem.dev to showcase design capabilities. It is not a real business and is shown for demonstration purposes only.
        </p>
      </div>

      {/* ─── Demo Footer ─── */}
      <footer
        className="py-8 px-4 text-center text-xs"
        style={{ background: demo.theme.surface, borderTop: `1px solid ${demo.theme.border}`, color: demo.theme.textMuted }}
      >
        <div className="font-bold mb-1" style={{ color: demo.theme.text }}>{demo.name}</div>
        <div>{demo.address} · {demo.phone}</div>
        <div className="mt-2 opacity-40">Demo website by Seliem.dev</div>
      </footer>
    </div>
  )
}
