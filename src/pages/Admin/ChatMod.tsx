import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'

const API = import.meta.env.VITE_BACKEND_URL as string

interface FlaggedMessage {
  id: string
  content: string
  is_contact_info: boolean
  ai_suspected: boolean
  moderation_reviewed: boolean
  created_at: string
  flag_source: 'regex' | 'ai'
  sender: { id: string; nickname: string | null } | null
  conversations: {
    id: string
    order_id: string | null
    orders: { id: string; title: string; order_type: string } | null
  } | null
}

export default function AdminChatMod() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [messages, setMessages] = useState<FlaggedMessage[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showAll,  setShowAll]  = useState(false)
  const [acting,   setActing]   = useState<Record<string, boolean>>({})

  async function fetchMessages() {
    setLoading(true)
    try {
      const reviewed = showAll ? '' : '&reviewed=false'
      const res = await fetch(`${API}/admin/chat-moderation?${reviewed}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setMessages(await res.json())
    } catch {
      toast('Не удалось загрузить сообщения', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMessages() }, [token, showAll])

  async function markReviewed(msgId: string) {
    setActing(a => ({ ...a, [msgId]: true }))
    try {
      const res = await fetch(`${API}/admin/chat-moderation/${msgId}/review`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast('Отмечено как проверено', 'success')
      setMessages(msgs => msgs.map(m => m.id === msgId ? { ...m, moderation_reviewed: true } : m))
    } catch {
      toast('Ошибка при обновлении', 'error')
    } finally {
      setActing(a => ({ ...a, [msgId]: false }))
    }
  }

  const pending = messages.filter(m => !m.moderation_reviewed).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-ink">Модерация чатов</h1>
          {!showAll && pending > 0 && (
            <p className="text-sm text-subtle mt-0.5">Ожидают проверки: <span className="text-error font-medium">{pending}</span></p>
          )}
        </div>
        <button onClick={() => setShowAll(v => !v)}
          className="text-sm px-3 py-1.5 border border-line rounded-lg hover:bg-panel text-ink transition-colors">
          {showAll ? 'Только непроверенные' : 'Показать все'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-subtle" />
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-12 text-center">
          <ShieldAlert size={32} className="mx-auto text-subtle mb-3" />
          <p className="text-ink font-medium">Подозрительных сообщений нет</p>
          <p className="text-sm text-subtle mt-1">Все сообщения прошли проверку</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-line divide-y divide-line overflow-hidden">
          {messages.map(m => {
            const orderTitle = m.conversations?.orders?.title ?? 'Тикет поддержки'
            return (
              <div key={m.id} className={`p-4 ${m.moderation_reviewed ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.flag_source === 'regex' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
                      }`}>
                        {m.flag_source === 'regex' ? 'Regex-флаг' : 'AI-флаг'}
                      </span>
                      <span className="text-xs text-subtle">{m.sender?.nickname ?? 'Система'}</span>
                      <span className="text-xs text-subtle">в «{orderTitle}»</span>
                      <span className="text-xs text-subtle">{timeAgo(m.created_at)}</span>
                    </div>
                    <p className="text-sm text-ink bg-panel rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
                      {m.content}
                    </p>
                    {m.is_contact_info && (
                      <p className="text-xs text-warning mt-1">⚠ Обнаружены контактные данные</p>
                    )}
                    {m.ai_suspected && (
                      <p className="text-xs text-warning mt-1">🤖 AI подозревает нарушение</p>
                    )}
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {m.moderation_reviewed ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 size={14} /> Проверено
                      </span>
                    ) : (
                      <button
                        onClick={() => markReviewed(m.id)}
                        disabled={acting[m.id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-success text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {acting[m.id] ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Проверено
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
