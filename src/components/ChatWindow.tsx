import { useEffect, useState, useRef, useCallback } from 'react'
import { Paperclip, Send, Download, AlertTriangle, X, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

const S: Record<string, any> = {
  wrap: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
  banner: { background: '#1e3a4a', border: '1px solid #0e8a7d', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 10 },
  bannerText: { color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 },
  messagesArea: { flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 },
  ownBubble:   { alignSelf: 'flex-end',   maxWidth: '70%', background: '#0d2620', border: '1px solid #0e8a7d', borderRadius: '14px 14px 4px 14px',  padding: '9px 13px' },
  otherBubble: { alignSelf: 'flex-start', maxWidth: '70%', background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: '14px 14px 14px 4px', padding: '9px 13px' },
  senderName: { color: '#14a89a', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 },
  msgText:    { color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  msgTime:    { color: '#64748b', fontSize: '0.7rem', marginTop: 4, textAlign: 'right' },
  contactFlag: { display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: '0.7rem', marginTop: 4 },
  attRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '5px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 },
  attName: { color: '#94a3b8', fontSize: '0.78rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dlBtn: { background: 'none', border: 'none', color: '#14a89a', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 },
  inputArea: { borderTop: '1px solid #1e3a4a', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 },
  filesPreview: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  fileChip: { display: 'flex', alignItems: 'center', gap: 5, background: '#1e3a4a', borderRadius: 6, padding: '3px 8px', fontSize: '0.78rem', color: '#94a3b8' },
  fileChipX: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  textarea: { flex: 1, background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 10, padding: '10px 12px', color: '#e2e8f0', fontSize: '0.9rem', resize: 'none', lineHeight: 1.5, minHeight: 42, maxHeight: 120, boxSizing: 'border-box' },
  attachBtn: { background: '#1e3a4a', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0 },
  readonlyBanner: { textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '0.82rem', borderTop: '1px solid #1e3a4a' },
  sendErr: { color: '#f87171', fontSize: '0.82rem' },
}

interface Props {
  conversationId: string
  readOnly?: boolean
  scheduledBanner?: boolean
  pollInterval?: number
}

export default function ChatWindow({ conversationId, readOnly = false, scheduledBanner = false, pollInterval = 5000 }: Props) {
  const { user } = useAuth()
  const toast = useToast()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const atBottomRef = useRef(true)

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    try {
      const data = await apiCall('GET', `/conversations/${conversationId}/messages?limit=100`)
      setMessages(data ?? [])
    } catch {}
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    setLoading(true)
    loadMessages().finally(() => setLoading(false))
  }, [conversationId, loadMessages])

  useEffect(() => {
    if (!conversationId) return
    const t = setInterval(loadMessages, pollInterval)
    return () => clearInterval(t)
  }, [conversationId, loadMessages, pollInterval])

  useEffect(() => {
    if (atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? [])
    setFiles(prev => [...prev, ...chosen].slice(0, 5))
    e.target.value = ''
  }

  async function doSend() {
    setSending(true)
    setSendError('')
    try {
      const form = new FormData()
      form.append('content', text || ' ')
      for (const f of files) form.append('files', f)
      await apiCall('POST', `/conversations/${conversationId}/messages`, form)
      setText('')
      setFiles([])
      atBottomRef.current = true
      await loadMessages()
    } catch (e: any) {
      setSendError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDownload(msg: any, att: any) {
    try {
      const { url } = await apiCall('GET', `/conversations/${conversationId}/messages/${msg.id}/attachments/${att.id}/download`)
      window.open(url, '_blank')
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!sending && (text.trim() || files.length > 0)) doSend()
    }
  }

  if (!conversationId) return <div style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Чат не найден</div>
  if (loading) return <div style={{ color: '#64748b', padding: '1rem' }}>Загрузка чата...</div>

  const sendDisabled = sending || (!text.trim() && files.length === 0)

  return (
    <div style={S.wrap}>
      {scheduledBanner && (
        <div style={S.banner}>
          <Info size={16} style={{ color: '#14a89a', flexShrink: 0, marginTop: 1 }} />
          <div style={S.bannerText}>Для согласования времени и места вы можете обменяться контактами. Переписка проверяется модератором.</div>
        </div>
      )}

      <div style={S.messagesArea} onScroll={handleScroll}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: '0.9rem' }}>Сообщений пока нет</div>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === user?.id
          return (
            <div key={msg.id} style={isOwn ? S.ownBubble : S.otherBubble}>
              {!isOwn && <div style={S.senderName}>{msg.sender?.nickname ?? 'Пользователь'}</div>}
              <div style={S.msgText}>{msg.content}</div>
              {msg.message_attachments?.map((att: any) => (
                <div key={att.id} style={S.attRow}>
                  <span style={S.attName}>{att.file_name}</span>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{(att.file_size / 1024).toFixed(0)} КБ</span>
                  <button style={S.dlBtn} onClick={() => handleDownload(msg, att)}><Download size={13} /></button>
                </div>
              ))}
              {msg.is_contact_info && (
                <div style={S.contactFlag}>
                  <AlertTriangle size={11} />
                  {scheduledBanner ? 'Контактные данные — проверяется модератором' : 'Обнаружены контактные данные'}
                </div>
              )}
              <div style={S.msgTime}>
                {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                {' '}
                {new Date(msg.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {readOnly ? (
        <div style={S.readonlyBanner}>Просмотр переписки — только чтение</div>
      ) : (
        <div style={S.inputArea}>
          {files.length > 0 && (
            <div style={S.filesPreview}>
              {files.map((f, i) => (
                <div key={i} style={S.fileChip}>
                  {f.name.length > 20 ? f.name.slice(0, 18) + '…' : f.name}
                  <button style={S.fileChipX} onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={S.inputRow}>
            <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <button style={S.attachBtn} onClick={() => fileInputRef.current?.click()} title="Прикрепить файл">
              <Paperclip size={16} />
            </button>
            <textarea
              style={S.textarea}
              placeholder="Напишите сообщение... (Enter — отправить, Shift+Enter — перенос)"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              style={{ background: sendDisabled ? '#1e3a4a' : '#14a89a', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: sendDisabled ? 'default' : 'pointer', color: sendDisabled ? '#64748b' : '#fff', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, flexShrink: 0, fontSize: '0.88rem' }}
              onClick={doSend}
              disabled={sendDisabled}
            >
              <Send size={15} />{sending ? '...' : 'Отправить'}
            </button>
          </div>
          {sendError && (
            <div style={S.sendErr}>
              {sendError}
              {sendError.includes('заблокирован') && (
                <> · <Link to="/support" style={{ color: '#14a89a' }}>Написать в поддержку</Link></>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
