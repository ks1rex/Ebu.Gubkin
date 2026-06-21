import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/format'
import { GlassCard, Button, Avatar, Stars, gradientFor } from '../components/glass'

const CAT_COLORS = ['#f5a3e8', '#5eead4', '#c4b5fd', '#7dd3fc', '#fbbf24']
function catColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return CAT_COLORS[h % CAT_COLORS.length]
}

interface Order {
  id: string
  title: string
  subject: string
  base_amount: number
  created_at: string
  customer: { nickname: string | null; avatar_url?: string | null } | null
  customer_id: string
  already_applied?: boolean
}

interface Listing {
  id: string
  title: string
  price: number
  deposit_amount: number | null
  owner: { nickname: string | null; rating_as_executor?: number | string | null } | null
}

export default function Market() {
  const { user } = useAuth()
  const [mode, setMode] = useState<'orders' | 'services'>('orders')
  const [search, setSearch] = useState('')

  const [orders, setOrders]     = useState<Order[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading]   = useState(true)
  const [pendingReviews, setPendingReviews] = useState<any[]>([])

  const loadOrders = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : ''
      const data = await apiCall('GET', `/orders${params}`)
      setOrders(Array.isArray(data) ? data : [])
    } catch { setOrders([]) } finally { setLoading(false) }
  }, [])

  const loadListings = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : ''
      const data = await apiCall('GET', `/listings${params}`)
      setListings(Array.isArray(data) ? data : [])
    } catch { setListings([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (mode === 'orders') loadOrders(search)
      else loadListings(search)
    }, 350)
    return () => clearTimeout(t)
  }, [search, mode, loadOrders, loadListings])

  useEffect(() => {
    if (!user) return
    apiCall('GET', '/orders/pending-reviews')
      .then(data => setPendingReviews(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [user])

  return (
    <div>
      {/* Hero */}
      <GlassCard className="rounded-[26px] px-8 py-7 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="text-[13px] tracking-wide text-lav font-semibold uppercase">Биржа · фриланс между студентами</div>
          <h1 className="text-[34px] leading-[1.06] tracking-[-1px] font-bold mt-2.5 text-ink">
            Найди исполнителя или <em className="not-italic bg-gradient-to-r from-mint to-pink bg-clip-text text-transparent">заработай сам</em>
          </h1>
          <p className="mt-2.5 text-sm text-subtle max-w-[440px] leading-relaxed">
            Заказы и услуги от студентов Губки — дизайн, код, курсовые, чертежи. Оплата рублями, безопасная сделка.
          </p>
          <div className="flex gap-6 mt-5">
            <div><b className="block text-2xl font-bold text-ink">{orders.length || (mode === 'orders' ? 0 : '—')}</b><span className="text-xs text-subtle">{mode === 'orders' ? 'заказов в выдаче' : ''}</span></div>
            <div><b className="block text-2xl font-bold text-mint">{listings.length || (mode === 'services' ? 0 : '—')}</b><span className="text-xs text-subtle">{mode === 'services' ? 'услуг в выдаче' : ''}</span></div>
          </div>
        </div>
        <Button to="/market/orders/new" variant="pri">＋ Разместить заказ</Button>
      </GlassCard>

      {/* Pending reviews */}
      {pendingReviews.length > 0 && (
        <GlassCard className="rounded-[20px] px-5 py-4 mb-4 !border-l-4 !border-l-gold">
          <div className="flex items-center gap-2 text-gold font-semibold mb-2.5 text-sm">
            <Star size={15} fill="#ffd27a" /> Ожидают вашего отзыва
          </div>
          {pendingReviews.map((o: any) => (
            <Link key={o.id} to={`/market/orders/${o.id}`} className="flex items-center justify-between py-2 border-b border-white/[.08] last:border-0 no-underline">
              <div>
                <div className="text-ink text-sm font-medium">{o.title}</div>
                <div className="text-subtle text-xs mt-0.5">{o.subject} · {o.role === 'customer' ? 'Вы заказчик' : 'Вы исполнитель'}</div>
              </div>
              <span className="text-gold text-sm font-semibold shrink-0 ml-3">Оставить отзыв →</span>
            </Link>
          ))}
        </GlassCard>
      )}

      {/* Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-white/[.07] border border-white/[.12] rounded-[13px] p-1">
          <button
            onClick={() => setMode('orders')}
            className={`font-semibold text-sm px-5 py-2 rounded-[10px] whitespace-nowrap transition-colors ${mode === 'orders' ? 'text-[#1a1140] bg-gradient-to-br from-lav to-[#ddd6fe]' : 'text-subtle'}`}
          >Заказы</button>
          <button
            onClick={() => setMode('services')}
            className={`font-semibold text-sm px-5 py-2 rounded-[10px] whitespace-nowrap transition-colors ${mode === 'services' ? 'text-[#1a1140] bg-gradient-to-br from-lav to-[#ddd6fe]' : 'text-subtle'}`}
          >Услуги</button>
        </div>
        <div className="flex items-center gap-2 bg-white/[.07] border border-white/[.12] rounded-[14px] px-3.5 py-2.5 text-sm flex-1 min-w-[180px] max-w-sm">
          <Search size={15} className="text-subtle shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={mode === 'orders' ? 'Поиск заказов…' : 'Поиск услуг…'}
            className="bg-transparent outline-none text-ink placeholder:text-subtle w-full"
          />
        </div>
        {user && (
          <div className="flex gap-4 text-[13px] text-subtle ml-auto">
            <Link to="/market/orders/mine" className="hover:text-ink transition-colors">Мои заказы</Link>
            <Link to="/market/orders/applied" className="hover:text-ink transition-colors">Мои отклики</Link>
            <Link to="/market/services/new" className="hover:text-ink transition-colors">Разместить услугу</Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Grid */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <GlassCard key={i} className="rounded-[20px] p-5 h-44 animate-pulse"><></></GlassCard>
              ))}
            </div>
          ) : mode === 'orders' ? (
            orders.length === 0 ? (
              <GlassCard className="rounded-[20px] py-10 text-center text-subtle text-sm">Заказов не найдено</GlassCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {orders.map(order => {
                  const isOwner = order.customer_id === user?.id
                  const isNew = Date.now() - new Date(order.created_at).getTime() < 86_400_000
                  return (
                    <Link key={order.id} to={`/market/orders/${order.id}`}>
                      <GlassCard hover className="rounded-[20px] p-5 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg text-[#1a1140]" style={{ background: catColor(order.subject) }}>
                            {order.subject}
                          </span>
                          {isNew && <span className="ml-auto text-[11px] font-semibold text-mint">● новый</span>}
                        </div>
                        <h4 className="text-base font-semibold leading-snug mb-2 text-ink">{order.title}</h4>
                        <div className="text-xs text-subtle mb-4">{formatDate(order.created_at)}</div>
                        <div className="flex items-center gap-2.5 pt-3.5 border-t border-white/[.1] mt-auto">
                          <Avatar name={order.customer?.nickname} src={order.customer?.avatar_url} size={30} radius={9} />
                          <span className="text-[12.5px] font-medium text-ink">{order.customer?.nickname}</span>
                          <div className="ml-auto text-right">
                            <b className="block text-lg font-bold text-mint">{formatCurrency(order.base_amount)}</b>
                            <span className="text-[11px] text-subtle">бюджет</span>
                          </div>
                        </div>
                        {isOwner && <span className="mt-2 text-[11px] text-subtle">Мой заказ</span>}
                        {!isOwner && order.already_applied && <span className="mt-2 text-[11px] text-mint">Заявка подана</span>}
                      </GlassCard>
                    </Link>
                  )
                })}
              </div>
            )
          ) : listings.length === 0 ? (
            <GlassCard className="rounded-[20px] py-10 text-center text-subtle text-sm">Услуг не найдено</GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listings.map(l => {
                const rating = parseFloat(String(l.owner?.rating_as_executor ?? 0))
                return (
                  <Link key={l.id} to={`/market/services/${l.id}`}>
                    <GlassCard hover className="rounded-[20px] p-5 flex flex-col h-full">
                      <div
                        className="h-24 rounded-[14px] mb-3.5 flex items-end p-3"
                        style={{ background: gradientFor(l.title) }}
                      >
                        <span className="text-[11px] font-semibold text-white bg-black/35 backdrop-blur px-2.5 py-1 rounded-lg">услуга</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <Avatar name={l.owner?.nickname} size={26} radius={8} className="text-[10px]" />
                        <span className="text-[12.5px] font-medium text-ink">{l.owner?.nickname}</span>
                        {rating > 0 && <Stars rating={rating} className="ml-auto" />}
                      </div>
                      <h4 className="text-base font-semibold leading-snug mb-2 text-ink">{l.title}</h4>
                      {(l.deposit_amount ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-gold bg-gold/10 border border-gold/30 rounded-lg px-2.5 py-1 w-fit mb-2">
                          <Shield size={11} /> Залог {formatCurrency(l.deposit_amount)}
                        </span>
                      )}
                      <div className="mt-auto pt-2 text-right">
                        <b className="text-lg font-bold text-mint">от {formatCurrency(l.price)}</b>
                      </div>
                    </GlassCard>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <GlassCard className="rounded-[20px] p-7 text-center !bg-gradient-to-br !from-mint/[.18] !to-pink/[.16]">
            <h3 className="text-xl font-bold mb-2 text-ink">Есть навык? 💸</h3>
            <p className="text-[13.5px] text-subtle mb-5 leading-relaxed">Размести услугу и получай заказы от студентов прямо в кошелёк.</p>
            <Button to="/market/services/new" variant="mint" className="w-full justify-center">Стать исполнителем</Button>
          </GlassCard>
          <GlassCard className="rounded-[20px] p-5">
            <h3 className="text-sm font-semibold mb-3.5 flex items-center gap-2 text-ink">🛡 Как это работает</h3>
            <p className="text-[13px] text-subtle leading-relaxed">
              Деньги резервируются при заказе и переходят исполнителю только после приёмки работы. Споры решает администрация.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
