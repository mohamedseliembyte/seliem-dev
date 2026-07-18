'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X, Send, Sparkles, LogIn } from 'lucide-react'
import { googlePopupSignIn, exchangeGoogleToken, type GoogleUser } from '@/lib/google-auth'
import { getSupabaseBrowser } from '@/lib/supabase-client'

type Msg = { role: 'user' | 'assistant' | 'rep'; content: string }

const GREETING =
  "Hi! 👋 I'm Sage, the Seliem.dev assistant. Looking for a website, an AI automation, or both? Tell me a bit about your project and I'll help you get started."

const SESSION_KEY = 'sage_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${SESSION_MAX_AGE}; SameSite=Lax`
}

// Anonymous session id with a cookie fallback: persisted to BOTH localStorage
// and a long-lived cookie, so clearing one (e.g. localStorage) recovers the id
// from the other and the visitor's chat history survives.
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(SESSION_KEY) || readCookie(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
  try { localStorage.setItem(SESSION_KEY, id) } catch { /* storage disabled */ }
  writeCookie(SESSION_KEY, id)
  return id
}

// A signed-in user always maps to ONE persistent conversation keyed by email,
// so the bot remembers them across devices/sessions. Anonymous → browser session.
function effectiveSid(user: GoogleUser | null): string {
  if (user?.email) return `user:${user.email.toLowerCase()}`
  return getSessionId()
}

