import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { notifyLead } from '@/lib/telegram'
import { saveLead } from '@/lib/supabase'

// Routing — all destinations come from env vars, nothing hardcoded
const FROM_ADDRESS = process.env.FROM_EMAIL        ?? 'onboarding@resend.dev'
const CONTACT_TO   = process.env.CONTACT_TO_EMAIL  ?? 'mohamed.seliem.dev@gmail.com'
const SUPPORT_TO   = process.env.SUPPORT_EMAIL     ?? 'support@seliem.dev'

// Simple in-memory rate limiter: max 3 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return false
  }
  if (entry.count >= 3) return true
  entry.count++
  return false
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Honeypot — bots fill the hidden "website" field; humans leave it empty
  if (body.website) {
    return NextResponse.json({ success: true })
  }

  const isSupport = body.type === 'support'

  // ── Shared validation ──────────────────────────────────────────────────────
  const { name, email, message } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }
  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return NextResponse.json({ error: 'Please include a message.' }, { status: 400 })
  }

  // ── Lead-form-only validation ──────────────────────────────────────────────
  const { budget } = body
  if (!isSupport && (!budget || typeof budget !== 'string')) {
    return NextResponse.json({ error: 'Please select a budget range.' }, { status: 400 })
  }

  const businessName = body.businessName ?? 'N/A'
  const phone        = body.phone        ?? 'N/A'
  const businessType = body.businessType ?? 'N/A'
  const goals        = body.goals        ?? ''

  // ── Route destination ──────────────────────────────────────────────────────
  const toAddress = isSupport ? SUPPORT_TO : CONTACT_TO
  const subject   = isSupport
    ? `Support Request from ${esc(name)}`
    : `New Website Inquiry from ${esc(name)}`

  const notifyHtml = isSupport
    ? `
      <div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#c9a84c;margin-bottom:20px">Support Request</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px 0;color:#666;width:140px"><strong>Name</strong></td><td style="padding:8px 0">${esc(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#666"><strong>Email</strong></td><td style="padding:8px 0">${esc(email)}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#f9f9f9;border-radius:8px">
          <strong>Message:</strong>
          <p style="margin:8px 0 0;white-space:pre-wrap">${esc(message)}</p>
        </div>
      </div>
    `
    : `
      <div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#c9a84c;margin-bottom:20px">New Website Inquiry</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px 0;color:#666;width:140px"><strong>Name</strong></td><td style="padding:8px 0">${esc(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#666"><strong>Business Name</strong></td><td style="padding:8px 0">${esc(businessName)}</td></tr>
          <tr><td style="padding:8px 0;color:#666"><strong>Email</strong></td><td style="padding:8px 0">${esc(email)}</td></tr>
          <tr><td style="padding:8px 0;color:#666"><strong>Phone</strong></td><td style="padding:8px 0">${esc(phone)}</td></tr>
          <tr><td style="padding:8px 0;color:#666"><strong>Business Type</strong></td><td style="padding:8px 0">${esc(businessType)}</td></tr>
          <tr><td style="padding:8px 0;color:#666"><strong>Budget</strong></td><td style="padding:8px 0">${esc(budget)}</td></tr>
          ${goals ? `<tr><td style="padding:8px 0;color:#666"><strong>Goals</strong></td><td style="padding:8px 0">${esc(goals)}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;padding:16px;background:#f9f9f9;border-radius:8px">
          <strong>Message:</strong>
          <p style="margin:8px 0 0;white-space:pre-wrap">${esc(message)}</p>
        </div>
      </div>
    `

  try {
    // Notify the right inbox
    await resend.emails.send({
      from:     FROM_ADDRESS,
      to:       toAddress,
      reply_to: email as string,
      subject,
      html: notifyHtml,
    })

    // Auto-confirm to the submitter
    await resend.emails.send({
      from:    FROM_ADDRESS,
      to:      esc(email) as string,
      subject: `Got your message, ${esc(name).split(' ')[0]}! 🙌`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;color:#111">
          <h2 style="color:#c9a84c;margin-bottom:16px">Thanks — I'm on it!</h2>
          <p style="margin:0 0 12px">Hi ${esc(name).split(' ')[0]},</p>
          <p style="margin:0 0 12px">I've got your message and I'll <strong>text or email you shortly</strong> to talk through your project — usually within a few hours.</p>
          <p style="margin:0 0 24px">While you wait, take a look at the live demos at <a href="https://seliem.dev/#demos" style="color:#c9a84c">seliem.dev</a>.</p>
          <p style="margin:0;color:#888;font-size:13px">— Mohamed, Seliem.dev</p>
        </div>
      `,
    })

    // Persist the lead to the database (non-blocking — never breaks the form)
    await saveLead({
      type: isSupport ? 'support' : 'contact',
      name: String(name),
      email: String(email),
      message: String(message),
      phone: String(phone),
      business_name: String(businessName),
      business_type: String(businessType),
      budget: budget ? String(budget) : null,
      goals: goals ? String(goals) : null,
    })

    // Ping Telegram with the lead (non-blocking — never breaks the form)
    await notifyLead({
      type: isSupport ? 'support' : 'contact',
      name: String(name),
      email: String(email),
      message: String(message),
      businessName: String(businessName),
      phone: String(phone),
      businessType: String(businessType),
      budget: budget ? String(budget) : undefined,
      goals: goals ? String(goals) : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[contact] Resend error:', message)
    return NextResponse.json(
      { error: 'Failed to send email.' },
      { status: 500 },
    )
  }
}

export async function GET()    { return NextResponse.json({ error: 'Not found' }, { status: 404 }) }
export async function PUT()    { return NextResponse.json({ error: 'Not found' }, { status: 404 }) }
export async function DELETE() { return NextResponse.json({ error: 'Not found' }, { status: 404 }) }
