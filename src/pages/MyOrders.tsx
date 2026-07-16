import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, ChevronRight, ClipboardList, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { StatusBadge } from '../lib/statusMap'
import { formatCurrency, formatDate } from '../lib/format'
import { useToast } from '../contexts/ToastContext'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

const CLS = {
  newBtn: 'flex items-center gap-[6px] bg-teal-legacy text-white rounded-lg py-2 px-4 text-[0.9rem] font-semibold cursor-pointer no-underline whitespace-nowrap',
  toggleBtn: (active: boolean) =>
    `flex items-center gap-[5px] bg-transparent border rounded-[7px] py-[6px] px-3 text-[0.8rem] cursor-pointer font-medium shrink-0 ${
      active ? 'border-teal-legacy text-teal-legacy' : 'border-slate-700 text-slate-500'
    }`,
}

const ORDER_TYPE_LABEL: Record<string, string> = { order: 'Заказ', service: 'Услуга' }

export default function MyOrders() {
  const { user } = useAuth()
  const toast = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!user) return
    apiCall('GET', '/orders/mine')
      .then(data => {
        setOrders(Array.isArray(data?.orders) ? data.orders : [])
        setUsage(data?.usage ?? null)
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [user])

  async function handleToggle(id: string, hidden: boolean) {
    setToggling(t => ({ ...t, [id]: true }))
    try {
      const updated = await apiCall('PATCH', `/orders/${id}/visibility`, { hidden: !hidden })
      setOrders(os => os.map(o => o.id === id ? { ...o, is_hidden: updated.is_hidden, hidden_reason: updated.hidden_reason } : o))
      setUsage(u => u ? { ...u, used: u.used + (hidden ? -1 : 1) } : u)
      toast(hidden ? 'Заказ снова виден' : 'Заказ скрыт', 'success')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setToggling(t => ({ ...t, [id]: false })) }
  }

  if (loading) return <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ />

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2.5 text-slate-200 text-[1.4rem] font-bold">
          Мои заказы
          {usage && <span className="text-slate-500 text-[0.8rem] font-medium">использовано {usage.used} из {usage.limit}</span>}
        </div>
        <Link to="/market/orders/new" className={CLS.newBtn}><PlusCircle size={16} /> Создать заказ</Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Заказов пока нет"
          subtitle="Создайте первый заказ — исполнители откликнутся уже сегодня"
          action={<Link to="/market/orders/new" className={CLS.newBtn}><PlusCircle size={16} /> Создать заказ</Link>}
        />
      ) : (
        orders.map((order: any) => (
          <div key={order.id} className={`bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-4 px-5 mb-2 flex items-center gap-4 flex-wrap ${order.is_hidden ? 'opacity-60' : 'opacity-100'}`}>
            <Link to={`/market/orders/${order.id}`} className="flex-1 min-w-0 flex items-center gap-4 no-underline flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 font-semibold text-[0.95rem]">{order.title}</div>
                <div className="text-slate-500 text-[0.78rem] mt-0.5">
                  {order.subject} · {ORDER_TYPE_LABEL[order.order_type] ?? order.order_type} · {formatDate(order.created_at)}
                </div>
              </div>
              {order.is_hidden && <span className="inline-flex items-center gap-1 bg-[#f59e0b22] text-amber-500 border border-[#f59e0b44] rounded-lg py-0.5 px-[7px] text-[0.72rem] font-semibold">Скрыто</span>}
              <StatusBadge status={order.status} />
              <div className="text-teal-legacy font-bold text-base whitespace-nowrap">{formatCurrency(order.reserved_amount)}</div>
              <ChevronRight size={16} className="text-slate-700 shrink-0" />
            </Link>
            {order.status === 'open' && (
              <button
                type="button"
                className={CLS.toggleBtn(!order.is_hidden)}
                onClick={() => handleToggle(order.id, order.is_hidden)}
                disabled={toggling[order.id]}
                title={order.is_hidden ? 'Показать' : 'Скрыть'}
              >
                {order.is_hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                {order.is_hidden ? 'Скрыт' : 'Виден'}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}
