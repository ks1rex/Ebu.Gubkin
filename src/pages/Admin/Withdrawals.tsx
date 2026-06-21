import { useEffect, useState } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'

const API = import.meta.env.VITE_BACKEND_URL as string

interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  card_number: string | null
  status: 'pending' | 'confirmed' | 'rejected'
  admin_comment: string | null
  processed_at: string | null
  created_at: string
  user?: {
    nickname: string | null
  }
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Ожидает', cls: 'bg-warning/10 text-warning' },
  confirmed: { label: 'Выплачено', cls: 'bg-success/10 text-success' },
  rejected:  { label: 'Отклонено', cls: 'bg-error/10 text-error' },
}

export default function AdminWithdrawals() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [acting, setActing] = useState<Record<string, boolean>>({})

  async function fetchWithdrawals() {
    setLoading(true)
    try {
      const url = showAll
        ? `${API}/admin/withdrawals`
        : `${API}/admin/withdrawals?status=pending`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setWithdrawals(Array.isArray(data) ? data : (data.data ?? []))
    } catch {
      toast('Не удалось загрузить заявки на вывод', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWithdrawals() }, [showAll])

  async function act(id: string, action: 'confirm' | 'reject') {
    setActing(a => ({ ...a, [id]: true }))
    try {
      const res = await fetch(`${API}/admin/withdrawals/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast(action === 'confirm' ? 'Выплата подтверждена' : 'Заявка отклонена', 'success')
      fetchWithdrawals()
    } catch {
      toast('Ошибка при обработке заявки', 'error')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Заявки на вывод</h1>
        <button
          onClick={() => setShowAll(v => !v)}
          className="text-sm px-3 py-1.5 border border-line rounded-lg hover:bg-panel text-ink transition-colors"
        >
          {showAll ? 'Только ожидающие' : 'Показать все'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
      ) : withdrawals.length === 0 ? (
        <div className="text-center py-16 text-subtle text-sm">Нет заявок</div>
      ) : (
        <>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {withdrawals.map(w => {
            const isPending = w.status === 'pending'
            const s = STATUS_LABELS[w.status] ?? { label: w.status, cls: 'bg-panel text-ink' }
            return (
              <div key={w.id} className="bg-surface border border-line rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-accent">
                      {(w.user?.nickname ?? w.user_id)[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{w.user?.nickname ?? w.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-subtle">{timeAgo(w.created_at)}</p>
                  </div>
                  <span className="ml-auto text-error font-bold shrink-0">
                    −{w.amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-subtle text-xs">Статус</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                  </div>
                  <div>
                    <p className="text-subtle text-xs">Карта</p>
                    <p className="text-ink font-mono text-xs">{w.card_number ?? '—'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => act(w.id, 'confirm')}
                    disabled={!isPending || acting[w.id]}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs bg-success text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {acting[w.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Выплачено
                  </button>
                  <button
                    onClick={() => act(w.id, 'reject')}
                    disabled={!isPending || acting[w.id]}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs bg-error text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    <X size={12} />
                    Отклонить
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-surface rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel border-b border-line">
              <tr>
                <th className="py-2 px-3 text-left text-subtle font-medium">Пользователь</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Сумма</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Карта</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Дата</th>
                <th className="py-2 px-3 text-center text-subtle font-medium">Статус</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => {
                const isPending = w.status === 'pending'
                const s = STATUS_LABELS[w.status] ?? { label: w.status, cls: 'bg-panel text-ink' }
                return (
                  <tr key={w.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                    <td className="py-2 px-3 text-ink">
                      {w.user?.nickname ?? w.user_id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {w.amount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-2 px-3 text-ink font-mono text-xs">
                      {w.card_number ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-subtle">{timeAgo(w.created_at)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => act(w.id, 'confirm')}
                          disabled={!isPending || acting[w.id]}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-success text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          {acting[w.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Выплачено
                        </button>
                        <button
                          onClick={() => act(w.id, 'reject')}
                          disabled={!isPending || acting[w.id]}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-error text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          <X size={12} />
                          Отклонить
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
