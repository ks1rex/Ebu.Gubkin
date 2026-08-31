import { useEffect, useState } from 'react'
import { Loader2, Check, X, MessageSquareWarning } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'
import { apiCall } from '../../lib/api'
import RejectReasonModal from '../../components/RejectReasonModal'

interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  phone_number: string | null
  bank_name: string | null
  source_balance: 'deposited' | 'earned'
  // считает бэкенд: занесённый баланс — ставка из admin_settings, заработанный — 0%
  commission_pct: number
  payout_amount: number
  status: 'pending' | 'confirmed' | 'rejected'
  admin_comment: string | null
  processed_at: string | null
  created_at: string
  user?: {
    nickname: string | null
  }
}

const SOURCE_LABEL: Record<string, string> = { deposited: 'занесённый', earned: 'заработанный' }

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Ожидает', cls: 'bg-warning/10 text-warning' },
  confirmed: { label: 'Выплачено', cls: 'bg-success/10 text-success' },
  rejected:  { label: 'Отклонено', cls: 'bg-error/10 text-error' },
}

export default function AdminWithdrawals() {
  const toast = useToast()

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [acting, setActing] = useState<Record<string, boolean>>({})
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  async function fetchWithdrawals() {
    setLoading(true)
    try {
      const path = showAll
        ? '/admin/withdrawals'
        : '/admin/withdrawals?status=pending'
      const data = await apiCall('GET', path)
      setWithdrawals(Array.isArray(data) ? data : (data.data ?? []))
    } catch {
      toast('Не удалось загрузить заявки на вывод', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWithdrawals() }, [showAll])

  async function act(id: string, action: 'confirm' | 'reject', admin_comment?: string) {
    setActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('POST', `/admin/withdrawals/${id}/${action}`,
        action === 'reject' ? { admin_comment: admin_comment || null } : undefined)
      toast(action === 'confirm' ? 'Выплата подтверждена' : 'Заявка отклонена', 'success')
      setRejectingId(null)
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
            const p = w.payout_amount
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

                {p != null && (
                  <div className="mb-3 p-2.5 bg-success/10 border border-success/30 rounded-lg">
                    <p className="text-xs text-subtle mb-0.5">
                      К выплате {w.commission_pct ? `(за вычетом ${w.commission_pct}%)` : '(без комиссии)'}
                    </p>
                    <p className="text-base font-bold text-success">{p.toLocaleString('ru-RU')} ₽</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-subtle text-xs">Статус</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                  </div>
                  <div>
                    <p className="text-subtle text-xs">Телефон (СБП)</p>
                    <p className="text-ink font-mono text-xs">{w.phone_number ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-subtle text-xs">Банк</p>
                    <p className="text-ink text-xs">{w.bank_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-subtle text-xs">Баланс</p>
                    <p className="text-ink text-xs">{SOURCE_LABEL[w.source_balance] ?? w.source_balance}</p>
                  </div>
                </div>

                {w.admin_comment && (
                  <div className="mb-3 flex items-start gap-1.5 text-xs text-subtle bg-panel rounded-lg p-2">
                    <MessageSquareWarning size={13} className="shrink-0 mt-px" />
                    <span className="text-ink">{w.admin_comment}</span>
                  </div>
                )}

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
                    onClick={() => setRejectingId(w.id)}
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
                <th className="py-2 px-3 text-right text-subtle font-medium">К выплате</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Баланс</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Телефон (СБП)</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Дата</th>
                <th className="py-2 px-3 text-center text-subtle font-medium">Статус</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Комментарий</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => {
                const isPending = w.status === 'pending'
                const s = STATUS_LABELS[w.status] ?? { label: w.status, cls: 'bg-panel text-ink' }
                const p = w.payout_amount
                return (
                  <tr key={w.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                    <td className="py-2 px-3 text-ink">
                      {w.user?.nickname ?? w.user_id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {w.amount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-success">
                      {p != null ? `${p.toLocaleString('ru-RU')} ₽` : '—'}
                      {w.commission_pct === 0 && <span className="block text-[11px] font-normal text-subtle">без комиссии</span>}
                    </td>
                    <td className="py-2 px-3 text-ink text-xs">
                      {SOURCE_LABEL[w.source_balance] ?? w.source_balance}
                    </td>
                    <td className="py-2 px-3 text-ink font-mono text-xs">
                      {w.phone_number ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-subtle">{timeAgo(w.created_at)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-subtle text-xs max-w-[200px]">
                      {w.admin_comment
                        ? <span className="text-ink" title={w.admin_comment}>{w.admin_comment}</span>
                        : '—'}
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
                          onClick={() => setRejectingId(w.id)}
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

      <RejectReasonModal
        open={rejectingId != null}
        busy={rejectingId ? !!acting[rejectingId] : false}
        onClose={() => setRejectingId(null)}
        onConfirm={comment => act(rejectingId!, 'reject', comment)}
        title="Отклонить вывод"
        hint="Комментарий увидит пользователь; сумма вернётся на его баланс."
      />
    </div>
  )
}
