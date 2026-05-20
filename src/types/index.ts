export interface TimeSlot {
  time: string
  available: boolean
}

export interface DemoService {
  name: string
  price?: string
  duration?: string
  description: string
  icon?: string
}

export interface DemoStaff {
  id: string
  name: string
  role: string
  initials: string
}

export interface DemoTestimonial {
  name: string
  text: string
  rating: number
  role?: string
}

export type BookingType = 'barbershop' | 'restaurant' | 'request'

export interface DemoTheme {
  primary: string
  primaryLight: string
  bg: string
  surface: string
  text: string
  textMuted: string
  border: string
}

export interface Demo {
  id: string
  slug: string
  name: string
  category: string
  tagline: string
  cardDescription: string
  about: string
  cardImage: string
  heroImage: string
  galleryImages: string[]
  services: DemoService[]
  staff?: DemoStaff[]
  testimonials: DemoTestimonial[]
  bookingType: BookingType
  theme: DemoTheme
  address: string
  phone: string
  hours: string
  seatingOptions?: string[]
}

export interface ContactFormData {
  name: string
  businessName: string
  email: string
  phone: string
  businessType: string
  budget: string
  message: string
  goals?: string
  website?: string       // honeypot — hidden from humans
  privacyPolicy: boolean // consent checkbox
}

export type FormStatus = 'idle' | 'loading' | 'success' | 'error'
