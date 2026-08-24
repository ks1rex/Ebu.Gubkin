import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Briefcase } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { StatusBadge } from '../lib/statusMap'
import { formatCurrency, formatDate } from '../lib/format'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

const TYPE_LABEL: Record<string, string> = { order: 'Заказ', service: 'Услуга' }

export default function ExecutingOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    apiCall('GET', '/orders/executing')
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ />

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="text-slate-200 text-[1.4rem] font-bold mb-1">Моя работа</div>
      <div className="text-slate-500 text-[0.85rem] mb-6">Отклики, которые приняли, и заказы по вашим услугам — всё, где работа уже назначена вам</div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Пока нет заказов"
          subtitle="Здесь появятся заказы по вашим услугам и заказы, где вас выбрали исполнителем"
        />
      ) : (
        orders.map((order: any) => (
          <Link key={order.id} to={`/market/orders/${order.id}`} className="bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-4 px-5 mb-2 flex items-center gap-4 no-underline flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 font-semibold text-[0.95rem]">{order.title}</div>
              <div className="text-slate-500 text-[0.78rem] mt-0.5">
                {order.subject} · {TYPE_LABEL[order.order_type] ?? order.order_type} · {formatDate(order.created_at)}
              </div>
            </div>
            <StatusBadge status={order.status} />
            <div className="text-teal-legacy font-bold whitespace-nowrap text-[0.95rem]">{formatCurrency(order.final_amount ?? order.base_amount)}</div>
            <ChevronRight size={16} className="text-slate-700 shrink-0" />
          </Link>
        ))
      )}
    </div>
  )
}
