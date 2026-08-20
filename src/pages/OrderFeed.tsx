import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, DollarSign, ChevronRight, Star } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { formatCurrency, formatRating } from '../lib/format'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import VipName from '../components/VipBadge'
import { Avatar } from '../components/glass'

const CLS = {
  typeBadge: 'inline-flex items-center gap-[5px] bg-[#14a89a18] text-teal-legacy border border-[#14a89a33] rounded-md py-[3px] px-[9px] text-xs font-semibold',
  btn: (variant: 'primary' | 'muted' | 'disabled') =>
    `inline-flex items-center gap-[5px] py-[6px] px-[14px] rounded-[7px] text-[0.82rem] font-semibold no-underline border-none ${
      variant === 'disabled' ? 'cursor-default opacity-60' : 'cursor-pointer'
    } ${
      variant === 'primary' ? 'bg-teal-legacy text-white' : variant === 'muted' ? 'bg-[#1e3a4a] text-slate-500' : 'bg-transparent text-slate-500'
    }`,
}

export default function OrderFeed() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : ''
      const data = await apiCall('GET', `/orders${params}`)
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), 350)
    return () => clearTimeout(t)
  }, [search, load])

  return (
    <div>
      <div className="mb-6">
        <div className="text-slate-200 text-[1.4rem] font-bold mb-4">Биржа заказов</div>
        <div className="relative max-w-[480px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            className="w-full bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-[9px] pl-[38px] pr-3 text-slate-200 text-[0.92rem]"
            placeholder="Поиск по заголовку, предмету, описанию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Search}
          title={search ? 'Ничего не найдено' : 'Открытых заказов пока нет'}
          subtitle={search ? 'Попробуйте изменить запрос или очистить поиск' : 'Загляните позже — исполнители ждут новых заказов'}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
          {orders.map((order: any) => {
            const isOwner = order.customer_id === user?.id
            return (
              <div key={order.id} className="bg-[#0f1923] border border-[#1e3a4a] rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-slate-200 font-semibold text-base md:text-lg leading-[1.4] line-clamp-2">{order.title}</div>
                </div>
                <div className="flex gap-[6px] flex-wrap">
                  <span className={CLS.typeBadge}><DollarSign size={12} />Заказ</span>
                  <span className="inline-block bg-[#1e3a4a] text-slate-400 rounded-md py-[3px] px-[9px] text-xs md:text-[0.85rem]">{order.subject}</span>
                </div>
                <div>
                  <div className="text-teal-legacy font-bold text-[1.05rem] md:text-[1.15rem]">{formatCurrency(order.base_amount)}</div>
                  <div className="text-slate-500 text-[0.78rem] md:text-[0.85rem] mt-0.5">бюджет · можно предложить свою цену</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Avatar name={order.customer?.nickname} src={order.customer?.avatar_url} size={40} radius={12} isVip={order.customer?.is_vip} />
                  <div className="min-w-0">
                    <div className="text-slate-300 text-xs md:text-[0.92rem] truncate"><VipName name={order.customer?.nickname} isVip={order.customer?.is_vip} /></div>
                    {formatRating(order.customer?.rating_as_customer, order.customer?.reviews_count_customer, 1) && (
                      <div className="flex items-center gap-1 text-amber-500 text-[0.7rem] md:text-[0.85rem]">
                        <Star size={11} fill="#f59e0b" />
                        {formatRating(order.customer?.rating_as_customer, order.customer?.reviews_count_customer, 1)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <div className="text-slate-500 text-xs md:text-[0.85rem]">
                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                  </div>
                  <div className="flex gap-[6px]">
                    <Link to={`/market/orders/${order.id}`} className={CLS.btn('muted')}>
                      <ChevronRight size={13} /> Подробнее
                    </Link>
                    {!isOwner && (
                      order.already_applied
                        ? <span className={CLS.btn('disabled')}>Заявка подана</span>
                        : <Link to={`/market/orders/${order.id}`} className={CLS.btn('primary')}>Откликнуться</Link>
                    )}
                    {isOwner && <span className={CLS.btn('disabled')}>Мой заказ</span>}
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
