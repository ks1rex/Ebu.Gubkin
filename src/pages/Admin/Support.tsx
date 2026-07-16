import { useEffect, useState } from 'react'
import { Loader2, LifeBuoy, CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'
import ChatWindow from '../../components/ChatWindow'
import { apiCall } from '../../lib/api'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  open:     { label: 'Открыт',   cls: 'bg-accent-subtle text-accent' },
  answered: { label: 'Ответили', cls: 'bg-success/10 text-success'  },
  closed:   { label: 'Закрыт',   cls: 'bg-panel text-subtle'        },
}

interface SupportConv {
  id: string
  support_ticket_id: string
  created_at: string
  ticket_subject: string | null
  status: string
  participants: Array<{ id: string; nickname: string | null }>
  last_message?: { content: string; created_at: string; sender_nickname: string | null } | null
}

export default function AdminSupport() {
  const { session } = useAuth()
  const toast = useToast()

  const [list, setList] = useState<SupportConv[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SupportConv | null>(null)
  const [closing, setClosing] = useState(false)

  async function fetchList() {
    setLoading(true)
    try {
      const data = await apiCall('GET', '/admin/conversations?type=support_ticket&limit=100')
      setList(data.conversations ?? [])
    } catch {
      toast('Не удалось загрузить тикеты', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (session?.access_token) fetchList() }, [session])

  async function closeTicket() {
    if (!selected?.support_ticket_id) return
    setClosing(true)
    try {
      await apiCall('PATCH', `/admin/support/tickets/${selected.support_ticket_id}/close`)
      toast('Тикет закрыт', 'success')
      const patch = (c: SupportConv) =>
        c.id === selected.id ? { ...c, status: 'closed' } : c
      setList(prev => prev.map(patch))
      setSelected(prev => (prev ? { ...prev, status: 'closed' } : prev))
    } catch {
      toast('Ошибка при закрытии тикета', 'error')
    } finally {
      setClosing(false)
    }
  }

  if (selected) {
    const ticketStatus = selected.status ?? 'open'
    const isClosed = ticketStatus === 'closed'
    const s = STATUS_META[ticketStatus] ?? STATUS_META.open
    const nicks = (selected.participants ?? [])
      .map(p => p.nickname)
      .filter(Boolean)
      .join(', ')

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-500"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 6, padding: 0 }}
            >
              <ArrowLeft size={14} /> Все тикеты
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="text-slate-200" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {selected.ticket_subject ?? 'Тикет поддержки'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
            </div>
            {nicks && <p className="text-slate-500" style={{ fontSize: '0.8rem', marginTop: 2 }}>Участники: {nicks}</p>}
          </div>
          {!isClosed && (
            <button
              onClick={closeTicket}
              disabled={closing}
              className="text-slate-400"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', background: '#1e2a3a', border: '1px solid #2d3f55',
                borderRadius: 8, cursor: closing ? 'default' : 'pointer',
                fontSize: '0.85rem', opacity: closing ? 0.6 : 1,
              }}
            >
              <CheckCircle size={15} />
              {closing ? 'Закрываем...' : 'Закрыть тикет'}
            </button>
          )}
        </div>

        <ChatWindow conversationId={selected.id} readOnly={isClosed} adminMode />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Тикеты поддержки</h1>
        <span className="text-sm text-subtle">Всего: {list.length}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-subtle" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-subtle text-sm">Тикетов нет</div>
      ) : (
        <div className="bg-surface rounded-xl border border-line divide-y divide-line overflow-hidden">
          {list.map(c => {
            const ticketStatus = c.status ?? 'open'
            const sm = STATUS_META[ticketStatus] ?? STATUS_META.open
            const nicks = (c.participants ?? [])
              .map(p => p.nickname)
              .filter(Boolean)
              .join(', ')

            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-panel/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-panel flex items-center justify-center shrink-0">
                  <LifeBuoy size={15} className="text-subtle" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {c.ticket_subject ?? 'Тикет поддержки'}
                  </p>
                  <p className="text-xs text-subtle truncate">{nicks || 'Пользователь не найден'}</p>
                  {c.last_message && (
                    <p className="text-xs text-subtle mt-0.5 truncate">
                      <span className="text-ink/70">{c.last_message.sender_nickname ?? 'Пользователь'}:</span>{' '}
                      {c.last_message.content}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sm.cls}`}>{sm.label}</span>
                  <p className="text-xs text-subtle mt-1">{timeAgo(c.created_at)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
