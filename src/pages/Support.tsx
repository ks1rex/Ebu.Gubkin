import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Plus, ChevronRight, Loader2, LifeBuoy } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { timeAgo } from '../lib/timeAgo'
import Modal from '../components/Modal'

const API = import.meta.env.VITE_BACKEND_URL as string

const STATUS_META: Record<string, { label: string; cls: string }> = {
  open:     { label: 'Открыт',   cls: 'bg-accent-subtle text-accent' },
  answered: { label: 'Ответили', cls: 'bg-success/10 text-success'  },
  closed:   { label: 'Закрыт',   cls: 'bg-panel text-subtle'        },
}

interface Ticket {
  id: string
  subject: string
  status: 'open' | 'answered' | 'closed'
  created_at: string
  conversation_id: string | null
  last_message: { content: string; created_at: string; sender_nickname: string | null } | null
}

const INPUT = 'w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors'

function CreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { session } = useAuth()
  const toast = useToast()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!subject.trim()) { toast('Введите тему', 'error'); return }
    if (!message.trim()) { toast('Введите сообщение', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(d.error ?? 'Ошибка')
      }
      toast('Тикет создан — мы ответим в ближайшее время', 'success')
      setSubject('')
      setMessage('')
      onClose()
      onCreated()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Новый тикет">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Тема</label>
          <input type="text" maxLength={200} required value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Кратко опишите проблему" className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Сообщение</label>
          <textarea required maxLength={5000} rows={5} value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Опишите ситуацию подробнее..."
            className={INPUT + ' resize-none'} />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
          {loading ? 'Отправляем...' : 'Отправить'}
        </button>
      </form>
    </Modal>
  )
}

export default function Support() {
  const { session } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  async function fetchTickets() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/support/tickets`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error()
      setTickets(await res.json())
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [session])

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Поддержка</h1>
          <p className="text-sm text-subtle mt-0.5">Создайте тикет — администратор ответит в ближайшее время</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors">
          <Plus size={15} />
          Новый тикет
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[2fr_1fr] lg:gap-6 lg:items-start">
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="animate-spin text-subtle" size={24} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-purple-400" />
              </div>
              <div className="text-center">
                <h3 className="text-ink font-semibold text-lg">Тикетов пока нет</h3>
                <p className="text-subtle mt-1">Если у вас возникли вопросы — создайте тикет</p>
              </div>
              <button onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors">
                <Plus size={15} />
                Создать тикет
              </button>
            </div>
          ) : (
            <div className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
              {tickets.map(t => {
                const s = STATUS_META[t.status] ?? STATUS_META.open
                return (
                  <Link key={t.id} to={`/support/${t.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-panel/50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                        <span className="text-sm font-medium text-ink truncate">{t.subject}</span>
                      </div>
                      {t.last_message ? (
                        <p className="text-xs text-subtle truncate">
                          {t.last_message.sender_nickname ?? 'Администратор'}: {t.last_message.content}
                        </p>
                      ) : (
                        <p className="text-xs text-subtle">{timeAgo(t.created_at)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.last_message && (
                        <span className="text-xs text-subtle">{timeAgo(t.last_message.created_at)}</span>
                      )}
                      <ChevronRight size={16} className="text-subtle group-hover:text-ink transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 lg:mt-0 bg-surface border border-line rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <LifeBuoy size={18} className="text-accent" />
            <h2 className="font-semibold text-ink">Как это работает</h2>
          </div>
          <ol className="text-sm text-subtle leading-relaxed space-y-2 list-decimal list-inside">
            <li>Создайте тикет с описанием проблемы</li>
            <li>Администратор ответит в течение 24 часов</li>
            <li>Общайтесь в чате до решения вопроса</li>
          </ol>
          <p className="text-xs text-subtle mt-4 pt-4 border-t border-line">
            Среднее время ответа: обычно до 2 часов
          </p>
        </div>
      </div>

      <CreateModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={fetchTickets} />
    </div>
  )
}