async function chatHeaders(): Promise<Record<string, string>> {
  const { data } = await getSupabaseBrowser().auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function ChatWidget() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [repActive, setRepActive] = useState(false)
  const [teaser, setTeaser] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastPollRef = useRef<string>(new Date().toISOString())
  const historyLoadedRef = useRef(false)

  useEffect(() => {
    if (isAdmin) return
    const t = setTimeout(() => setVisible(true), 1500)
    // Gentle, dismissible teaser (never auto-opens the panel)
    let teaseT: ReturnType<typeof setTimeout> | undefined
    if (typeof window !== 'undefined' && !sessionStorage.getItem('sage_teased')) {
      teaseT = setTimeout(() => setTeaser(true), 12000)
    }
    return () => { clearTimeout(t); if (teaseT) clearTimeout(teaseT) }
  }, [isAdmin])

  // Allow any part of the site to open the chat: window.dispatchEvent(new Event('open-chat'))
  useEffect(() => {
    const openChat = () => { setVisible(true); setOpen(true) }
    window.addEventListener('open-chat', openChat)
    return () => window.removeEventListener('open-chat', openChat)
  }, [])

  // Load prior conversation history when the chat opens (continue a convo).
  // Re-runs when the signed-in user changes so it loads their persistent thread.
  useEffect(() => {
    if (!open || historyLoadedRef.current) return
    historyLoadedRef.current = true
    const sid = effectiveSid(user)
    ;(async () => {
      try {
        const res = await fetch(`/api/chat/messages?session_id=${encodeURIComponent(sid)}`, {
          headers: await chatHeaders(),
        })
        const data = await res.json()
        const hist = data.messages ?? []
        if (hist.length > 0) {
          const mapped: Msg[] = hist.map((m: { role: string; content: string }) => ({
            role: m.role === 'user' ? 'user' : m.role === 'human' ? 'rep' : 'assistant',
            content: m.content,
          }))
          setMessages([{ role: 'assistant', content: GREETING }, ...mapped])
          lastPollRef.current = hist[hist.length - 1].created_at
          if (data.human) setRepActive(true)
        }
      } catch { /* ignore */ }
    })()
  }, [open, user])

  // Poll for live rep replies while the chat is open
  useEffect(() => {
    if (!open) return
    const sid = effectiveSid(user)
    const tick = async () => {
      try {
        const res = await fetch(`/api/chat/messages?session_id=${encodeURIComponent(sid)}&after=${encodeURIComponent(lastPollRef.current)}`, {
          headers: await chatHeaders(),
        })
        const data = await res.json()
        if (data.human) setRepActive(true)
        const newReps = (data.messages ?? []).filter((m: { role: string }) => m.role === 'human')
        if (newReps.length > 0) {
          setMessages((m) => [...m, ...newReps.map((r: { content: string }) => ({ role: 'rep' as const, content: r.content }))])
        }
        if ((data.messages ?? []).length > 0) {
          lastPollRef.current = data.messages[data.messages.length - 1].created_at
        }
      } catch { /* ignore */ }
    }
    const id = setInterval(tick, 4000)
    return () => clearInterval(id)
  }, [open, user])

  // Know the signed-in user from the shared Supabase session (works whether they
  // signed in here, on /account, or /admin)
  useEffect(() => {
    const supabase = getSupabaseBrowser()
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (u?.email) {
        setUser({
          email: u.email,
          name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email.split('@')[0],
          picture: (u.user_metadata?.avatar_url as string) || (u.user_metadata?.picture as string) || '',
          idToken: '',
          nonce: '',
        })
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      if (u?.email) {
        setUser({
          email: u.email,
          name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email.split('@')[0],
          picture: (u.user_metadata?.avatar_url as string) || (u.user_metadata?.picture as string) || '',
          idToken: '',
          nonce: '',
        })
        historyLoadedRef.current = false // reload this user's conversation
      } else {
        setUser(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, sending])

  if (isAdmin) return null

  async function handleGoogleSignIn() {
    setSigningIn(true)
    try {
      const gUser = await googlePopupSignIn()
      await exchangeGoogleToken(getSupabaseBrowser(), gUser.idToken, gUser.nonce)
      setUser(gUser)
      historyLoadedRef.current = false
      setMessages((m) => [...m, { role: 'assistant', content: `Welcome back, ${gUser.name.split(' ')[0]}! 🙌 I've got our previous chats — how can I help?` }])
    } catch {
      // Popup dismissed or blocked — no error shown, just stay anonymous
    }
    setSigningIn(false)
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      const authHeaders = await chatHeaders()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          session_id: effectiveSid(user),
          message: text,
        }),
      })
      const data = await res.json()
      if (data.human || data.reply === null) {
        // A human rep has taken over — their reply arrives via polling
        setRepActive(true)
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply ?? 'Sorry, something went wrong.' }])
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: "Hmm, I couldn't reach the server. Mind trying again in a moment?" },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-[150] flex flex-col items-end gap-3"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* ── Chat panel ── */}
      <div
        aria-hidden={!open}
        className="flex w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[#c9a84c]/30 bg-[#0e0e0e] shadow-2xl shadow-black/60"
        style={{
          height: open ? 'min(560px, calc(100vh - 7rem))' : 0,
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
          transition: 'opacity 0.25s ease, transform 0.25s ease, height 0.25s ease',
          pointerEvents: open ? 'auto' : 'none',
          transformOrigin: 'bottom right',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#141414] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c9a84c]/15">
              <Sparkles className="h-4 w-4 text-[#c9a84c]" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">Sage · Seliem.dev</div>
              <div className="text-[11px] text-green-400">● Online</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Google sign-in for higher limits */}
            {!user && (
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                title="Sign in for unlimited messages"
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-400 transition hover:border-[#c9a84c]/40 hover:text-white disabled:opacity-40"
              >
                <LogIn className="h-3 w-3" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
            {user && (
              <div className="flex items-center gap-1.5" title={user.email}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.picture} alt="" className="h-5 w-5 rounded-full" />
                <span className="max-w-[80px] truncate text-[11px] text-gray-400">{user.name.split(' ')[0]}</span>
              </div>
            )}
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start'}>
              {m.role === 'rep' && <span className="mb-0.5 ml-1 text-[10px] font-medium text-[#c9a84c]">Seliem.dev team</span>}
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-[#c9a84c] px-3.5 py-2 text-sm text-black'
                    : m.role === 'rep'
                    ? 'max-w-[85%] rounded-2xl rounded-bl-sm border border-[#c9a84c]/30 bg-[#1a1810] px-3.5 py-2 text-sm text-gray-100'
                    : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-[#1c1c1c] px-3.5 py-2 text-sm text-gray-100'
                }
                style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-[#1c1c1c] px-4 py-3 text-sm text-gray-400">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sign-in prompt for anonymous users nearing limit */}
        {!user && messages.filter((m) => m.role === 'user').length >= 10 && (
          <div className="border-t border-white/5 bg-[#1a1a14] px-4 py-2">
            <button
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/10 py-2 text-xs text-[#c9a84c] transition hover:bg-[#c9a84c]/20"
            >
              <LogIn className="h-3 w-3" />
              Sign in with Google for unlimited messages
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/10 bg-[#141414] p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="Type your message…"
              className="max-h-28 flex-1 resize-none rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-[#c9a84c]/50 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c9a84c] text-black transition hover:bg-[#f5d485] disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-gray-600">AI assistant · answers about Seliem.dev only</p>
        </div>
      </div>

      {/* ── Gentle teaser (dismissible, never auto-opens) ── */}
      {!open && teaser && (
        <div className="flex items-center gap-2 rounded-2xl rounded-br-sm border border-[#c9a84c]/25 bg-[#141414] px-3.5 py-2.5 shadow-xl shadow-black/40" style={{ maxWidth: 230 }}>
          <button
            onClick={() => { setTeaser(false); sessionStorage.setItem('sage_teased', '1'); setOpen(true) }}
            className="text-left text-[13px] leading-snug text-gray-200"
          >
            👋 Have a question? I&apos;m here to help.
          </button>
          <button
            onClick={() => { setTeaser(false); sessionStorage.setItem('sage_teased', '1') }}
            aria-label="Dismiss"
            className="shrink-0 text-gray-500 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Trigger bubble ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat with us"
          className="group relative flex items-center gap-2 rounded-full border border-[#c9a84c]/60 bg-[#0a0a0a] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 transition-all duration-300 hover:border-[#c9a84c] hover:bg-[#111] hover:shadow-xl hover:shadow-[#c9a84c]/20 active:scale-95"
          style={{ animation: 'sageGlow 3s ease-in-out infinite' }}
        >
          <style>{`
            @keyframes sageGlow {
              0%, 100% { box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 0 0 rgba(201,168,76,0.35); }
              50%      { box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 0 8px rgba(201,168,76,0); }
            }
          `}</style>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>
          <Sparkles className="h-4 w-4 shrink-0 text-[#c9a84c]" />
          <span className="hidden sm:inline">Chat with us</span>
        </button>
      )}
    </div>
  )
}
