import { useEffect, useState } from 'react'
import { Loader2, Search, ChevronLeft, ChevronRight, MessageSquare, LifeBuoy, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'
import ChatWindow from '../../components/ChatWindow'

const API = import.meta.env.VITE_BACKEND_URL as string

interface Participant {
  user_id: string
  profiles: { id: string; nickname: string | null } | null
}

interface Conversation {
  id: string
  type: 'order_chat' | 'support_ticket'
  created_at: string
  order_id: string | null
  support_ticket_id: string | null
  orders: { id: string; title: string } | null
  support_tickets: { id: string; subject: string } | null
  conversation_participants: Participant[]
  last_message?: { content: string; created_at: string; sender: { nickname: string | null } | null } | null
  message_count?: number
}

const INPUT = 'px-3 py-1.5 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-accent transition-colors'

export default function AdminConversations() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [convs, setConvs] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Conversation | null>(null)

  const [page,   setPage]   = useState(1)
  const [search, setSearch] = useState('')
  const [type,   setType]   = useState('')
  const LIMIT = 50

  async function fetchConvs(p = page) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (search) params.set('search', search)
      if (type)   params.set('type',   type)
      const res = await fetch(`${API}/admin/conversations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setConvs(data.conversations ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch {
      toast('Не удалось загрузить список чатов', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConvs(1) }, [token])

  const totalPages = Math.ceil(total / LIMIT)

  if (selected) {
    const isOrder = selected.type === 'order_chat'
    const title = isOrder ? selected.orders?.title : selected.support_tickets?.subject
    const nicks = (selected.conversation_participants ?? [])
      .map(p => p.profiles?.nickname)
      .filter(Boolean)
      .join(', ')

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setSelected(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 6, padding: 0 }}
          >
            <ArrowLeft size={14} /> Все чаты
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>
              {title ?? 'Без названия'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOrder ? 'bg-accent-subtle text-accent' : 'bg-panel text-subtle'}`}>
              {isOrder ? 'Заказ' : 'Поддержка'}
            </span>
          </div>
          {nicks && <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>Участники: {nicks}</p>}
        </div>

        <ChatWindow conversationId={selected.id} adminMode />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-ink">Все чаты</h1>
        <span className="text-sm text-subtle">Всего: {total}</span>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <select value={type} onChange={e => setType(e.target.value)} className={INPUT}>
          <option value="">Все типы</option>
          <option value="order_chat">Чат по заказу</option>
          <option value="support_ticket">Тикет поддержки</option>
        </select>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input type="text" placeholder="Ник / название заказа..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchConvs(1)}
            className={INPUT + ' pl-7 w-56'} />
        </div>
        <button onClick={() => fetchConvs(1)}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
          Найти
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-subtle" />
        </div>
      ) : convs.length === 0 ? (
        <div className="text-center py-16 text-subtle text-sm">Нет чатов</div>
      ) : (
        <>
          <div className="bg-surface rounded-xl border border-line divide-y divide-line overflow-hidden">
            {convs.map(c => {
              const isOrder   = c.type === 'order_chat'
              const title     = isOrder ? c.orders?.title : c.support_tickets?.subject
              const nicks     = (c.conversation_participants ?? [])
                .map(p => p.profiles?.nickname)
                .filter(Boolean)
                .join(', ')

              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-panel/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-panel flex items-center justify-center shrink-0">
                    {isOrder
                      ? <MessageSquare size={15} className="text-accent" />
                      : <LifeBuoy size={15} className="text-subtle" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{title ?? 'Без названия'}</p>
                    <p className="text-xs text-subtle truncate">{nicks || 'Участники не найдены'}</p>
                    {c.last_message && (
                      <p className="text-xs text-subtle mt-0.5 truncate">
                        <span className="text-ink/70">{c.last_message.sender?.nickname ?? 'Система'}:</span>{' '}
                        {c.last_message.content}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isOrder ? 'bg-accent-subtle text-accent' : 'bg-panel text-subtle'}`}>
                      {isOrder ? 'Заказ' : 'Поддержка'}
                    </span>
                    <p className="text-xs text-subtle mt-1">{timeAgo(c.created_at)}</p>
                    {c.message_count != null && (
                      <p className="text-xs text-subtle">{c.message_count} сообщ.</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-subtle">Страница {page} из {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => fetchConvs(page - 1)} disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-line hover:bg-panel disabled:opacity-40 transition-colors">
                  <ChevronLeft size={16} className="text-ink" />
                </button>
                <button onClick={() => fetchConvs(page + 1)} disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-line hover:bg-panel disabled:opacity-40 transition-colors">
                  <ChevronRight size={16} className="text-ink" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
