import { useEffect, useState } from 'react'
import { Loader2, Scale } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'

const API = import.meta.env.VITE_BACKEND_URL as string

interface Dispute {
  id: string
  order_id: string
  opened_by: string
  reason: string
  status: string
  admin_comment: string | null
  created_at: string
  order?: {
    title: string
    customer?: { nickname: string | null; id: string }
    executor?: { nickname: string | null; id: string }
  }
}

type Resolution = 'refund_customer' | 'pay_executor'

interface DisputeState {
  comment: string
  banCustomer: boolean
  banExecutor: boolean
  acting: boolean
}

export default function AdminDisputes() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [states, setStates] = useState<Record<string, DisputeState>>({})

  async function fetchDisputes() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin/disputes?status=open`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list: Dispute[] = Array.isArray(data) ? data : (data.data ?? [])
      setDisputes(list)
      const initial: Record<string, DisputeState> = {}
      list.forEach(d => {
        initial[d.id] = { comment: '', banCustomer: false, banExecutor: false, acting: false }
      })
      setStates(initial)
    } catch {
      toast('Не удалось загрузить споры', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDisputes() }, [])

  function updateState(id: string, patch: Partial<DisputeState>) {
    setStates(s => ({ ...s, [id]: { ...s[id], ...patch } }))
  }

  async function resolve(dispute: Dispute, resolution: Resolution) {
    const st = states[dispute.id]
    updateState(dispute.id, { acting: true })
    try {
      const res = await fetch(`${API}/admin/disputes/${dispute.id}/resolve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolution,
          admin_comment: st.comment || undefined,
          ban_customer: st.banCustomer || undefined,
          ban_executor: st.banExecutor || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      toast('Спор разрешён', 'success')
      fetchDisputes()
    } catch {
      toast('Ошибка при разрешении спора', 'error')
      updateState(dispute.id, { acting: false })
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Споры</h1>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
      ) : disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-subtle gap-3">
          <Scale size={32} />
          <span className="text-sm">Открытых споров нет</span>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => {
            const st = states[d.id] ?? { comment: '', banCustomer: false, banExecutor: false, acting: false }
            const customerNick = d.order?.customer?.nickname ?? 'Заказчик'
            const executorNick = d.order?.executor?.nickname ?? 'Исполнитель'

            return (
              <div key={d.id} className="bg-surface rounded-xl border border-line p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-ink">
                      {d.order?.title ?? `Заказ #${d.order_id.slice(0, 8)}`}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-subtle">
                      <span>Заказчик: <strong className="text-ink">{customerNick}</strong></span>
                      <span>Исполнитель: <strong className="text-ink">{executorNick}</strong></span>
                      <span>{timeAgo(d.created_at)}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning shrink-0">
                    Открыт
                  </span>
                </div>

                <div className="bg-panel rounded-lg p-3 text-sm text-ink">
                  <span className="text-subtle text-xs font-medium uppercase mr-2">Причина:</span>
                  {d.reason}
                </div>

                <textarea
                  value={st.comment}
                  onChange={e => updateState(d.id, { comment: e.target.value })}
                  placeholder="Комментарий администратора (необязательно)..."
                  rows={2}
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent resize-none"
                />

                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.banCustomer}
                      onChange={e => updateState(d.id, { banCustomer: e.target.checked })}
                      className="rounded border-line text-accent"
                    />
                    <span className="text-ink">Забанить заказчика</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.banExecutor}
                      onChange={e => updateState(d.id, { banExecutor: e.target.checked })}
                      className="rounded border-line text-accent"
                    />
                    <span className="text-ink">Забанить исполнителя</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => resolve(d, 'refund_customer')}
                    disabled={st.acting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-accent-subtle text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
                  >
                    {st.acting && <Loader2 size={14} className="animate-spin" />}
                    Вернуть заказчику
                  </button>
                  <button
                    onClick={() => resolve(d, 'pay_executor')}
                    disabled={st.acting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-success/10 text-success border border-success/30 rounded-lg hover:bg-success/20 transition-colors disabled:opacity-50"
                  >
                    {st.acting && <Loader2 size={14} className="animate-spin" />}
                    Выплатить исполнителю
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
