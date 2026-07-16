import { useEffect, useState } from 'react'
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'

const API = import.meta.env.VITE_BACKEND_URL as string

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open:                   { label: 'Открыт',         cls: 'bg-accent/10 text-accent'   },
  pending_payment:        { label: 'Ожидает оплаты', cls: 'bg-warning/10 text-warning' },
  in_progress:            { label: 'В работе',       cls: 'bg-lav/10 text-lav' },
  awaiting_topup:         { label: 'Нужна доплата',  cls: 'bg-gold/10 text-gold' },
  awaiting_confirmation:  { label: 'Ожидает подтв.', cls: 'bg-mint/10 text-mint' },
  completed:              { label: 'Завершён',        cls: 'bg-success/10 text-success'  },
  disputed:               { label: 'Спор',            cls: 'bg-error/10 text-error'      },
  cancelled:              { label: 'Отменён',         cls: 'bg-panel text-subtle'    },
}

const ALL_STATUSES = Object.keys(STATUS_LABELS)

interface Order {
  id: string
  title: string
  order_type: string
  status: string
  base_amount: number
  final_amount: number | null
  created_at: string
  customer: { id: string; nickname: string | null } | null
  executor:  { id: string; nickname: string | null } | null
}

const INPUT = 'px-3 py-1.5 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-accent transition-colors'

export default function AdminOrders() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [orders, setOrders] = useState<Order[]>([])
  const [total,  setTotal]  = useState(0)
  const [loading, setLoading] = useState(true)

  const [page,   setPage]   = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const LIMIT = 50

  async function fetchOrders(p = page) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const res = await fetch(`${API}/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setOrders(data.orders ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch {
      toast('Не удалось загрузить список заказов', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders(1) }, [token])

  const totalPages = Math.ceil(total / LIMIT)

  function applyFilters() { fetchOrders(1) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-ink">Все заказы</h1>
        <span className="text-sm text-subtle">Всего: {total}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <select value={status} onChange={e => setStatus(e.target.value)} className={INPUT}>
          <option value="">Все статусы</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
        </select>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input type="text" placeholder="Поиск по названию / нику..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            className={INPUT + ' pl-7 w-56'} />
        </div>
        <button onClick={applyFilters}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
          Найти
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-subtle" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-subtle text-sm">Нет заказов</div>
      ) : (
        <>
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-panel border-b border-line">
                <tr>
                  <th className="py-2 px-3 text-left text-subtle font-medium">Заказ</th>
                  <th className="py-2 px-3 text-left text-subtle font-medium">Заказчик</th>
                  <th className="py-2 px-3 text-left text-subtle font-medium">Исполнитель</th>
                  <th className="py-2 px-3 text-right text-subtle font-medium">Сумма</th>
                  <th className="py-2 px-3 text-center text-subtle font-medium">Статус</th>
                  <th className="py-2 px-3 text-left text-subtle font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const s = STATUS_LABELS[o.status] ?? { label: o.status, cls: 'bg-panel text-ink' }
                  return (
                    <tr key={o.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                      <td className="py-2 px-3">
                        <p className="text-ink font-medium truncate max-w-[200px]">{o.title}</p>
                        {o.order_type === 'listing' && (
                          <span className="text-xs text-subtle">Объявление</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-subtle">{o.customer?.nickname ?? '—'}</td>
                      <td className="py-2 px-3 text-subtle">{o.executor?.nickname ?? <span className="italic">нет</span>}</td>
                      <td className="py-2 px-3 text-right font-medium text-ink">
                        {(o.final_amount ?? o.base_amount).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="py-2 px-3 text-subtle text-xs">{timeAgo(o.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-subtle">Страница {page} из {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => fetchOrders(page - 1)} disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-line hover:bg-panel disabled:opacity-40 transition-colors">
                  <ChevronLeft size={16} className="text-ink" />
                </button>
                <button onClick={() => fetchOrders(page + 1)} disabled={page >= totalPages}
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
