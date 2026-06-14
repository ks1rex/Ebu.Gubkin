import { useEffect, useState } from 'react'
import { Loader2, Plus, Minus, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'

const API = import.meta.env.VITE_BACKEND_URL as string

const TX_LABELS: Record<string, string> = {
  deposit:                 'Пополнение',
  withdrawal:              'Вывод',
  order_payment:           'Оплата заказа',
  order_cancel_refund:     'Возврат (отмена)',
  order_topup:             'Доплата по заказу',
  order_payout:            'Выплата исполнителю',
  dispute_refund_customer: 'Возврат (спор)',
  deposit_hold:            'Заморозка',
  deposit_release:         'Разморозка',
  deposit_forfeit:         'Конфискация',
  referral_bonus:          'Реферальный бонус',
}

const TX_TYPES = Object.keys(TX_LABELS)

const INCOME_TYPES = new Set([
  'deposit', 'order_payout', 'dispute_refund_customer',
  'deposit_release', 'order_cancel_refund', 'referral_bonus',
])

interface TxEntry {
  id: string
  type: string
  amount: number
  status: string
  created_at: string
  order_id: string | null
  user: { id: string; nickname: string | null } | null
}

const INPUT = 'px-3 py-1.5 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-accent transition-colors'

export default function AdminLedger() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [entries, setEntries] = useState<TxEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [filterType, setFilterType] = useState('')
  const [filterNick, setFilterNick] = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  async function fetchLedger() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (filterNick) params.set('nickname', filterNick)
      if (dateFrom)   params.set('date_from', dateFrom)
      if (dateTo)     params.set('date_to', dateTo)
      const res = await fetch(`${API}/admin/ledger?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setEntries(await res.json())
    } catch {
      toast('Не удалось загрузить журнал транзакций', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLedger() }, [token])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Журнал транзакций</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={INPUT}>
          <option value="">Все типы</option>
          {TX_TYPES.map(t => <option key={t} value={t}>{TX_LABELS[t]}</option>)}
        </select>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input type="text" placeholder="Никнейм..." value={filterNick}
            onChange={e => setFilterNick(e.target.value)}
            className={INPUT + ' pl-7 w-36'} />
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={INPUT} title="С даты" />
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className={INPUT} title="По дату" />
        <button onClick={fetchLedger}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors">
          Применить
        </button>
        <span className="text-xs text-subtle">Показано: {entries.length} / макс. 500</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-subtle" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-subtle text-sm">Нет записей</div>
      ) : (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel border-b border-line">
              <tr>
                <th className="py-2 px-3 text-left text-subtle font-medium">Пользователь</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Тип</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Сумма</th>
                <th className="py-2 px-3 text-center text-subtle font-medium">Статус</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Дата</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Заказ</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(tx => {
                const income = INCOME_TYPES.has(tx.type)
                return (
                  <tr key={tx.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                    <td className="py-2 px-3 text-ink">{tx.user?.nickname ?? '—'}</td>
                    <td className="py-2 px-3 text-ink">{TX_LABELS[tx.type] ?? tx.type}</td>
                    <td className="py-2 px-3 text-right font-medium">
                      <span className="flex items-center justify-end gap-1">
                        {income
                          ? <Plus size={11} className="text-success" />
                          : <Minus size={11} className="text-error" />
                        }
                        <span className={income ? 'text-success' : 'text-error'}>
                          {Math.abs(tx.amount).toLocaleString('ru-RU')} ₽
                        </span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                        tx.status === 'rejected'  ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tx.status === 'completed' ? 'Выполнено' : tx.status === 'rejected' ? 'Отклонено' : 'В обработке'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-subtle text-xs">{timeAgo(tx.created_at)}</td>
                    <td className="py-2 px-3 text-subtle text-xs font-mono">
                      {tx.order_id ? tx.order_id.slice(0, 8) + '…' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
