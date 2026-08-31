import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, ShieldAlert, UserX, MessageSquareWarning, Tag, Check, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'
import { apiCall } from '../../lib/api'

interface FlaggedMessage {
  id: string
  content: string
  is_contact_info: boolean
  ai_suspected: boolean
  ai_reason: string | null
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

const DEFAULT_WARNING = '⚠️ Сообщение от администрации: пожалуйста, ведите все переговоры и передачу данных по сделке через платформу — так сделка защищена и при споре есть история переписки.'

interface CategoryRequest {
  id: string
  name: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  created_at: string
  requester: { id: string; nickname: string | null; profile_slug: string | null } | null
  order: { id: string; title: string } | null
  listing: { id: string; title: string } | null
}

interface MarketCategory { id: string; name: string }

function CategoryRequestsSection() {
  const toast = useToast()
  const [requests, setRequests] = useState<CategoryRequest[]>([])
  const [categories, setCategories] = useState<MarketCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<Record<string, boolean>>({})
  const [reassignTo, setReassignTo] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    try {
      const [reqs, cats] = await Promise.all([
        apiCall('GET', '/admin/market-categories/requests?status=pending'),
        apiCall('GET', '/admin/market-categories'),
      ])
      setRequests(reqs ?? [])
      setCategories(cats ?? [])
    } catch {
      toast('Не удалось загрузить заявки на категории', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function approve(id: string) {
    setActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('POST', `/admin/market-categories/requests/${id}/approve`)
      toast('Категория принята', 'success')
      setRequests(rs => rs.filter(r => r.id !== id))
    } catch (e: any) {
      toast(e?.data?.error ?? 'Не удалось принять', 'error')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  async function reject(id: string) {
    const reassign_to_id = reassignTo[id]
    if (!reassign_to_id) { toast('Выберите категорию, на которую перенести заказ/услугу', 'error'); return }
    setActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('POST', `/admin/market-categories/requests/${id}/reject`, { reassign_to_id })
      toast('Категория отклонена', 'success')
      setRequests(rs => rs.filter(r => r.id !== id))
    } catch (e: any) {
      toast(e?.data?.error ?? 'Не удалось отклонить', 'error')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-subtle" /></div>
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
        <Tag size={18} /> Заявки на новые категории
        {requests.length > 0 && <span className="text-sm font-normal text-error">({requests.length})</span>}
      </h2>
      {requests.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-subtle">Заявок нет</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-line divide-y divide-line overflow-hidden">
          {requests.map(r => (
            <div key={r.id} className="p-4 flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-medium text-ink">«{r.name}»</div>
                <div className="text-xs text-subtle mt-0.5">
                  {r.requester?.nickname ?? 'Пользователь'} · {r.order ? `заказ «${r.order.title}»` : r.listing ? `услуга «${r.listing.title}»` : ''} · {timeAgo(r.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={() => approve(r.id)}
                  disabled={acting[r.id]}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-success text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {acting[r.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Принять
                </button>
                <select
                  value={reassignTo[r.id] ?? ''}
                  onChange={e => setReassignTo(v => ({ ...v, [r.id]: e.target.value }))}
                  className="text-xs border border-line rounded-lg px-2 py-1.5 bg-canvas text-ink"
                >
                  <option value="">Перенести на...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  onClick={() => reject(r.id)}
                  disabled={acting[r.id] || !reassignTo[r.id]}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors disabled:opacity-50"
                >
                  {acting[r.id] ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminChatMod() {
  const { session } = useAuth()
  const toast = useToast()

  const [messages, setMessages] = useState<FlaggedMessage[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showAll,  setShowAll]  = useState(false)
  const [acting,   setActing]   = useState<Record<string, boolean>>({})

  async function fetchMessages() {
    setLoading(true)
    try {
      const reviewed = showAll ? '' : '&reviewed=false'
      setMessages(await apiCall('GET', `/admin/chat-moderation?${reviewed}`))
    } catch {
      toast('Не удалось загрузить сообщения', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMessages() }, [session, showAll])

  async function markReviewed(msgId: string) {
    setActing(a => ({ ...a, [msgId]: true }))
    try {
      await apiCall('PATCH', `/admin/chat-moderation/${msgId}/review`)
      toast('Отмечено как проверено', 'success')
      setMessages(msgs => msgs.map(m => m.id === msgId ? { ...m, moderation_reviewed: true } : m))
    } catch {
      toast('Ошибка при обновлении', 'error')
    } finally {
      setActing(a => ({ ...a, [msgId]: false }))
    }
  }

  async function banSender(m: FlaggedMessage) {
    if (!m.sender) return
    if (!confirm(`Заблокировать пользователя «${m.sender.nickname ?? 'без ника'}»?`)) return
    setActing(a => ({ ...a, [m.id]: true }))
    try {
      await apiCall('PATCH', `/admin/users/${m.sender.id}`, { is_banned: true })
      toast('Пользователь заблокирован', 'success')
    } catch (e: any) {
      toast(e?.data?.error ?? 'Не удалось заблокировать', 'error')
    } finally {
      setActing(a => ({ ...a, [m.id]: false }))
    }
  }

  async function warnInChat(m: FlaggedMessage) {
    if (!m.conversations) return
    const text = prompt('Текст предупреждения в чат:', DEFAULT_WARNING)
    if (!text?.trim()) return
    setActing(a => ({ ...a, [m.id]: true }))
    try {
      await apiCall('POST', `/admin/conversations/${m.conversations.id}/messages`, { content: text.trim() })
      toast('Предупреждение отправлено', 'success')
    } catch (e: any) {
      toast(e?.data?.error ?? 'Не удалось отправить', 'error')
    } finally {
      setActing(a => ({ ...a, [m.id]: false }))
    }
  }

  const pending = messages.filter(m => !m.moderation_reviewed).length

  return (
    <div className="space-y-8">
      <CategoryRequestsSection />

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
                      <p className="text-xs text-warning mt-1">
                        🤖 AI подозревает нарушение{m.ai_reason ? `: ${m.ai_reason}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 pt-0.5 flex flex-col items-end gap-1.5">
                    {m.moderation_reviewed ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 size={14} /> Проверено
                      </span>
                    ) : (
                      <button
                        onClick={() => markReviewed(m.id)}
                        disabled={acting[m.id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-success text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                      >
                        {acting[m.id] ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Проверено
                      </button>
                    )}
                    {m.conversations && (
                      <button
                        onClick={() => warnInChat(m)}
                        disabled={acting[m.id]}
                        title="Отправить предупреждение в этот чат от имени администрации"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-line text-ink rounded-lg hover:bg-panel transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        <MessageSquareWarning size={12} />
                        Предупредить
                      </button>
                    )}
                    {m.sender && (
                      <button
                        onClick={() => banSender(m)}
                        disabled={acting[m.id]}
                        title="Заблокировать отправителя"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        <UserX size={12} />
                        Забанить
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
