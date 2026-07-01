import { useState, useEffect, FormEvent } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, Copy, Plus, Minus, ChevronDown, Gift, Coins, Crown,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { apiCall } from '../lib/api'
import { formatDate } from '../lib/format'
import Modal from '../components/Modal'
import BuyTokensModal from '../components/Gost/BuyTokensModal'
import { GlassCard, Button, Chip } from '../components/glass'

// ─── VIP purchase confirm (one-off modal, pattern follows useGostFrozenModal) ─

type VipPlan = 'month' | 'year'
const VIP_PLAN_META: Record<VipPlan, { label: string; price: number }> = {
  month: { label: 'Месяц', price: 300 },
  year:  { label: 'Год',   price: 1500 },
}

function useVipPurchaseModal(onPurchased: () => void) {
  const toast = useToast()
  const [plan, setPlan] = useState<VipPlan | null>(null)
  const [buying, setBuying] = useState(false)

  async function confirm() {
    if (!plan || buying) return
    setBuying(true)
    try {
      await apiCall('POST', '/wallet/vip', { plan })
      toast('VIP-статус активирован', 'success')
      onPurchased()
      setPlan(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось оформить VIP'
      toast(message, 'error')
    } finally {
      setBuying(false)
    }
  }

  const modal = plan && (
    <Modal open={!!plan} onClose={() => !buying && setPlan(null)} title="Оформление VIP">
      <p className="text-sm text-subtle leading-relaxed mb-4">
        Оформить VIP «{VIP_PLAN_META[plan].label}» за {VIP_PLAN_META[plan].price.toLocaleString('ru-RU')} ₽?
        Сумма спишется с баланса кошелька.
      </p>
      <Button variant="mint" disabled={buying} onClick={confirm} className="w-full justify-center">
        {buying ? 'Оформляем...' : 'Подтвердить'}
      </Button>
    </Modal>
  )

  return { openVipPurchase: (p: VipPlan) => setPlan(p), vipPurchaseModal: modal }
}

const API = import.meta.env.VITE_BACKEND_URL as string

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
  pending:   { label: 'В обработке', cls: 'text-gold bg-gold/10'   },
  completed: { label: 'Выполнено',   cls: 'text-mint bg-mint/10'   },
  rejected:  { label: 'Отклонено',   cls: 'text-error bg-error/10' },
}

