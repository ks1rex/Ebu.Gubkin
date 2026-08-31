import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react'
import { Paperclip, Send, Download, X, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiCall, apiUpload } from '../lib/api'
import { autoGrowTextarea, CHAT_TEXTAREA_MAX_H } from '../lib/autoGrowTextarea'
import { ENTER_SENDS_MESSAGE } from '../lib/platform'
import { isImageName } from '../lib/attachments'
import { useToast } from '../contexts/ToastContext'
import VipName from './VipBadge'
import Lightbox from './Lightbox'
import { compressImage, WORK_FILE } from '../lib/compressImage'

// Подписанная ссылка живёт 300с на бэкенде — кэш вне компонента, чтобы опрос
// сообщений каждые 5с не перезапрашивал превью уже отрисованных картинок.
const previewCache = new Map<string, string>()

function ChatImage({ url, name, onDownload }: { url: string; name: string; onDownload: () => void }) {
  const [src, setSrc] = useState(previewCache.get(url) ?? null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (previewCache.has(url)) { setSrc(previewCache.get(url)!); return }
    let cancelled = false
    apiCall('GET', url).then(({ url: signed }: { url: string }) => {
      if (cancelled) return
      previewCache.set(url, signed)
      setSrc(signed)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [url])

  if (!src) return <div style={{ ...S.attRow, color: '#64748b', fontSize: '0.78rem' }}>{name}…</div>

  return (
    <div style={{ position: 'relative', marginTop: 6, width: 'fit-content' }}>
      <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}>
        <img src={src} alt={name} style={{ maxWidth: 220, maxHeight: 220, borderRadius: 10, display: 'block' }} />
      </button>
      <button onClick={onDownload} title="Скачать" style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(15,25,35,0.75)', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', color: '#e2e8f0', display: 'flex' }}>
        <Download size={13} />
      </button>
      {open && <Lightbox url={src} onClose={() => setOpen(false)} />}
    </div>
  )
}

