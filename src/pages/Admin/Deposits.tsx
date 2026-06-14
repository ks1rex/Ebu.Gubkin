import { useEffect, useState } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'

const API = import.meta.env.VITE_BACKEND_URL as string

interface DepositRequest {
  id: string
  user_id: string
  claimed_amount: number
  confirmed_amount: number | null
  credited_amount: number | null
  status: 'pending' | 'confirmed' | 'rejected'
  admin_comment: string | null
  referral_bonus_applied: boolean | null
  referral_bonus_amount: number | null
  created_at: string
  user?: {
    nickname: string | null
    email?: string
  }
  has_referrer?: boolean
  referral_qualifying_deposits_count?: number
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Ожидает', cls: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Подтверждено', cls: 'bg-green-100 text-green-800' },
  rejected:  { label: 'Отклонено', cls: 'bg-red-100 text-red-800' },
}

export default function AdminDeposits() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [deposits, setDeposits] = useState<DepositRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [confirmedAmounts, setConfirmedAmounts] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<Record<string, boolean>>({})

  async function fetchDeposits() {
    setLoading(true)
    try {
      const url = showAll ? `${API}/admin/deposits` : `${API}/admin/deposits?status=pending`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list: DepositRequest[] = Array.isArray(data) ? data : (data.data ?? [])
      setDeposits(list)
      // init confirmed amounts
      const amounts: Record<string, string> = {}
      list.forEach(d => {
        amounts[d.id] = String(d.confirmed_amount ?? d.claimed_amount)
      })
      setConfirmedAmounts(amounts)
    } catch {
      toast('Не удалось загрузить заявки на пополнение', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDeposits() }, [showAll])

  async function confirm(id: string) {
    const confirmed_amount = parseFloat(confirmedAmounts[id] ?? '0')
    if (isNaN(confirmed_amount) || confirmed_amount <= 0) {
      toast('Введите корректную подтверждённую сумму', 'error')
      return
    }
    setActing(a => ({ ...a, [id]: true }))
    try {
      const res = await fetch(`${API}/admin/deposits/${id}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmed_amount }),
      })
      if (!res.ok) throw new Error()
      toast('Пополнение подтверждено', 'success')
      fetchDeposits()
    } catch {
      toast('Ошибка при подтверждении', 'error')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  async function reject(id: string) {
    setActing(a => ({ ...a, [id]: true }))
    try {
      const res = await fetch(`${API}/admin/deposits/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast('Заявка отклонена', 'success')
      fetchDeposits()
    } catch {
      toast('Ошибка при отклонении', 'error')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Заявки на пополнение</h1>
        <button
          onClick={() => setShowAll(v => !v)}
          className="text-sm px-3 py-1.5 border border-line rounded-lg hover:bg-panel text-ink transition-colors"
        >
          {showAll ? 'Только ожидающие' : 'Показать все'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
      ) : deposits.length === 0 ? (
        <div className="text-center py-16 text-subtle text-sm">Нет заявок</div>
      ) : (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel border-b border-line">
              <tr>
                <th className="py-2 px-3 text-left text-subtle font-medium">Пользователь</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Заявленная</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Подтверждённая</th>
                <th className="py-2 px-3 text-center text-subtle font-medium">Реф.</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Дата</th>
                <th className="py-2 px-3 text-center text-subtle font-medium">Статус</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map(dep => {
                const confirmedVal = parseFloat(confirmedAmounts[dep.id] ?? '0')
                const creditedPreview = isNaN(confirmedVal) ? '—' : (confirmedVal * 0.9).toFixed(2)
                const isPending = dep.status === 'pending'
                const isRef = dep.has_referrer && (dep.referral_qualifying_deposits_count ?? 0) < 3
                const s = STATUS_LABELS[dep.status] ?? { label: dep.status, cls: 'bg-panel text-ink' }

                return (
                  <tr key={dep.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                    <td className="py-2 px-3 text-ink">
                      {dep.user?.nickname ?? dep.user_id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {dep.claimed_amount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <input
                          type="number"
                          value={confirmedAmounts[dep.id] ?? ''}
                          onChange={e => setConfirmedAmounts(a => ({ ...a, [dep.id]: e.target.value }))}
                          disabled={!isPending}
                          className="w-24 border border-line rounded px-2 py-1 text-right text-sm text-ink bg-canvas focus:outline-none focus:border-accent disabled:opacity-50"
                        />
                        {isPending && (
                          <span className="text-xs text-subtle">→ {creditedPreview} ₽</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isRef && (
                        <span className="px-1.5 py-0.5 bg-accent-subtle text-accent text-xs rounded-full font-medium">
                          РЕФ.
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-subtle">{timeAgo(dep.created_at)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => confirm(dep.id)}
                          disabled={!isPending || acting[dep.id]}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-success text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          {acting[dep.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Подтвердить
                        </button>
                        <button
                          onClick={() => reject(dep.id)}
                          disabled={!isPending || acting[dep.id]}
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
      )}
    </div>
  )
}
