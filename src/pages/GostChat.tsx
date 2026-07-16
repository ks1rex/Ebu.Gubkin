import { useState, useEffect, useRef, FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Send, Download, Bot, User, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

const GOST = import.meta.env.VITE_GOST_URL as string

interface Msg { id: string; role: 'user' | 'assistant'; content: string; created_at: string }
interface ChatResp { reply: string; docx_url: string; pdf_url: string | null }

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export default function GostChat() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [docxUrl, setDocxUrl]   = useState<string | null>(null)
  const [pdfUrl, setPdfUrl]     = useState<string | null>(null)

  useEffect(() => {
    if (!GOST) { setLoading(false); return }
    authHeaders().then(hdrs =>
      fetch(`${GOST}/chat/${id}`, { headers: hdrs })
        .then(r => r.json())
        .then(data => setMessages(Array.isArray(data) ? data : []))
        .catch(() => toast('Не удалось загрузить историю чата', 'error'))
        .finally(() => setLoading(false))
    )
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending || !GOST) return

    const optimistic: Msg = { id: `local-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setInput('')
    setSending(true)

    try {
      const hdrs = await authHeaders()
      const res = await fetch(`${GOST}/chat/${id}`, {
        method: 'POST',
        headers: { ...hdrs, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data: ChatResp = await res.json()
      if (!res.ok) {
        const msg = (data as any).detail?.error ?? (data as any).error ?? `HTTP ${res.status}`
        if (res.status === 402) toast('Недостаточно ГОСТ-токенов', 'error')
        else toast(msg, 'error')
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setInput(text)
        return
      }
      setDocxUrl(data.docx_url)
      setPdfUrl(data.pdf_url ?? null)
      const assistant: Msg = { id: `local-${Date.now() + 1}`, role: 'assistant', content: data.reply, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, assistant])
    } catch {
      toast('Сетевая ошибка', 'error')
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(text)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  if (!GOST) return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-subtle text-sm">
      VITE_GOST_URL не настроен
    </div>
  )

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Link to="/gost" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', textDecoration: 'none', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} /> Назад к ГОСТ
        </Link>
        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>Редактирование через чат</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {docxUrl ? (
            <a href={docxUrl} target="_blank" rel="noreferrer"
              className="border border-teal-legacy text-teal-legacy"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
              <Download size={13} /> DOCX
            </a>
          ) : (
            <span style={{ color: '#64748b', fontSize: '0.8rem', padding: '6px 12px', border: '1px solid #2d3f55', borderRadius: 8 }}>
              Документ появится после первого ответа
            </span>
          )}
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #2d3f55', borderRadius: 8, color: '#94a3b8', textDecoration: 'none', fontSize: '0.8rem' }}>
              <Download size={13} /> PDF
            </a>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
        {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Загрузка чата...</div>}

        {!loading && messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', textAlign: 'center', gap: 8 }}>
            <Bot size={40} style={{ color: '#1e3a4a' }} />
            <div style={{ fontSize: '0.9rem' }}>Напишите первое сообщение, чтобы начать редактирование</div>
            <div style={{ fontSize: '0.8rem', color: '#475569', maxWidth: 380 }}>
              Например: «Перепиши введение» или «Добавь заключение с выводами по расчёту»
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: msg.role === 'user' ? '#1e3a4a' : '#0d2620' }}>
              {msg.role === 'user' ? <User size={15} style={{ color: '#94a3b8' }} /> : <Bot size={15} className="text-teal-legacy" />}
            </div>
            <div style={{
              maxWidth: '75%', padding: '10px 14px', borderRadius: 14,
              background: msg.role === 'user' ? '#1e3a4a' : '#0f1923',
              border: msg.role === 'user' ? 'none' : '1px solid #1e3a4a',
              color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              borderTopRightRadius: msg.role === 'user' ? 4 : 14,
              borderTopLeftRadius: msg.role === 'user' ? 14 : 4,
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d2620' }}>
              <Bot size={15} className="text-teal-legacy" />
            </div>
            <div style={{ padding: '10px 14px', background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 14, borderTopLeftRadius: 4 }}>
              <Loader2 size={16} style={{ color: '#64748b', animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 14, display: 'flex', alignItems: 'flex-end', gap: 8, padding: 8, marginTop: 12 }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as any) } }}
          placeholder="Напишите требование к документу... (Enter — отправить, Shift+Enter — перенос)"
          rows={3}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5, padding: '4px 8px' }}
        />
        <button type="submit" disabled={!input.trim() || sending}
          className="bg-teal-legacy"
          style={{ width: 36, height: 36, borderRadius: 10, border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginBottom: 2, opacity: (!input.trim() || sending) ? 0.4 : 1 }}>
          {sending ? <Loader2 size={16} /> : <Send size={16} />}
        </button>
      </form>
    </div>
  )
}