const INCOME_TYPES = new Set([
  'deposit', 'order_payout', 'dispute_refund_customer',
  'deposit_release', 'order_cancel_refund', 'referral_bonus',
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-panel animate-pulse rounded-lg ${className ?? ''}`} />
}

const INPUT = 'w-full px-3 py-2.5 rounded-[12px] border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-lav/30 focus:border-lav/40 transition-colors'

// ─── Money chart (hand-rolled SVG — recharts isn't an installed dep) ──────────

interface ChartPoint { month: string; income: number; expense: number }

function MoneyChart({ points }: { points: ChartPoint[] }) {
  const W = 600, H = 140, pad = 8
  const max = Math.max(1, ...points.flatMap(p => [p.income, p.expense]))
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2)
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2)
  const line = (key: 'income' | 'expense') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p[key])}`).join(' ')
  const area = (key: 'income' | 'expense') =>
    `${line(key)} L ${x(points.length - 1)} ${H - pad} L ${x(0)} ${H - pad} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32">
        <path d={area('income')} fill="#4ade80" opacity={0.15} />
        <path d={area('expense')} fill="#f87171" opacity={0.15} />
        <path d={line('income')} fill="none" stroke="#4ade80" strokeWidth={2} />
        <path d={line('expense')} fill="none" stroke="#f87171" strokeWidth={2} />
        {points.map((p, i) => (
          <g key={p.month}>
            <circle cx={x(i)} cy={y(p.income)} r={6} fill="transparent"><title>{p.month}: +{p.income.toLocaleString('ru-RU')} ₽</title></circle>
            <circle cx={x(i)} cy={y(p.expense)} r={6} fill="transparent"><title>{p.month}: −{p.expense.toLocaleString('ru-RU')} ₽</title></circle>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[11px] text-subtle mt-1.5">
        {points.map(p => <span key={p.month}>{p.month}</span>)}
      </div>
      <div className="flex items-center gap-4 text-xs text-subtle mt-2">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#4ade80]" /> доходы</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#f87171]" /> расходы</span>
      </div>
    </div>
  )
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: Transaction }) {
  const income = INCOME_TYPES.has(tx.type)
  const status = STATUS_META[tx.status] ?? { label: tx.status, cls: 'bg-panel text-subtle' }
  const date   = new Date(tx.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <div className="flex items-center gap-3.5 py-3.5 px-1">
      <div className={`w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0 ${income ? 'bg-mint/[.15]' : 'bg-error/[.15]'}`}>
        {income
          ? <Plus  size={16} className="text-mint" />
          : <Minus size={16} className="text-error" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-ink">{TX_LABELS[tx.type] ?? tx.type}</p>
        {tx.admin_comment && (
          <p className="text-xs text-subtle truncate mt-0.5">{tx.admin_comment}</p>
        )}
      </div>
      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 ${status.cls}`}>{status.label}</span>
      <div className="text-right shrink-0 min-w-[96px]">
        <p className={`text-base font-bold ${income ? 'text-mint' : 'text-ink'}`}>
          {income ? '+' : '−'}{Math.abs(tx.amount).toLocaleString('ru-RU')} ₽
        </p>
        <span className="text-xs text-subtle">{date}</span>
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
          <Button type="submit" variant="mint" disabled={submitting} className="w-full justify-center">
            {submitting ? 'Отправляем...' : 'Отправить заявку'}
          </Button>
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
        <Button type="submit" variant="mint" disabled={submitting} className="w-full justify-center">
          {submitting ? 'Отправляем...' : 'Отправить заявку'}
        </Button>
      </form>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TxFilter = 'all' | 'in' | 'out'

