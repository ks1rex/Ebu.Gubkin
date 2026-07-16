import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Inbox } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { StatusBadge } from '../lib/statusMap'
import { formatCurrency, formatDate } from '../lib/format'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

const APP_STATUS: Record<string, { label: string; badgeCls: string }> = {
  pending:  { label: 'На рассмотрении', badgeCls: 'bg-[#f59e0b22] text-[#f59e0b] border-[#f59e0b44]' },
  accepted: { label: 'Принята',         badgeCls: 'bg-[#22c55e22] text-[#22c55e] border-[#22c55e44]' },
  rejected: { label: 'Отклонена',       badgeCls: 'bg-[#64748b22] text-[#64748b] border-[#64748b44]' },
}
const TYPE_LABEL: Record<string, string> = { order: 'Заказ', service: 'Услуга' }

export default function AppliedOrders() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    apiCall('GET', '/orders/applied')
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ />

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="text-slate-200 text-[1.4rem] font-bold mb-6">Мои отклики</div>

      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Откликов пока нет"
          subtitle="Перейдите на биржу заказов и откликнитесь на понравившийся заказ"
          action={<Link to="/market/orders" className="bg-teal-legacy text-white no-underline rounded-lg py-2 px-[18px] font-semibold text-[0.9rem]">Биржа заказов</Link>}
        />
      ) : (
        items.map((item: any) => {
          const order = item.orders
          const appMeta = APP_STATUS[item.status] ?? APP_STATUS.pending
          return (
            <Link key={item.id} to={`/market/orders/${order?.id}`} className="bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-4 px-5 mb-2 flex items-center gap-4 no-underline flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 font-semibold text-[0.95rem]">{order?.title ?? 'Заказ'}</div>
                <div className="text-slate-500 text-[0.78rem] mt-0.5">
                  {order?.subject} · {TYPE_LABEL[order?.order_type] ?? order?.order_type} · {formatDate(item.created_at)}
                </div>
              </div>
              <span className={`inline-block py-0.5 px-[9px] rounded-xl text-xs font-semibold whitespace-nowrap border ${appMeta.badgeCls}`}>{appMeta.label}</span>
              {order && <StatusBadge status={order.status} />}
              {item.proposed_amount && <div className="text-teal-legacy font-bold whitespace-nowrap text-[0.95rem]">{formatCurrency(item.proposed_amount)}</div>}
              <ChevronRight size={16} className="text-slate-700 shrink-0" />
            </Link>
          )
        })
      )}
    </div>
  )
}
