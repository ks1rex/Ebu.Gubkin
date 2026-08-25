import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Loader2 } from 'lucide-react'
import { apiCall } from '../lib/api'
import { timeAgo } from '../lib/timeAgo'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export default function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchList() {
    setLoading(true)
    try {
      setItems(await apiCall('GET', '/notifications?limit=50'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [])

  async function openNotification(n: Notification) {
    if (!n.is_read) {
      setItems(list => list.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      apiCall('PATCH', `/notifications/${n.id}/read`).catch(() => {})
    }
    if (n.link) navigate(n.link)
  }

  async function markAllRead() {
    setItems(list => list.map(x => ({ ...x, is_read: true })))
    apiCall('PATCH', '/notifications/read-all').catch(() => {})
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Уведомления</h1>
          <p className="text-sm text-subtle mt-0.5">Последние 50 — заказы, споры, кошелёк, поддержка</p>
        </div>
        {!loading && items.some(n => !n.is_read) && (
          <button
            onClick={markAllRead}
            className="text-sm text-accent hover:underline shrink-0"
          >
            Прочитать всё
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-subtle" size={24} />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
            <Bell className="w-10 h-10 text-purple-400" />
          </div>
          <div className="text-center">
            <h3 className="text-ink font-semibold text-lg">Уведомлений пока нет</h3>
            <p className="text-subtle mt-1">Здесь появятся отклики на заказы, споры, операции кошелька и ответы поддержки</p>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
          {items.map(n => (
            <button
              key={n.id}
              onClick={() => openNotification(n)}
              className={`w-full text-left flex gap-3 px-5 py-4 hover:bg-panel/50 transition-colors ${n.is_read ? '' : 'bg-accent/[.05]'}`}
            >
              {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />}
              <div className={n.is_read ? 'pl-3.5 flex-1 min-w-0' : 'flex-1 min-w-0'}>
                <div className="text-sm text-ink font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-subtle mt-0.5">{n.body}</div>}
                <div className="text-[11px] text-subtle mt-1">{timeAgo(n.created_at)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
