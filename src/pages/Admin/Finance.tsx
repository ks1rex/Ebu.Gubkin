import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const API = import.meta.env.VITE_BACKEND_URL as string

interface FinanceSummary {
  commission_regular: number
  commission_referral: number
  referral_bonuses_paid: number
  gost_tokens_revenue: number
  total_platform_profit: number
  total_user_balances: number
  platform_expenses: number
  available_to_withdraw: number
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AdminFinance() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [data, setData] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseInput, setExpenseInput] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin/finance/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast('Не удалось загрузить финансовые данные', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function saveExpenses() {
    const amount = parseFloat(expenseInput)
    if (isNaN(amount)) { toast('Введите корректную сумму', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${API}/admin/finance/expenses`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) throw new Error()
      toast('Расходы обновлены', 'success')
      setShowExpenseModal(false)
      fetchData()
    } catch {
      toast('Ошибка при сохранении', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
  }

  if (!data) {
    return (
      <div className="text-center py-32">
        <p className="text-subtle mb-4">Нет данных</p>
        <button onClick={fetchData} className="text-accent hover:underline text-sm">Повторить</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">Финансы</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Profit */}
        <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
          <h2 className="font-semibold text-ink text-sm">Прибыль платформы</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              <tr>
                <td className="py-2 text-subtle">Комиссия обычных пополнений</td>
                <td className="py-2 text-right text-ink font-medium">{fmt(data.commission_regular)} ₽</td>
              </tr>
              <tr>
                <td className="py-2 text-subtle">
                  Комиссия реферальных пополнений
                  <span className="ml-1 px-1.5 py-0.5 bg-accent-subtle text-accent text-xs rounded-full">5%</span>
                </td>
                <td className="py-2 text-right text-ink font-medium">{fmt(data.commission_referral)} ₽</td>
              </tr>
              <tr>
                <td className="py-2 text-subtle">Выплачено рефереру</td>
                <td className="py-2 text-right text-error font-medium">−{fmt(data.referral_bonuses_paid)} ₽</td>
              </tr>
              <tr>
                <td className="py-2 text-subtle">Выручка ГОСТ-токенов</td>
                <td className="py-2 text-right text-ink font-medium">{fmt(data.gost_tokens_revenue)} ₽</td>
              </tr>
            </tbody>
          </table>
          <div className="pt-2 border-t border-line flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">ИТОГО</span>
            <span className="text-xl font-bold text-accent">{fmt(data.total_platform_profit)} ₽</span>
          </div>
        </div>

        {/* Card 2: User balances */}
        <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
          <h2 className="font-semibold text-ink text-sm">Деньги пользователей</h2>
          <div>
            <div className="text-2xl font-bold text-ink">{fmt(data.total_user_balances)} ₽</div>
            <p className="text-xs text-subtle mt-1">Суммарный баланс кошельков</p>
          </div>
          <div className="bg-panel rounded-lg p-3 text-xs text-subtle">
            Эти деньги не ваши — держите их в наличии
          </div>
        </div>

        {/* Card 3: Expenses / Available */}
        <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
          <h2 className="font-semibold text-ink text-sm">Расходы / Итог</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-ink">{fmt(data.platform_expenses)} ₽</div>
              <p className="text-xs text-subtle mt-1">Расходы платформы</p>
            </div>
            <button
              onClick={() => {
                setExpenseInput(String(data.platform_expenses))
                setShowExpenseModal(true)
              }}
              className="text-xs px-3 py-1.5 border border-line rounded-lg hover:bg-panel text-ink transition-colors"
            >
              Изменить
            </button>
          </div>
          <div className="pt-3 border-t border-line">
            <p className="text-xs text-subtle mb-1">Доступно к выводу</p>
            <span
              className={`text-2xl font-bold ${data.available_to_withdraw >= 0 ? 'text-success' : 'text-error'}`}
            >
              {fmt(data.available_to_withdraw)} ₽
            </span>
          </div>
        </div>
      </div>

      {/* Expense modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface rounded-xl border border-line p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">Изменить расходы</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-subtle hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-sm text-subtle mb-1">Сумма расходов (₽)</label>
              <input
                type="number"
                value={expenseInput}
                onChange={e => setExpenseInput(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-2 text-sm border border-line rounded-lg hover:bg-panel text-ink transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={saveExpenses}
                disabled={saving}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
