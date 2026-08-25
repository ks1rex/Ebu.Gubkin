import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
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

const POLL_MS = 25000

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; right: number; width: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  async function fetchCount() {
    try {
      const { count } = await apiCall('GET', '/notifications/unread-count')
      setCount(count)
    } catch { /* тихо — колокольчик не критичен для основного функционала */ }
  }

  async function fetchList() {
    setLoading(true)
    try {
      setItems(await apiCall('GET', '/notifications?limit=20'))
    } catch { /* см. выше */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCount()
    const t = setInterval(fetchCount, POLL_MS)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (open) fetchList()
  }, [open])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  async function openNotification(n: Notification) {
    setOpen(false)
    if (!n.is_read) {
      setItems(list => list.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      setCount(c => Math.max(0, c - 1))
      apiCall('PATCH', `/notifications/${n.id}/read`).catch(() => {})
    }
    if (n.link) navigate(n.link)
  }

  async function markAllRead() {
    setItems(list => list.map(x => ({ ...x, is_read: true })))
    setCount(0)
    apiCall('PATCH', '/notifications/read-all').catch(() => {})
  }

  // Плашка позиционируется fixed по реальным координатам кнопки, а не
  // просто "right-0" от обёртки — на телефоне колокольчик стоит близко к
  // правому краю среди других иконок, и якорь от его правого края уводил
  // фикс.ширину панели (320px) за левый край экрана.
  function toggle() {
    if (!open && rootRef.current) {
      const r = rootRef.current.getBoundingClientRect()
      const margin = 20
      const width = Math.min(320, window.innerWidth - margin * 2)
      // right — отступ от правого края экрана. Выравниваем по кнопке, но
      // зажимаем в [margin, innerWidth - margin - width]: без верхней
      // границы панель шириной 320px могла уехать за левый край, если
      // кнопка стоит недостаточно далеко от правого края экрана.
      const raw = window.innerWidth - r.right
      const right = Math.max(margin, Math.min(raw, window.innerWidth - margin - width))
      setPanelPos({ top: r.bottom + 8, right, width })
    }
    setOpen(v => !v)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={toggle}
        title="Уведомления"
        className="relative flex items-center justify-center w-10 h-10 rounded-[14px] text-subtle hover:text-ink hover:bg-white/[.06] transition-colors"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-pink text-[10px] font-bold text-[#2a0a20] flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && panelPos && (
        <div
          style={{ top: panelPos.top, right: panelPos.right, width: panelPos.width }}
          className="fixed max-h-[70vh] overflow-y-auto rounded-2xl bg-canvas/90 border border-line backdrop-blur-glass shadow-[0_18px_50px_rgba(20,8,50,.45)] z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-line sticky top-0 bg-canvas/90">
            <span className="text-sm font-semibold text-ink">Уведомления</span>
            {items.some(n => !n.is_read) && (
              <button onClick={markAllRead} className="text-xs text-accent hover:underline">
                Прочитать всё
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-subtle">Загрузка…</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-subtle">Пока пусто</div>
          ) : (
            <div className="divide-y divide-line/60">
              {items.map(n => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/[.04] transition-colors flex gap-2 ${n.is_read ? '' : 'bg-accent/[.05]'}`}
                >
                  {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />}
                  <div className={n.is_read ? 'pl-3.5' : ''}>
                    <div className="text-sm text-ink font-medium leading-snug">{n.title}</div>
                    {n.body && <div className="text-xs text-subtle mt-0.5 leading-snug">{n.body}</div>}
                    <div className="text-[11px] text-subtle mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
