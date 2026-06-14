import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Loader2, BookOpen, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

interface Order {
  id: string
  title: string
  description: string | null
  subject: string | null
  base_amount: number
  status: string
  customer_id: string
  created_at: string
  already_applied?: boolean
  customer?: { nickname: string | null }
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open:                  { label: 'Открыт',       cls: 'bg-success/10 text-success border-success/20'   },
  in_progress:           { label: 'В работе',      cls: 'bg-accent/10 text-accent-muted border-accent/20'  },
  awaiting_confirmation: { label: 'На проверке',   cls: 'bg-warning/10 text-warning border-warning/20'   },
  completed:             { label: 'Завершён',      cls: 'bg-panel text-subtle border-line'               },
  disputed:              { label: 'Спор',          cls: 'bg-error/10 text-error border-error/20'         },
  cancelled:             { label: 'Отменён',       cls: 'bg-panel text-subtle border-line'               },
}

const TABS = [
  { key: 'feed',    label: 'Лента заказов', auth: false },
  { key: 'mine',    label: 'Мои заказы',   auth: true  },
  { key: 'applied', label: 'Мои отклики', auth: true  },
] as const

type Tab = typeof TABS[number]['key']

function EmptyState({ tab, search }: { tab: Tab; search: string }) {
  const msgs: Record<Tab, { title: string; sub: string }> = {
    feed:    search
      ? { title: 'Ничего не найдено',          sub: 'Попробуйте изменить запрос' }
      : { title: 'Открытых заказов пока нет',  sub: 'Загляните позже — скоро появятся новые задания' },
    mine:    { title: 'Вы ещё не создавали заказов', sub: 'Нажмите «Создать заказ», чтобы разместить задание' },
    applied: { title: 'Откликов пока нет',           sub: 'Найдите заказ в ленте и нажмите «Откликнуться»' },
  }
  const { title, sub } = msgs[tab]
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <BookOpen size={36} className="text-subtle mb-3 opacity-60" />
      <p className="text-ink font-medium">{title}</p>
      <p className="text-subtle text-sm mt-1 max-w-xs">{sub}</p>
    </div>
  )
}

function OrderCard({ order, tab, userId, onApply }: {
  order: Order
  tab: Tab
  userId: string | undefined
  onApply: (id: string) => Promise<void>
}) {
  const [applying, setApplying] = useState(false)
  const isOwner = order.customer_id === userId
  const statusMeta = STATUS_LABELS[order.status]

  async function handleApply() {
    setApplying(true)
    await onApply(order.id)
    setApplying(false)
  }

  return (
    <div className="bg-surface border border-line rounded-xl p-5 flex flex-col gap-3 hover:border-accent/30 transition-colors">
      <div>
        <h3 className="font-semibold text-ink text-sm leading-snug line-clamp-2">{order.title}</h3>
        {order.description && (
          <p className="text-xs text-subtle mt-1 line-clamp-2">{order.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {order.subject && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-panel text-subtle border border-line">
            {order.subject}
          </span>
        )}
        {statusMeta && order.status !== 'open' && (
          <span className={`text-xs px-2 py-0.5 rounded-md border ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-line flex items-end justify-between gap-2">
        <div>
          <p className="text-accent-muted font-bold text-base leading-none">
            {order.base_amount.toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-xs text-subtle mt-1">
            {order.customer?.nickname ?? 'аноним'} · {new Date(order.created_at).toLocaleDateString('ru-RU')}
          </p>
        </div>

        {isOwner ? (
          <span className="text-xs px-2.5 py-1 rounded-md bg-panel text-subtle border border-line shrink-0">
            Мой заказ
          </span>
        ) : order.already_applied ? (
          <span className="text-xs px-2.5 py-1 rounded-md bg-success/10 text-success border border-success/20 shrink-0">
            Отклик подан
          </span>
        ) : tab === 'feed' && userId ? (
          <button
            onClick={handleApply}
            disabled={applying}
            className="text-xs px-2.5 py-1 rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors shrink-0"
          >
            {applying ? '...' : 'Откликнуться'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function Market() {
  const { user, session } = useAuth()
  const toast = useToast()

  const [tab,     setTab]     = useState<Tab>('feed')
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const backendUrl = import.meta.env.VITE_BACKEND_URL

  const authHeader: Record<string, string> = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}

  const load = useCallback(async (currentTab: Tab, q: string) => {
    if (!backendUrl) { setLoading(false); return }
    setLoading(true)
    try {
      let url = `${backendUrl}/orders`
      if (currentTab === 'mine')    url = `${backendUrl}/orders/mine`
      if (currentTab === 'applied') url = `${backendUrl}/orders/applied`
      if (currentTab === 'feed' && q) url += `?search=${encodeURIComponent(q)}`

      const res = await fetch(url, { headers: authHeader })
      const data = await res.json() as Order[] | { error?: string }
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [backendUrl, session?.access_token])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'feed') {
      const t = setTimeout(() => load(tab, search), search ? 350 : 0)
      return () => clearTimeout(t)
    }
    load(tab, '')
  }, [tab, search, load])

  async function handleApply(orderId: string) {
    if (!session) { toast('Войдите в аккаунт', 'error'); return }
    if (!backendUrl) { toast('VITE_BACKEND_URL не задан', 'error'); return }
    try {
      const res = await fetch(`${backendUrl}/orders/${orderId}/apply`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Готов взяться за ваш заказ.' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Ошибка (${res.status})`)
      }
      toast('Отклик отправлен', 'success')
      load(tab, search)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error')
    }
  }

  function switchTab(t: Tab) {
    setTab(t)
    setSearch('')
  }

  return (
    <div className="space-y-5">

      {/* ── Заголовок ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText size={22} className="text-accent-muted" />
          <h1 className="text-2xl font-bold text-ink">Биржа</h1>
        </div>
        {user && (
          <button
            onClick={() => toast('Создание заказов — скоро', 'info')}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors shrink-0"
          >
            <Plus size={16} />
            Создать заказ
          </button>
        )}
      </div>

      {/* ── Вкладки ── */}
      <div className="flex gap-0.5 border-b border-line">
        {TABS.filter(t => !t.auth || user).map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-accent text-accent-muted'
                : 'border-transparent text-subtle hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Поиск ── */}
      {tab === 'feed' && (
        <div className="relative max-w-lg">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по заголовку, предмету..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-line bg-surface text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
        </div>
      )}

      {/* ── Контент ── */}
      {!backendUrl ? (
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
          VITE_BACKEND_URL не задан — добавьте в .env.local
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="text-subtle animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState tab={tab} search={search} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              tab={tab}
              userId={user?.id}
              onApply={handleApply}
            />
          ))}
        </div>
      )}
    </div>
  )
}