export default function Wallet() {
  const { user, session, profile, isVip, refreshProfile } = useAuth()
  const toast = useToast()
  const { openVipPurchase, vipPurchaseModal } = useVipPurchaseModal(refreshProfile)

  const [balance, setBalance]           = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading]       = useState(true)
  const [txOffset, setTxOffset]         = useState(0)
  const [hasMore, setHasMore]           = useState(false)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [txFilter, setTxFilter]         = useState<TxFilter>('all')

  const [instructions, setInstructions] = useState<string | null>(null)
  const [depositOpen, setDepositOpen]   = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const [tokenBalance, setTokenBalance] = useState(0)
  const [tokenPrice, setTokenPrice]     = useState(10)
  const [unlimited, setUnlimited]       = useState(false)
  const [buyTokensOpen, setBuyTokensOpen] = useState(false)

  const [chart, setChart] = useState<ChartPoint[]>([])

  const token = session?.access_token ?? null

  useEffect(() => {
    if (!user) return
    fetchBalance()
    fetchTransactions(0, true)
    fetchInstructions()
    apiCall('GET', '/wallet/chart').then(d => setChart(Array.isArray(d) ? d : [])).catch(() => setChart([]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!token) return
    fetch(`${API}/gost/token-balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setTokenBalance(d.token_balance ?? 0)
        setUnlimited(d.unlimited_access ?? false)
        setTokenPrice(d.token_price ?? 10)
      })
      .catch(() => {})
  }, [token])

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

  const filteredTx = transactions.filter(tx => {
    if (txFilter === 'all') return true
    const income = INCOME_TYPES.has(tx.type)
    return txFilter === 'in' ? income : !income
  })
  const totalIncome  = transactions.filter(tx => INCOME_TYPES.has(tx.type)).reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalExpense = transactions.filter(tx => !INCOME_TYPES.has(tx.type)).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="min-w-0">
          {/* Баланс */}
          <GlassCard
            className="rounded-[26px] px-8 py-7 mb-4 relative overflow-hidden !border-white/20"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.5), rgba(219,39,119,.4) 60%, rgba(14,165,233,.4))' }}
          >
            <div className="absolute w-[280px] h-[280px] rounded-full -right-20 -top-32 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,.25), transparent 70%)' }} />
            <p className="text-[13px] text-white/80 font-medium tracking-wide relative">Текущий баланс</p>
            {balanceLoading ? (
              <Skeleton className="h-14 w-48 my-2" />
            ) : (
              <div className="flex items-baseline gap-2.5 mt-2 mb-1 relative">
                <span className="text-[54px] font-extrabold tracking-[-2px] leading-none text-white">{currentBalance.toLocaleString('ru-RU')}</span>
                <span className="text-2xl font-semibold opacity-85 text-white">₽</span>
              </div>
            )}
            <p className="text-[13px] text-white/75 relative">Доступно к выводу и оплате на платформе · рубли</p>
            <div className="flex gap-2.5 mt-5 relative">
              <Button variant="mint" onClick={() => setDepositOpen(true)} className="flex-1 justify-center">
                <ArrowDownCircle size={16} /> Пополнить
              </Button>
              <Button variant="ghost" onClick={() => setWithdrawOpen(true)} className="flex-1 justify-center">
                <ArrowUpCircle size={16} /> Вывести
              </Button>
            </div>
          </GlassCard>

          {/* Мини-статы */}
          <div className="grid grid-cols-2 gap-3.5 mb-4">
            <GlassCard className="rounded-[18px] p-5 min-w-0">
              <div className="text-[12.5px] text-subtle whitespace-nowrap">↓ Получено</div>
              <b className="block text-xl sm:text-2xl font-bold mt-2 tracking-[-.5px] text-mint whitespace-nowrap">+{totalIncome.toLocaleString('ru-RU')} ₽</b>
            </GlassCard>
            <GlassCard className="rounded-[18px] p-5 min-w-0">
              <div className="text-[12.5px] text-subtle whitespace-nowrap">↑ Потрачено</div>
              <b className="block text-xl sm:text-2xl font-bold mt-2 tracking-[-.5px] text-ink whitespace-nowrap">−{totalExpense.toLocaleString('ru-RU')} ₽</b>
            </GlassCard>
          </div>

          {/* Реферальная программа */}
          {profile?.referral_code && (
            <GlassCard className="rounded-[20px] p-5 mb-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Gift size={18} className="text-lav" />
                <h2 className="font-semibold text-ink">Реферальная программа</h2>
              </div>
              <p className="text-sm text-subtle mb-4">
                Приглашайте друзей — получайте 5% от каждого из их первых трёх пополнений от 100 ₽.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-canvas border border-line rounded-[12px] px-3 py-2.5 text-sm font-mono text-ink tracking-wide">
                  {profile.referral_code}
                </code>
                <button
                  onClick={copyReferralLink}
                  className="flex items-center gap-1.5 px-3 py-2.5 border border-line rounded-[12px] text-sm text-subtle hover:text-ink hover:bg-panel transition-colors shrink-0"
                >
                  <Copy size={14} />
                  Скопировать
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
                  <span>Заработано: <span className="text-mint font-medium">{(profile.referral_earnings ?? 0).toLocaleString('ru-RU')} ₽</span></span>
                )}
              </div>
            </GlassCard>
          )}

          {/* Движение средств */}
          <GlassCard className="rounded-[20px] p-5 mb-4">
            <h3 className="text-sm font-semibold text-ink mb-4">Движение средств</h3>
            {chart.every(p => p.income === 0 && p.expense === 0) ? (
              <p className="text-sm text-subtle text-center py-6">Пока нет движения средств</p>
            ) : (
              <MoneyChart points={chart} />
            )}
          </GlassCard>

          {/* История операций */}
          <div className="flex items-center mb-3.5">
            <div className="text-[13px] tracking-wide uppercase text-subtle font-semibold">История транзакций</div>
            <div className="ml-auto flex gap-2">
              <Chip active={txFilter === 'all'} onClick={() => setTxFilter('all')}>Все</Chip>
              <Chip active={txFilter === 'in'}  onClick={() => setTxFilter('in')}>Доходы</Chip>
              <Chip active={txFilter === 'out'} onClick={() => setTxFilter('out')}>Расходы</Chip>
            </div>
          </div>

          <GlassCard className="rounded-[20px] px-3 py-1">
            <div className="divide-y divide-white/[.08]">
              {txLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="py-4 flex items-center gap-3.5">
                    <Skeleton className="w-11 h-11 rounded-[13px] shrink-0" />
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
              ) : filteredTx.length === 0 ? (
                <p className="text-sm text-subtle py-10 text-center">Операций пока нет</p>
              ) : (
                filteredTx.map(tx => <TxRow key={tx.id} tx={tx} />)
              )}
            </div>

            {hasMore && (
              <div className="pb-3 pt-1">
                <button
                  onClick={() => fetchTransactions(txOffset, false)}
                  disabled={loadingMore}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-subtle hover:text-ink border border-line rounded-xl hover:bg-panel disabled:opacity-50 transition-colors"
                >
                  <ChevronDown size={16} />
                  {loadingMore ? 'Загружаем...' : 'Загрузить ещё'}
                </button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <GlassCard className="rounded-[20px] p-5">
            <h3 className="text-sm font-semibold mb-3.5 flex items-center gap-2 text-ink"><Crown size={16} className="text-gold" /> VIP-статус</h3>
            {isVip ? (
              <p className="text-sm text-subtle">
                Активен до <span className="text-ink font-medium">{formatDate(profile?.vip_expires_at)}</span>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <Button variant="mint" onClick={() => openVipPurchase('month')} className="w-full justify-center">
                  Месяц — 300 ₽
                </Button>
                <Button variant="ghost" onClick={() => openVipPurchase('year')} className="w-full justify-center">
                  Год — 1500 ₽
                </Button>
              </div>
            )}
          </GlassCard>

          <GlassCard className="rounded-[20px] p-5">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2 text-ink">◈ ГОСТ-токены</h3>
            <p className="text-xs text-subtle mb-4">Курс 1 ₮ = {tokenPrice} ₽ · списывается с баланса</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-[13px] bg-mint/[.15] grid place-items-center shrink-0">
                <Coins size={18} className="text-mint" />
              </div>
              <div>
                <b className="text-lg font-bold text-ink">{unlimited ? 'Безлимит' : `${tokenBalance} ₮`}</b>
                <div className="text-xs text-subtle">текущий баланс</div>
              </div>
            </div>
            {token && !unlimited && (
              <Button variant="mint" onClick={() => setBuyTokensOpen(true)} className="w-full justify-center">
                Купить токены
              </Button>
            )}
          </GlassCard>

          <GlassCard className="rounded-[20px] p-5">
            <h3 className="text-sm font-semibold mb-3.5 flex items-center gap-2 text-ink">📊 Сводка</h3>
            <div className="flex items-center py-2.5 text-[13px]">
              <span className="text-subtle">Всего получено</span>
              <b className="ml-auto text-mint font-semibold">+{totalIncome.toLocaleString('ru-RU')} ₽</b>
            </div>
            <div className="flex items-center py-2.5 border-t border-white/[.08] text-[13px]">
              <span className="text-subtle">Всего потрачено</span>
              <b className="ml-auto text-ink font-semibold">−{totalExpense.toLocaleString('ru-RU')} ₽</b>
            </div>
          </GlassCard>
        </div>
      </div>

      {vipPurchaseModal}
      <DepositModal  open={depositOpen}  onClose={() => setDepositOpen(false)}  instructions={instructions} />
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} maxAmount={currentBalance}  />
      {buyTokensOpen && token && (
        <BuyTokensModal
          walletBalance={currentBalance}
          tokenPrice={tokenPrice}
          token={token}
          onClose={() => setBuyTokensOpen(false)}
          onSuccess={(tb, wb) => { setTokenBalance(tb); setBalance(wb); setBuyTokensOpen(false) }}
        />
      )}
    </div>
  )
}
