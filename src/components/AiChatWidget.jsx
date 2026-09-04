import { useEffect, useRef, useState } from 'react'
import { WS_BASE_URL, getAuthToken, currentCompanyId } from '../api/client'
import ikyamMark from '../assets/ikyam-mark.png'
import '../styles/ikyam-mock.css'
import '../styles/AiChatWidget.css'

function newSessionId() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
}

export default function AiChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // { role: 'user'|'assistant'|'system', content }
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [pendingAsk, setPendingAsk] = useState(null)
  const wsRef = useRef(null)
  const sessionIdRef = useRef(sessionStorage.getItem('ikyam_ai_session') || newSessionId())
  const scrollRef = useRef(null)

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
  }, [pendingAsk, connected])

  useEffect(() => {
    if (!open || wsRef.current) return
    const token = getAuthToken()
    const companyId = currentCompanyId() || ''
    const ws = new WebSocket(
      `${WS_BASE_URL}/ai/chat/ws?token=${encodeURIComponent(token)}&session_id=${sessionIdRef.current}&company_id=${encodeURIComponent(companyId)}`
    )
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => { setConnected(false); wsRef.current = null }
    ws.onerror = () => setConnected(false)
    ws.onmessage = (evt) => {
      let data
      try {
        data = JSON.parse(evt.data)
      } catch {
        return
      }
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
      } else if (data.type === 'error') {
        setStreaming(false)
        setMessages((prev) => [...prev, { role: 'system', content: data.message }])
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function send() {
    const text = input.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    wsRef.current.send(JSON.stringify({ message: text }))
    setInput('')
  }

  function newChat() {
    sessionIdRef.current = newSessionId()
    sessionStorage.setItem('ikyam_ai_session', sessionIdRef.current)
    setMessages([])
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
                {m.content}
                {m.streaming && <span className="ai-chat-cursor">▍</span>}
              </div>
            ))}
          </div>

          <div className="ai-chat-inputrow">
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