const S: Record<string, any> = {
  wrap: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
  banner: { background: '#1e3a4a', border: '1px solid #0e8a7d', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 10 },
  bannerText: { color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 },
  messagesArea: { flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 },
  ownBubble:   { alignSelf: 'flex-end',   maxWidth: '70%', background: '#0d2620', border: '1px solid #0e8a7d', borderRadius: '14px 14px 4px 14px',  padding: '9px 13px' },
  otherBubble: { alignSelf: 'flex-start', maxWidth: '70%', background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: '14px 14px 14px 4px', padding: '9px 13px' },
  senderName: { fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 },
  msgText:    { color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  msgTime:    { color: '#64748b', fontSize: '0.7rem', marginTop: 4, textAlign: 'right' },
  contactFlag: { display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: '0.7rem', marginTop: 4 },
  attRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '5px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 },
  attName: { color: '#94a3b8', fontSize: '0.78rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dlBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 },
  inputArea: { borderTop: '1px solid #1e3a4a', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 },
  filesPreview: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  fileChip: { display: 'flex', alignItems: 'center', gap: 5, background: '#1e3a4a', borderRadius: 6, padding: '3px 8px', fontSize: '0.78rem', color: '#94a3b8' },
  fileChipX: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  textarea: { flex: 1, background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 10, padding: '10px 12px', color: '#e2e8f0', fontSize: '0.9rem', resize: 'none', lineHeight: 1.5, minHeight: 42, maxHeight: CHAT_TEXTAREA_MAX_H, overflowY: 'auto', boxSizing: 'border-box' },
  attachBtn: { background: '#1e3a4a', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0 },
  readonlyBanner: { textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '0.82rem', borderTop: '1px solid #1e3a4a' },
  sendErr: { color: '#f87171', fontSize: '0.82rem' },
  lockedBanner: { textAlign: 'center', padding: '10px', color: '#f59e0b', fontSize: '0.82rem', borderTop: '1px solid #1e3a4a' },
  adminBubble: { background: '#2a2010', border: '1px solid #f5c451' },
  adminBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f5c451', fontSize: '0.72rem', fontWeight: 700, marginBottom: 4 },
  systemRow: { alignSelf: 'center', maxWidth: '85%', textAlign: 'center' },
  systemBubble: { display: 'inline-block', background: 'rgba(14,138,125,0.1)', border: '1px dashed #0e8a7d', borderRadius: 12, padding: '7px 14px', color: '#5eead4', fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
}

const CHAT_VIP_LOCK_CODE = 'VIP_EXPIRED_CHAT_LOCKED'

// Кольцо прогресса вместо иконки отправки на время загрузки вложений —
// без него при большом файле на медленной сети непонятно, сайт завис
// или всё ещё грузит.
function UploadRing({ progress }: { progress: number }) {
  const r = 7, c = 2 * Math.PI * r
  return (
    <svg width={15} height={15} viewBox="0 0 18 18" className="shrink-0">
      <circle cx="9" cy="9" r={r} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2.5" />
      <circle
        cx="9" cy="9" r={r} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - progress / 100)}
        transform="rotate(-90 9 9)" style={{ transition: 'stroke-dashoffset .15s linear' }}
      />
    </svg>
  )
}

// Системные сообщения об изменении цены (см. orders.js priceEventMessage)
// кодируют обе цифры — рендерим ту, что относится к роли текущего зрителя,
// вместо одного зашитого текста на всех.
const PRICE_EVENT_PREFIX = 'SYS_PRICE::'

function renderPriceEvent(content: string, role?: 'customer' | 'executor'): string | null {
  if (!content.startsWith(PRICE_EVENT_PREFIX)) return null
  let ev: any
  try { ev = JSON.parse(content.slice(PRICE_EVENT_PREFIX.length)) } catch { return null }
  const byLabel = ev.by === 'customer' ? 'Заказчик' : 'Исполнитель'
  switch (ev.event) {
    case 'proposed':
      return role === 'customer'
        ? `💰 ${byLabel} предложил новую цену — вы заплатите ${ev.charge} ₽. Ждём подтверждения второй стороны.`
        : role === 'executor'
          ? `💰 ${byLabel} предложил новую цену — вы получите ${ev.payout} ₽. Ждём подтверждения второй стороны.`
          : `💰 ${byLabel} предложил новую цену: заказчик платит ${ev.charge} ₽, исполнитель получает ${ev.payout} ₽.`
    case 'accepted':
      return role === 'customer'
        ? `✅ Новая цена согласована: вы платите ${ev.charge} ₽.`
        : role === 'executor'
          ? `✅ Новая цена согласована: вы получите ${ev.payout} ₽.`
          : `✅ Новая цена согласована: заказчик платит ${ev.charge} ₽, исполнитель получает ${ev.payout} ₽.`
    case 'declined':
      return `❌ ${byLabel} отклонил предложенную цену.`
    case 'cancelled':
      return '❌ Предложение новой цены отменено автором.'
    default:
      return null
  }
}

interface Props {
  conversationId: string
  readOnly?: boolean
  pollInterval?: number
  /** Admin panel mode: reads/sends via /admin/conversations/:id/messages (no file uploads there). */
  adminMode?: boolean
  /** Order chat only: who's viewing, so price-change system messages show the right number to each side. */
  orderRole?: 'customer' | 'executor'
}

export default function ChatWindow({ conversationId, readOnly = false, pollInterval = 5000, adminMode = false, orderRole }: Props) {
  const { user } = useAuth()
  const toast = useToast()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [sendError, setSendError] = useState('')
  const [chatLocked, setChatLocked] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const atBottomRef = useRef(true)

  const basePath = adminMode ? `/admin/conversations/${conversationId}/messages` : `/conversations/${conversationId}/messages`

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    try {
      const data = await apiCall('GET', `${basePath}?limit=100`)
      setMessages(data ?? [])
    } catch {}
  }, [conversationId, basePath])

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

  // Высота поля следует за текстом: рост при переносах строк, возврат к одной
  // строке после успешной отправки (doSend чистит text только при успехе, так
  // что при ошибке сохранённый черновик остаётся с правильной высотой).
  useLayoutEffect(() => { autoGrowTextarea(textareaRef.current) }, [text])

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
    setUploadProgress(files.length > 0 ? 0 : null)
    try {
      let failedFiles: string[] = []
      if (adminMode) {
        await apiCall('POST', basePath, { content: text })
      } else {
        const form = new FormData()
        form.append('content', text)
        // Фото ужимаются перед отправкой; документы проходят как есть.
        for (const f of files) form.append('files', await compressImage(f, WORK_FILE))
        const res = files.length > 0
          ? await apiUpload('POST', basePath, form, setUploadProgress)
          : await apiCall('POST', basePath, form)
        failedFiles = res?.failed_files ?? []
      }
      setText('')
      setFiles([])
      atBottomRef.current = true
      await loadMessages()
      if (failedFiles.length > 0) {
        toast(`Не удалось прикрепить: ${failedFiles.join(', ')}`, 'error')
      }
    } catch (e: any) {
      if (e.data?.code === CHAT_VIP_LOCK_CODE) setChatLocked(true)
      else setSendError(e.message)
    } finally {
      setSending(false)
      setUploadProgress(null)
    }
  }

  async function handleDownload(msg: any, att: any) {
    try {
      const downloadBase = adminMode ? `/admin/conversations/${conversationId}` : `/conversations/${conversationId}`
      const { url, filename } = await apiCall('GET', `${downloadBase}/messages/${msg.id}/attachments/${att.id}/download`)
      const a = document.createElement('a')
      a.href = url
      a.download = filename ?? att.file_name
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (ENTER_SENDS_MESSAGE && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!sending && (text.trim() || files.length > 0)) doSend()
    }
  }

  if (!conversationId) return <div style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Чат не найден</div>
  if (loading) return <div style={{ color: '#64748b', padding: '1rem' }}>Загрузка чата...</div>

  const sendDisabled = sending || (!text.trim() && files.length === 0)

  return (
    <div style={S.wrap}>
      <div style={S.messagesArea} onScroll={handleScroll}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: '0.9rem' }}>Сообщений пока нет</div>
        )}
        {messages.map(msg => {
          // Системные сообщения (обмен контактами, изменение цены и т.п.)
          // отправляются с sender_id: null — join на profiles тогда пустой.
          // Без этой ветки они рисовались как обычная реплика "чужого"
          // пользователя (с краю, подписью "Пользователь").
          if (!msg.sender && !msg.is_admin_message) {
            return (
              <div key={msg.id} className="chat-msg-in" style={S.systemRow}>
                <div style={S.systemBubble}>{renderPriceEvent(msg.content, orderRole) ?? msg.content}</div>
              </div>
            )
          }

          // Бэкенд отдаёт sender как вложенный объект (sender:profiles!...),
          // плоского msg.sender_id в ответе нет — сравнение с ним всегда
          // давало false, и свои сообщения всегда рисовались как чужие.
          const isOwn = msg.sender?.id === user?.id
          const bubbleStyle = msg.is_admin_message
            ? { ...(isOwn ? S.ownBubble : S.otherBubble), ...S.adminBubble }
            : (isOwn ? S.ownBubble : S.otherBubble)
          return (
            <div key={msg.id} className="chat-msg-in" style={bubbleStyle}>
              {msg.is_admin_message ? (
                <div style={S.adminBadge}><ShieldCheck size={11} />Администратор</div>
              ) : (
                !isOwn && <div className="text-teal-legacy" style={S.senderName}><VipName name={msg.sender?.nickname ?? 'Пользователь'} isVip={msg.sender?.is_vip} badgeSize="sm" /></div>
              )}
              {msg.content && <div style={S.msgText}>{msg.content}</div>}
              {msg.message_attachments?.map((att: any) => (
                isImageName(att.file_name) ? (
                  <ChatImage
                    key={att.id}
                    url={`${adminMode ? `/admin/conversations/${conversationId}` : `/conversations/${conversationId}`}/messages/${msg.id}/attachments/${att.id}/preview`}
                    name={att.file_name}
                    onDownload={() => handleDownload(msg, att)}
                  />
                ) : (
                  <div key={att.id} style={S.attRow}>
                    <span style={S.attName}>{att.file_name}</span>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{(att.file_size / 1024).toFixed(0)} КБ</span>
                    <button className="text-teal-legacy" style={S.dlBtn} onClick={() => handleDownload(msg, att)}><Download size={13} /></button>
                  </div>
                )
              ))}
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
      ) : chatLocked ? (
        <div style={S.inputArea}>
          <div style={S.inputRow}>
            <textarea style={{ ...S.textarea, opacity: 0.5, cursor: 'not-allowed' }} disabled rows={1} />
            <button style={{ background: '#1e3a4a', border: 'none', borderRadius: 8, padding: '10px 14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, flexShrink: 0, fontSize: '0.88rem' }} disabled>
              <Send size={15} />Отправить
            </button>
          </div>
          <div style={S.lockedBanner}>
            Чат заблокирован до продления VIP · <Link to="/wallet" className="text-teal-legacy">Продлить VIP</Link>
          </div>
        </div>
      ) : (
        <div style={S.inputArea}>
          {!adminMode && files.length > 0 && (
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
            {!adminMode && <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />}
            {!adminMode && (
              <button style={S.attachBtn} onClick={() => fileInputRef.current?.click()} title="Прикрепить файл">
                <Paperclip size={16} />
              </button>
            )}
            <textarea
              ref={textareaRef}
              style={S.textarea}
              placeholder="Напишите сообщение..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className={`${sendDisabled ? '' : 'bg-teal-legacy'} flex items-center gap-[5px] font-semibold text-[0.88rem] shrink-0 rounded-lg px-3 sm:px-3.5 py-2.5 border-0`}
              style={{ background: sendDisabled ? '#1e3a4a' : undefined, cursor: sendDisabled ? 'default' : 'pointer', color: sendDisabled ? '#64748b' : '#fff' }}
              onClick={doSend}
              disabled={sendDisabled}
            >
              {uploadProgress != null ? (
                <UploadRing progress={uploadProgress} />
              ) : sending ? (
                <Send size={15} className="animate-pulse" />
              ) : (
                <Send size={15} />
              )}
              <span className="hidden sm:inline">
                {uploadProgress != null ? `${uploadProgress}%` : sending ? '...' : 'Отправить'}
              </span>
            </button>
          </div>
          {sendError && (
            <div style={S.sendErr}>
              {sendError}
              {sendError.includes('заблокирован') && (
                <> · <Link to="/support" className="text-teal-legacy">Написать в поддержку</Link></>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
