import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Users, ShoppingBag, Scale, ArrowDownCircle, ArrowUpCircle, HeadphonesIcon, TrendingUp } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { apiCall } from '../../lib/api'

interface AdminStats {
  total_users: number
  banned_users: number
  orders_by_status: Record<string, number>
  open_disputes_count: number
  open_support_tickets_count: number
  total_commission_earned: number
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  linkTo?: string
}

function StatCard({ icon, label, value, sub, linkTo }: StatCardProps) {
  const inner = (
    <div className="bg-surface rounded-xl border border-line p-4 flex flex-col gap-2 hover:border-accent/40 transition-colors">
      <div className="flex items-center gap-2 text-subtle text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-ink">{value}</div>
      {sub && <div className="text-xs text-subtle">{sub}</div>}
    </div>
  )

  if (linkTo) {
    return <Link to={linkTo}>{inner}</Link>
  }
  return inner
}

const ACTIVE_STATUSES = ['open', 'in_progress', 'awaiting_confirmation', 'disputed']

export default function AdminDashboard() {
  const toast = useToast()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [pendingDeposits, setPendingDeposits] = useState<number | null>(null)
  const [pendingWithdrawals, setPendingWithdrawals] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    setLoading(true)
    try {
      const statsData = await apiCall('GET', '/admin/stats')
      setStats(statsData)

      try {
        const d = await apiCall('GET', '/admin/deposits?status=pending')
        setPendingDeposits(Array.isArray(d) ? d.length : (d.data?.length ?? 0))
      } catch { /* non-fatal — leave pendingDeposits as '—' */ }

      try {
        const w = await apiCall('GET', '/admin/withdrawals?status=pending')
        setPendingWithdrawals(Array.isArray(w) ? w.length : (w.data?.length ?? 0))
      } catch { /* non-fatal — leave pendingWithdrawals as '—' */ }
    } catch (e) {
      toast('Не удалось загрузить статистику', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-subtle" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-32">
        <p className="text-subtle mb-4">Не удалось загрузить данные</p>
        <button onClick={fetchAll} className="text-accent hover:underline text-sm">Повторить</button>
      </div>
    )
  }

  const activeOrders = ACTIVE_STATUSES.reduce(
    (sum, s) => sum + (stats.orders_by_status[s] ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">Дашборд</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={16} />}
          label="Пользователи"
          value={stats.total_users}
          sub={`Заблокировано: ${stats.banned_users}`}
          linkTo="/admin/users"
        />
        <StatCard
          icon={<ShoppingBag size={16} />}
          label="Активных заказов"
          value={activeOrders}
          sub="open + in_progress + споры"
          linkTo="/admin/users"
        />
        <StatCard
          icon={<Scale size={16} />}
          label="Открытых споров"
          value={stats.open_disputes_count}
          linkTo="/admin/disputes"
        />
        <StatCard
          icon={<HeadphonesIcon size={16} />}
          label="Тикетов поддержки"
          value={stats.open_support_tickets_count}
        />
        <StatCard
          icon={<ArrowDownCircle size={16} />}
          label="Заявок на пополнение"
          value={pendingDeposits ?? '—'}
          sub="ожидают подтверждения"
          linkTo="/admin/deposits"
        />
        <StatCard
          icon={<ArrowUpCircle size={16} />}
          label="Заявок на вывод"
          value={pendingWithdrawals ?? '—'}
          sub="ожидают выплаты"
          linkTo="/admin/withdrawals"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Комиссия собрана"
          value={`${(stats.total_commission_earned ?? 0).toLocaleString('ru-RU')} ₽`}
          linkTo="/admin/finance"
        />
      </div>

      {/* Orders by status */}
      <div className="bg-surface rounded-xl border border-line p-4">
        <h2 className="text-sm font-semibold text-ink mb-3">Заказы по статусам</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.orders_by_status).map(([status, count]) => (
            <span
              key={status}
              className="px-2 py-1 bg-panel rounded-lg text-xs text-ink border border-line"
            >
              <span className="text-subtle">{status}:</span> <strong>{count}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
