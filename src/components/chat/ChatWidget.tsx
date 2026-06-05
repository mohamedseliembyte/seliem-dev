'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X, Send, Sparkles } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

const GREETING =
  "Hi! 👋 I’m Sage, Mohamed’s assistant at Seliem.dev. Looking for a website, an AI automation, or both? Tell me a bit about your project and I’ll help you get started."

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('sage_session')
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    localStorage.setItem('sage_session', id)
  }
  return id
}

export default function ChatWidget() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAdmin) return
    const t = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(t)
  }, [isAdmin])

  if (isAdmin) return null

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, sending])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: getSessionId(), message: text }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply ?? 'Sorry, something went wrong.' }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Hmm, I couldn’t reach the server. Mind trying again in a moment?' },
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
          <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-gray-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-[#c9a84c] px-3.5 py-2 text-sm text-black'
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

      {/* ── Trigger bubble ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat with us"
          className="flex items-center gap-2 rounded-full border border-[#c9a84c]/60 bg-[#0a0a0a] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 transition-all duration-200 hover:border-[#c9a84c] hover:bg-[#111] hover:shadow-xl active:scale-95"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-[#c9a84c]" />
          <span className="hidden sm:inline">Chat with us</span>
        </button>
      )}
    </div>
  )
}
