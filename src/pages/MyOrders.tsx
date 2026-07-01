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

const S: Record<string, any> = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 },
  h1: { display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontSize: '1.4rem', fontWeight: 700 },
  usage: { color: '#64748b', fontSize: '0.8rem', fontWeight: 500 },
  newBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#14a89a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' },
  row: { background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  link: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', flexWrap: 'wrap' },
  title: { color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem' },
  subject: { color: '#64748b', fontSize: '0.78rem', marginTop: 2 },
  amount: { color: '#14a89a', fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap' },
  hiddenBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: 10, padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600 },
  toggleBtn: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${active ? '#14a89a' : '#334155'}`, borderRadius: 7, padding: '6px 12px', color: active ? '#14a89a' : '#64748b', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500, flexShrink: 0 }),
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

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={S.header}>
        <div style={S.h1}>
          Мои заказы
          {usage && <span style={S.usage}>использовано {usage.used} из {usage.limit}</span>}
        </div>
        <Link to="/market/orders/new" style={S.newBtn}><PlusCircle size={16} /> Создать заказ</Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Заказов пока нет"
          subtitle="Создайте первый заказ — исполнители откликнутся уже сегодня"
          action={<Link to="/market/orders/new" style={S.newBtn}><PlusCircle size={16} /> Создать заказ</Link>}
        />
      ) : (
        orders.map((order: any) => (
          <div key={order.id} style={{ ...S.row, opacity: order.is_hidden ? 0.6 : 1 }}>
            <Link to={`/market/orders/${order.id}`} style={S.link}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.title}>{order.title}</div>
                <div style={S.subject}>
                  {order.subject} · {ORDER_TYPE_LABEL[order.order_type] ?? order.order_type} · {formatDate(order.created_at)}
                </div>
              </div>
              {order.is_hidden && <span style={S.hiddenBadge}>Скрыто</span>}
              <StatusBadge status={order.status} />
              <div style={S.amount}>{formatCurrency(order.reserved_amount)}</div>
              <ChevronRight size={16} style={{ color: '#334155', flexShrink: 0 }} />
            </Link>
            {order.status === 'open' && (
              <button
                type="button"
                style={S.toggleBtn(!order.is_hidden)}
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
