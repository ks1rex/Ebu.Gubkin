import { useState, useEffect, FormEvent } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, Copy,
  Plus, Minus, ChevronDown, Gift,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  created_at: string
  admin_comment: string | null
}

const PAGE_SIZE = 20

const TX_LABELS: Record<string, string> = {
  deposit:                 'Пополнение',
  withdrawal:              'Вывод',
  order_payment:           'Оплата заказа',
  order_cancel_refund:     'Возврат (отмена)',
  order_topup:             'Доплата по заказу',
  order_payout:            'Выплата',
  dispute_refund_customer: 'Возврат (спор)',
  deposit_hold:            'Заморозка средств',
  deposit_release:         'Разморозка средств',
  deposit_forfeit:         'Конфискация',
  referral_bonus:          'Реферальный бонус',
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'В обработке', cls: 'bg-warning/10 text-warning'   },
  completed: { label: 'Выполнено',   cls: 'bg-success/10 text-success'   },
  rejected:  { label: 'Отклонено',   cls: 'bg-error/10 text-error'       },
}

const INCOME_TYPES = new Set([
  'deposit', 'order_payout', 'dispute_refund_customer',
  'deposit_release', 'order_cancel_refund', 'referral_bonus',
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-panel animate-pulse rounded-lg ${className ?? ''}`} />
}

const INPUT = 'w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors'

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: Transaction }) {
  const income = INCOME_TYPES.has(tx.type)
  const status = STATUS_META[tx.status] ?? { label: tx.status, cls: 'bg-panel text-subtle' }
  const date   = new Date(tx.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${income ? 'bg-success/10' : 'bg-error/10'}`}>
        {income
          ? <Plus  size={14} className="text-success" />
          : <Minus size={14} className="text-error"   />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink">{TX_LABELS[tx.type] ?? tx.type}</p>
        {tx.admin_comment && (
          <p className="text-xs text-subtle truncate mt-0.5">{tx.admin_comment}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${income ? 'text-success' : 'text-error'}`}>
          {income ? '+' : '−'}{Math.abs(tx.amount).toLocaleString('ru-RU')} ₽
        </p>
        <div className="flex items-center gap-1.5 justify-end mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${status.cls}`}>{status.label}</span>
          <span className="text-xs text-subtle">{date}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Deposit modal ────────────────────────────────────────────────────────────

interface DepositModalProps {
  open: boolean
  onClose: () => void
  instructions: string | null
}

function DepositModal({ open, onClose, instructions }: DepositModalProps) {
  const { session } = useAuth()
  const toast = useToast()
  const [amount, setAmount]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!num || num < 1) { toast('Минимальная сумма — 1 ₽', 'error'); return }

    const backendUrl = import.meta.env.VITE_BACKEND_URL
    if (!backendUrl) { toast('VITE_BACKEND_URL не задан в .env.local', 'error'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`${backendUrl}/wallet/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ claimed_amount: num }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Ошибка сервера (${res.status})`)
      }
      toast('Заявка отправлена — ожидайте подтверждения администратора', 'success')
      setAmount('')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Пополнение баланса">
      <div className="space-y-4">
        <div className="p-3 bg-accent-subtle rounded-lg text-sm text-ink leading-relaxed">
          {instructions ??
            'Переведите нужную сумму по реквизитам администратора, затем заполните форму ниже. Пополнение подтверждается вручную в течение рабочего дня.'}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Сумма пополнения (₽)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="1 000"
              className={INPUT}
            />
            <p className="text-xs text-subtle mt-1">Комиссия 10% — на баланс поступит 90% от суммы</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Отправляем...' : 'Отправить заявку'}
          </button>
        </form>
      </div>
    </Modal>
  )
}

// ─── Withdraw modal ───────────────────────────────────────────────────────────

interface WithdrawModalProps {
  open: boolean
  onClose: () => void
  maxAmount: number
}

function WithdrawModal({ open, onClose, maxAmount }: WithdrawModalProps) {
  const { session } = useAuth()
  const toast = useToast()
  const [amount, setAmount]         = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!num || num < 1)       { toast('Минимальная сумма — 1 ₽', 'error'); return }
    if (num > maxAmount)        { toast(`Недостаточно средств. Доступно: ${maxAmount.toLocaleString('ru-RU')} ₽`, 'error'); return }
    if (!cardNumber.trim())     { toast('Введите реквизиты для вывода', 'error'); return }

    const backendUrl = import.meta.env.VITE_BACKEND_URL
    if (!backendUrl) { toast('VITE_BACKEND_URL не задан в .env.local', 'error'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`${backendUrl}/wallet/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ amount: num, card_number: cardNumber.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Ошибка сервера (${res.status})`)
      }
      toast('Заявка на вывод отправлена — средства будут переведены в течение рабочего дня', 'success')
      setAmount('')
      setCardNumber('')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Вывод средств">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Сумма вывода (₽)</label>
          <input
            type="number"
            min="1"
            max={maxAmount}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="500"
            className={INPUT}
          />
          <p className="text-xs text-subtle mt-1">Доступно: {maxAmount.toLocaleString('ru-RU')} ₽</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Реквизиты (номер карты или телефон)</label>
          <input
            type="text"
            value={cardNumber}
            onChange={e => setCardNumber(e.target.value)}
            placeholder="2200 1234 5678 9012"
            className={INPUT}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Отправляем...' : 'Отправить заявку'}
        </button>
      </form>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Wallet() {
  const { user, profile } = useAuth()
  const toast = useToast()

  const [balance, setBalance]           = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading]       = useState(true)
  const [txOffset, setTxOffset]         = useState(0)
  const [hasMore, setHasMore]           = useState(false)
  const [loadingMore, setLoadingMore]   = useState(false)

  const [instructions, setInstructions] = useState<string | null>(null)
  const [depositOpen, setDepositOpen]   = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchBalance()
    fetchTransactions(0, true)
    fetchInstructions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchBalance() {
    setBalanceLoading(true)
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user!.id)
      .maybeSingle()
    setBalance(data?.balance ?? profile?.balance ?? 0)
    setBalanceLoading(false)
  }

  async function fetchTransactions(offset: number, reset: boolean) {
    if (reset) { setTxLoading(true); setTransactions([]) }
    else setLoadingMore(true)

    const { data, count } = await supabase
      .from('transactions')
      .select('id, type, amount, status, created_at, admin_comment', { count: 'exact' })
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    const rows = (data ?? []) as Transaction[]

    if (reset) setTransactions(rows)
    else       setTransactions(prev => [...prev, ...rows])

    setTxOffset(offset + PAGE_SIZE)
    setHasMore((count ?? 0) > offset + PAGE_SIZE)

    if (reset) setTxLoading(false)
    else       setLoadingMore(false)
  }

  async function fetchInstructions() {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'payment_requisites')
      .maybeSingle()
    setInstructions(data?.value ?? null)
  }

  async function copyReferralLink() {
    if (!profile?.referral_code) return
    const link = `${window.location.origin}/register?ref=${profile.referral_code}`
    try {
      await navigator.clipboard.writeText(link)
      toast('Реферальная ссылка скопирована', 'success')
    } catch {
      toast('Не удалось скопировать', 'error')
    }
  }

  const currentBalance = balance ?? profile?.balance ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-ink">Кошелёк</h1>

      {/* ── Баланс ── */}
      <div className="bg-surface border border-line rounded-xl p-6">
        <p className="text-sm text-subtle mb-1">Доступный баланс</p>
        {balanceLoading ? (
          <Skeleton className="h-11 w-44 mb-4" />
        ) : (
          <p className="text-4xl font-bold text-ink tracking-tight mb-4">
            {currentBalance.toLocaleString('ru-RU')} ₽
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setDepositOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            <ArrowDownCircle size={16} />
            Пополнить
          </button>
          <button
            onClick={() => setWithdrawOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-line text-ink text-sm font-medium rounded-lg hover:bg-panel transition-colors"
          >
            <ArrowUpCircle size={16} />
            Вывести
          </button>
        </div>
      </div>

      {/* ── Реферальная программа ── */}
      {profile?.referral_code && (
        <div className="bg-surface border border-line rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Gift size={18} className="text-accent" />
            <h2 className="font-semibold text-ink">Реферальная программа</h2>
          </div>
          <p className="text-sm text-subtle mb-4">
            Приглашайте друзей — получайте 5% от каждого из их первых трёх пополнений от 100 ₽.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-mono text-ink tracking-wide">
              {profile.referral_code}
            </code>
            <button
              onClick={copyReferralLink}
              className="flex items-center gap-1.5 px-3 py-2 border border-line rounded-lg text-sm text-subtle hover:text-ink hover:bg-panel transition-colors shrink-0"
            >
              <Copy size={14} />
              Скопировать ссылку
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-subtle">
            {(profile.referral_registered_count ?? 0) > 0 && (
              <span>Приглашено: <span className="text-ink font-medium">{profile.referral_registered_count}</span></span>
            )}
            {(profile.referral_qualifying_deposits_count ?? 0) > 0 && (
              <span>Бонусных пополнений: <span className="text-ink font-medium">{profile.referral_qualifying_deposits_count} / {3}</span></span>
            )}
            {(profile.referral_earnings ?? 0) > 0 && (
              <span>Заработано: <span className="text-success font-medium">{(profile.referral_earnings ?? 0).toLocaleString('ru-RU')} ₽</span></span>
            )}
          </div>
        </div>
      )}

      {/* ── История операций ── */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="font-semibold text-ink">История операций</h2>
        </div>

        <div className="px-6 divide-y divide-line">
          {txLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-4 flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2 items-end flex flex-col">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : transactions.length === 0 ? (
            <p className="text-sm text-subtle py-10 text-center">Операций пока нет</p>
          ) : (
            transactions.map(tx => <TxRow key={tx.id} tx={tx} />)
          )}
        </div>

        {hasMore && (
          <div className="px-6 pb-5 pt-1">
            <button
              onClick={() => fetchTransactions(txOffset, false)}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-subtle hover:text-ink border border-line rounded-lg hover:bg-panel disabled:opacity-50 transition-colors"
            >
              <ChevronDown size={16} />
              {loadingMore ? 'Загружаем...' : 'Загрузить ещё'}
            </button>
          </div>
        )}
      </div>

      <DepositModal  open={depositOpen}  onClose={() => setDepositOpen(false)}  instructions={instructions} />
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} maxAmount={currentBalance}  />
    </div>
  )
}
