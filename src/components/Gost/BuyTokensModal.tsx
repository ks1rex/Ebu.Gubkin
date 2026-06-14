import { useState, FormEvent } from 'react'
import { X, Coins } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

const API = import.meta.env.VITE_BACKEND_URL as string

interface Props {
  walletBalance: number
  tokenPrice: number
  token: string
  onClose: () => void
  onSuccess: (newTokenBalance: number, newWalletBalance: number) => void
}

export default function BuyTokensModal({ walletBalance, tokenPrice, token, onClose, onSuccess }: Props) {
  const showToast = useToast()
  const [amount,   setAmount]   = useState(10)
  const [loading,  setLoading]  = useState(false)

  const cost = amount * tokenPrice
  const canAfford = walletBalance >= cost

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canAfford || amount < 1) return
    setLoading(true)
    try {
      const res  = await fetch(`${API}/gost/buy-tokens`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ token_amount: amount }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Ошибка при покупке токенов', 'error'); return }
      showToast(`Куплено ${amount} токенов`, 'success')
      onSuccess(data.token_balance, data.balance)
      onClose()
    } catch {
      showToast('Не удалось выполнить покупку', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div className="flex items-center gap-2">
            <Coins size={18} className="text-accent" />
            <h2 className="font-semibold text-ink">Купить ГОСТ-токены</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-subtle hover:text-ink hover:bg-panel transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Количество токенов</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={amount}
              onChange={e => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div className="bg-panel rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-subtle">Цена за токен</span>
              <span className="text-ink font-medium">{tokenPrice} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-subtle">Итого</span>
              <span className="text-ink font-semibold">{cost.toFixed(2)} ₽</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2">
              <span className="text-subtle">Баланс кошелька</span>
              <span className={`font-medium ${canAfford ? 'text-success' : 'text-error'}`}>
                {walletBalance.toFixed(2)} ₽
              </span>
            </div>
          </div>

          {!canAfford && (
            <p className="text-xs text-error">Недостаточно средств. Пополните кошелёк.</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-line rounded-lg text-ink hover:bg-panel transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={!canAfford || loading || amount < 1}
              className="flex-1 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
              {loading ? 'Покупка…' : `Купить ${amount} токенов`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
