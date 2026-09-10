import { useEffect, useRef, useState } from 'react'
import { WS_BASE_URL, getAuthToken } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ikyamMark from '../assets/ikyam-mark.png'
import '../styles/ikyam-mock.css'
import '../styles/AiChatWidget.css'

function newSessionId() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
}

// Plain SVG instead of the 📇 emoji — Windows renders that "card index"
// glyph as a small, dated-looking icon rather than a clean scan/camera one.
function ScanCardIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

// This widget renders replies as plain text, no markdown parser — the system
// prompt tells Gemini not to use markdown, but that's a prompt instruction,
// not a guarantee, so this is a belt-and-suspenders cleanup for whatever
// slips through (**bold**, *italic*, bullet/heading markers) rather than
// showing literal asterisks/hashes to the user.
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** -> bold
    .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '$1') // *italic* -> italic
    .replace(/^#{1,6}\s+/gm, '')       // # Heading -> Heading
    .replace(/^[*-]\s+/gm, '- ')       // *bullet / -bullet -> - bullet
}

export default function AiChatWidget() {
  const { companyId } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // { role: 'user'|'assistant'|'system', content }
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [pendingAsk, setPendingAsk] = useState(null)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  // True from the moment a message is sent until the FIRST byte comes back.
  // Tool-calling (search a table, look up a company, retry a failed model)
  // can take a real few seconds with nothing visible happening otherwise —
  // this is what actually made replies feel slow, not the backend itself.
  const [waitingForReply, setWaitingForReply] = useState(false)
  const wsRef = useRef(null)
  const sessionIdRef = useRef(sessionStorage.getItem('ikyam_ai_session') || newSessionId())
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    sessionStorage.setItem('ikyam_ai_session', sessionIdRef.current)
  }, [])

  // Other screens (e.g. the Analytics "ask a follow-up" box) can hand the
  // widget a question without duplicating the WebSocket plumbing — they just
  // dispatch this event, and it opens the panel and asks it for real once
  // connected.
  useEffect(() => {
    function onExternalAsk(evt) {
      const question = evt.detail?.question?.trim()
      if (!question) return
      setOpen(true)
      setPendingAsk(question)
    }
    window.addEventListener('ikyam:ai-ask', onExternalAsk)
    return () => window.removeEventListener('ikyam:ai-ask', onExternalAsk)
  }, [])

  useEffect(() => {
    if (!pendingAsk || !connected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    setMessages((prev) => [...prev, { role: 'user', content: pendingAsk }])
    wsRef.current.send(JSON.stringify({ message: pendingAsk }))
    setPendingAsk(null)
    setWaitingForReply(true)
  }, [pendingAsk, connected])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let reconnectTimer = null

    function connect() {
      if (cancelled) return
      const token = getAuthToken()
      const ws = new WebSocket(
        `${WS_BASE_URL}/ai/chat/ws?token=${encodeURIComponent(token)}&session_id=${sessionIdRef.current}&company_id=${encodeURIComponent(companyId || '')}`
      )
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        setWaitingForReply(false)
        wsRef.current = null
        // Previously there was no reconnect at all here — a dropped socket
        // (backend restart, brief network blip) left the widget stuck on
        // "Connecting…" forever until the panel was manually closed and
        // reopened. Retry on a short delay instead, as long as the panel is
        // still open.
        if (!cancelled) reconnectTimer = setTimeout(connect, 3000)
      }
      // onerror is always followed by onclose for a WebSocket, which is
      // where the actual reconnect is scheduled — this just updates the
      // status dot a moment sooner.
      ws.onerror = () => setConnected(false)
      ws.onmessage = (evt) => {
        let data
        try {
          data = JSON.parse(evt.data)
        } catch {
          return
        }
        setWaitingForReply(false)
        if (data.type === 'chunk') {
          setStreaming(true)
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last && last.role === 'assistant' && last.streaming) {
              return [...prev.slice(0, -1), { ...last, content: last.content + data.text }]
            }
            return [...prev, { role: 'assistant', content: data.text, streaming: true }]
          })
        } else if (data.type === 'done') {
          setStreaming(false)
          setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, streaming: false } : m)))
          // Only the business-card lead flow sets this — a real yes/no
          // confirmation, not free-form LLM text, so it's safe to render as
          // actual buttons instead of making the user type a reply.
          setAwaitingConfirm(!!data.awaiting_confirm)
        } else if (data.type === 'error') {
          setStreaming(false)
          setAwaitingConfirm(false)
          setMessages((prev) => [...prev, { role: 'system', content: data.message }])
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
      wsRef.current = null
    }
    // companyId is a real dependency, not just open — a socket connected
    // before AuthContext finished populating it (a real race right after
    // login) would otherwise keep baked-in empty company_id for its whole
    // lifetime, since a WebSocket URL can't be updated after connecting.
    // Reconnecting once the real value shows up is what actually fixes the
    // "Please select a company from the top bar first" error on a fresh
    // login even though a company clearly is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function send() {
    const text = input.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    wsRef.current.send(JSON.stringify({ message: text }))
    setInput('')
    setAwaitingConfirm(false)
    setWaitingForReply(true)
  }

  // Yes/No buttons shown under a business-card lead confirmation — sends
  // the same plain "yes"/"no" text the backend's confirmation step expects,
  // just via a button tap instead of typing it.
  function sendConfirm(answer) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    setMessages((prev) => [...prev, { role: 'user', content: answer === 'yes' ? 'Yes' : 'No' }])
    wsRef.current.send(JSON.stringify({ message: answer }))
    setAwaitingConfirm(false)
    setWaitingForReply(true)
  }

  // Business-card scan: reads the picked image as base64, shows it as the
  // user's own chat bubble (so they see what they sent), and pushes it over
  // the same socket as a {image_base64, image_mime_type} frame — the
  // backend takes it from there (extract → ask for anything missing →
  // confirm → create the lead), all as normal chat turns after this.
  function pickImage() {
    fileInputRef.current?.click()
  }

  function onImageSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again later
    if (!file || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const reader = new FileReader()
    reader.onload = () => {
      // reader.result is "data:image/jpeg;base64,<...>" — the backend wants
      // just the base64 payload, not the data: URL wrapper.
      const base64 = String(reader.result).split(',')[1] || ''
      if (!base64) return
      setMessages((prev) => [...prev, { role: 'user', content: '', imagePreview: String(reader.result) }])
      wsRef.current.send(JSON.stringify({ image_base64: base64, image_mime_type: file.type || 'image/jpeg' }))
      setAwaitingConfirm(false)
      setWaitingForReply(true)
    }
    reader.readAsDataURL(file)
  }

  function newChat() {
    sessionIdRef.current = newSessionId()
    sessionStorage.setItem('ikyam_ai_session', sessionIdRef.current)
    setMessages([])
    setAwaitingConfirm(false)
    setWaitingForReply(false)
    wsRef.current?.close()
  }

  return (
    <div className="ikyam-mock ai-chat-widget">
      {open && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <div className="rowx" style={{ gap: 8 }}>
              <img src={ikyamMark} alt="" className="ai-chat-brandmark" />
              <span className="ai-chat-dot" style={{ background: connected ? 'var(--green)' : 'var(--faint)' }} />
              <b>Ikyam AI Assistant</b>
            </div>
            <div className="rowx" style={{ gap: 10 }}>
              <span className="ai-chat-link" onClick={newChat}>New chat</span>
              <span className="ai-chat-close" onClick={() => setOpen(false)}>✕</span>
            </div>
          </div>

          <div className="ai-chat-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="ai-chat-empty">
                Ask me anything about your leads, pipeline, quotes, or how to use Ikyam CRM.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-chat-bubble ${m.role}`}>
                {m.imagePreview && (
                  <img src={m.imagePreview} alt="Business card" style={{ display: 'block', maxWidth: 160, borderRadius: 8 }} />
                )}
                {m.content && (m.role === 'user' ? m.content : stripMarkdown(m.content)).split('\n').map((line, li) => (
                  <div key={li}>{line}</div>
                ))}
                {m.streaming && <span className="ai-chat-cursor">▍</span>}
              </div>
            ))}
            {waitingForReply && (
              <div className="ai-chat-bubble assistant" aria-live="polite">
                <span className="ai-chat-typing">
                  <span className="ai-chat-typing-dot" />
                  <span className="ai-chat-typing-dot" />
                  <span className="ai-chat-typing-dot" />
                </span>
              </div>
            )}
            {awaitingConfirm && !streaming && (
              <div className="rowx" style={{ gap: 8, padding: '2px 0 4px' }}>
                <button type="button" className="btn pri" style={{ padding: '5px 16px' }} onClick={() => sendConfirm('yes')}>✓ Yes, create it</button>
                <button type="button" className="btn ghost" style={{ padding: '5px 16px' }} onClick={() => sendConfirm('no')}>✕ No</button>
              </div>
            )}
          </div>

          <div className="ai-chat-inputrow">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onImageSelected}
              hidden
            />
            <button
              type="button"
              className="btn ghost"
              onClick={pickImage}
              disabled={!connected}
              title="Scan a business card"
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
            >
              <ScanCardIcon />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={connected ? 'Type a message…' : 'Connecting…'}
              disabled={!connected}
            />
            <button type="button" className="btn pri" onClick={send} disabled={!connected || !input.trim()}>Send</button>
          </div>
        </div>
      )}

      <button type="button" className="ai-chat-fab" onClick={() => setOpen((v) => !v)} title="Ikyam AI Assistant">
        {open ? '✕' : <img src={ikyamMark} alt="Ikyam AI Assistant" className="ai-chat-fab-mark" />}
      </button>
    </div>
  )
}
