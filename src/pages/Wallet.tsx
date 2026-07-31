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
const VIP_PLAN_LABEL: Record<VipPlan, string> = { month: 'Месяц', year: 'Год' }

interface VipPricing {
  monthPrice: number
  yearPrice: number
  monthBasePrice: number
  yearBasePrice: number
  discountPercent: number
  gostTokenDiscountPercent: number
}

// nbsp перед ₽: с обычным пробелом «1 500 ₽» рвётся на две строки в узких ячейках/кнопках.
const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

// Prices come from the backend (admin_settings + the user's level discount) —
// never hardcoded here, so a level-10 user sees the free-activation flow.
function useVipPricing(): VipPricing | null {
  const [pricing, setPricing] = useState<VipPricing | null>(null)
  useEffect(() => {
    apiCall('GET', '/wallet/vip/price').then(setPricing).catch(() => {})
  }, [])
  return pricing
}

function useVipPurchaseModal(onPurchased: () => void, pricing: VipPricing | null) {
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

  const price = plan && pricing ? (plan === 'month' ? pricing.monthPrice : pricing.yearPrice) : null
  const free = price === 0

  const modal = plan && (
    <Modal open={!!plan} onClose={() => !buying && setPlan(null)} title="Оформление VIP">
      <p className="text-sm text-subtle leading-relaxed mb-4">
        {free
          ? `Активировать VIP «${VIP_PLAN_LABEL[plan]}» бесплатно? Скидка ${pricing?.discountPercent}% за ваш уровень.`
          : `Оформить VIP «${VIP_PLAN_LABEL[plan]}»${price !== null ? ` за ${rub(price)}` : ''}? Сумма спишется с баланса кошелька.`}
      </p>
      <Button variant="mint" disabled={buying} onClick={confirm} className="w-full justify-center">
        {buying ? 'Оформляем...' : free ? 'Активировать' : 'Подтвердить'}
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
        <path d={area('income')} className="fill-success" opacity={0.15} />
        <path d={area('expense')} className="fill-error" opacity={0.15} />
        <path d={line('income')} fill="none" className="stroke-success" strokeWidth={2} />
        <path d={line('expense')} fill="none" className="stroke-error" strokeWidth={2} />
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
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-success" /> доходы</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-error" /> расходы</span>
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
    <div className="flex items-center gap-2.5 sm:gap-3.5 py-3.5 px-1">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] flex items-center justify-center shrink-0 ${income ? 'bg-mint/[.15]' : 'bg-error/[.15]'}`}>
        {income
          ? <Plus  size={16} className="text-mint" />
          : <Minus size={16} className="text-error" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-ink truncate">{TX_LABELS[tx.type] ?? tx.type}</p>
        {tx.admin_comment && (
          <p className="text-xs text-subtle truncate mt-0.5">{tx.admin_comment}</p>
        )}
        {/* ponytail: на мобильном статус уезжает под заголовок — иконка + бейдж +
            сумма в одну строку не влезают в 264px и название сжималось до нуля.
            Дублирующий span дешевле, чем перекладывать всю строку на grid. */}
        <span className={`sm:hidden inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg ${status.cls}`}>{status.label}</span>
      </div>
      <span className={`hidden sm:inline-block text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 ${status.cls}`}>{status.label}</span>
      <div className="text-right shrink-0 sm:min-w-[96px]">
        <p className={`text-sm sm:text-base font-bold whitespace-nowrap ${income ? 'text-mint' : 'text-ink'}`}>
          {income ? '+' : '−'}{Math.abs(tx.amount).toLocaleString('ru-RU')} ₽
        </p>
        <span className="text-xs text-subtle whitespace-nowrap">{date}</span>
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
        <div className="p-3 bg-accent-subtle rounded-lg text-sm text-ink leading-relaxed whitespace-pre-line">
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
            {parseFloat(amount) > 0 && (
              <div className="mt-2 p-3 bg-success/10 border border-success/30 rounded-lg">
                <div className="text-xs text-subtle mb-0.5">На баланс поступит (без комиссии)</div>
                <div className="text-lg font-bold text-success">{parseFloat(amount).toLocaleString('ru-RU')} ₽</div>
              </div>
            )}
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
  depositedBalance: number
  earnedBalance: number
}

// Минимумы дублируют бэкенд (routes/wallet.js WITHDRAWAL_MIN) — здесь только
// ради мгновенной подсказки; отказ всё равно за сервером.
type WithdrawMethod = 'sbp' | 'card'
type BalanceSource  = 'deposited' | 'earned'
const WITHDRAWAL_MIN: Record<WithdrawMethod, number> = { sbp: 500, card: 4000 }
const METHOD_LABEL:   Record<WithdrawMethod, string> = { sbp: 'СБП', card: 'Карта' }

function WithdrawModal({ open, onClose, depositedBalance, earnedBalance }: WithdrawModalProps) {
  const { session } = useAuth()
  const toast = useToast()
  const [amount, setAmount]         = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [method, setMethod]         = useState<WithdrawMethod>('sbp')
  const [source, setSource]         = useState<BalanceSource>('deposited')
  const [commissionPct, setCommissionPct] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    apiCall('GET', '/settings/public/commissions')
      .then((r: { withdrawal_commission_pct: number }) => setCommissionPct(r.withdrawal_commission_pct))
      .catch(() => setCommissionPct(null))
  }, [open])

  // Заработанное выводится без комиссии, занесённое — по ставке платформы.
  const pct = source === 'earned' ? 0 : commissionPct
  const maxAmount  = source === 'earned' ? earnedBalance : depositedBalance
  const minAmount  = WITHDRAWAL_MIN[method]
  const parsedAmount = parseFloat(amount)
  const willReceive = pct != null && parsedAmount > 0
    ? Math.round(parsedAmount * (1 - pct / 100) * 100) / 100
    : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!num || num < minAmount) { toast(`Минимальная сумма для «${METHOD_LABEL[method]}» — ${minAmount.toLocaleString('ru-RU')} ₽`, 'error'); return }
    if (num > maxAmount)         { toast(`Недостаточно средств. Доступно: ${maxAmount.toLocaleString('ru-RU')} ₽`, 'error'); return }
    if (!cardNumber.trim())      { toast('Введите реквизиты для вывода', 'error'); return }

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
        body: JSON.stringify({
          amount: num,
          card_number: cardNumber.trim(),
          withdrawal_method: method,
          source_balance: source,
        }),
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

  const tab = (active: boolean) =>
    `flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
      active ? 'border-accent bg-accent/15 text-ink' : 'border-line text-subtle hover:text-ink'
    }`

  return (
    <Modal open={open} onClose={onClose} title="Вывод средств">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Откуда выводим</label>
          <div className="flex gap-2">
            <button type="button" className={tab(source === 'deposited')} onClick={() => setSource('deposited')}>
              Занесённый · {depositedBalance.toLocaleString('ru-RU')} ₽
            </button>
            <button type="button" className={tab(source === 'earned')} onClick={() => setSource('earned')}>
              Заработанный · {earnedBalance.toLocaleString('ru-RU')} ₽
            </button>
          </div>
          <p className="text-xs text-subtle mt-1">
            Одна заявка — один баланс. Комиссия: занесённый {commissionPct ?? 10}%, заработанный 0%.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Способ вывода</label>
          <div className="flex gap-2">
            {(['sbp', 'card'] as WithdrawMethod[]).map(m => (
              <button key={m} type="button" className={tab(method === m)} onClick={() => setMethod(m)}>
                {METHOD_LABEL[m]} · от {WITHDRAWAL_MIN[m].toLocaleString('ru-RU')} ₽
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Сумма вывода (₽)</label>
          <input
            type="number"
            min={minAmount}
            max={maxAmount}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={String(minAmount)}
            className={INPUT}
          />
          <p className="text-xs text-subtle mt-1">
            Доступно: {maxAmount.toLocaleString('ru-RU')} ₽ · минимум {minAmount.toLocaleString('ru-RU')} ₽
          </p>
          {willReceive != null && (
            <div className="mt-2 p-3 bg-success/10 border border-success/30 rounded-lg">
              <div className="text-xs text-subtle mb-0.5">
                {pct ? `К получению (комиссия за вывод ${pct}%)` : 'К получению (без комиссии)'}
              </div>
              <div className="text-lg font-bold text-success">{willReceive.toLocaleString('ru-RU')} ₽</div>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Реквизиты (номер карты или телефон)</label>
          <input
            type="text"
            value={cardNumber}
            onChange={e => setCardNumber(e.target.value)}
            placeholder={method === 'sbp' ? '+7 900 123-45-67' : '2200 1234 5678 9012'}
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
  const vipPricing = useVipPricing()
  const { openVipPurchase, vipPurchaseModal } = useVipPurchaseModal(refreshProfile, vipPricing)

  const [balance, setBalance]           = useState<number | null>(null)
  const [deposited, setDeposited]       = useState<number | null>(null)
  const [earned, setEarned]             = useState<number | null>(null)
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
    // Баланс живёт на profiles (таблицы wallets в схеме нет — прежний запрос
    // сюда всегда падал в фолбэк на profile).
    const { data } = await supabase
      .from('profiles')
      .select('balance, deposited_balance, earned_balance')
      .eq('id', user!.id)
      .maybeSingle()
    setBalance(data?.balance ?? profile?.balance ?? 0)
    setDeposited(data?.deposited_balance ?? profile?.deposited_balance ?? 0)
    setEarned(data?.earned_balance ?? profile?.earned_balance ?? 0)
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
    // ponytail: админка сохраняет реквизиты под ключом deposit_instructions,
    // а миграция 0013 засеяла пустой payment_requisites — читаем оба, приоритет у нового.
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['deposit_instructions', 'payment_requisites'])
    const byKey = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
    const value = byKey.deposit_instructions || byKey.payment_requisites
    setInstructions(value?.trim() ? value : null)
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

  const currentBalance   = balance ?? profile?.balance ?? 0
  const depositedBalance = deposited ?? profile?.deposited_balance ?? 0
  const earnedBalance    = earned ?? profile?.earned_balance ?? 0

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
            className="rounded-[26px] px-5 py-6 sm:px-8 sm:py-7 mb-4 relative overflow-hidden !border-white/20"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.5), rgba(219,39,119,.4) 60%, rgba(14,165,233,.4))' }}
          >
            <div className="absolute w-[280px] h-[280px] rounded-full -right-20 -top-32 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,.25), transparent 70%)' }} />
            <p className="text-[13px] text-white/80 font-medium tracking-wide relative">Текущий баланс</p>
            {balanceLoading ? (
              <Skeleton className="h-14 w-48 my-2" />
            ) : (
              <div className="flex items-baseline gap-2.5 mt-2 mb-1 relative">
                {/* 54px не влезает в 224px контента на 320px-экране при
                    шестизначном балансе — карточка с overflow-hidden обрезала цифры */}
                <span className="text-[38px] sm:text-[54px] font-extrabold tracking-[-2px] leading-none text-white">{currentBalance.toLocaleString('ru-RU')}</span>
                <span className="text-xl sm:text-2xl font-semibold opacity-85 text-white">₽</span>
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

          {/* Два баланса: они складываются в общий выше, но живут по разным правилам */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 mb-4">
            <GlassCard className="rounded-[18px] p-4 sm:p-5 min-w-0">
              <div className="flex items-center gap-2">
                <ArrowDownCircle size={15} className="text-lav shrink-0" />
                <span className="text-[12.5px] text-subtle">Занесённый</span>
              </div>
              {balanceLoading ? (
                <Skeleton className="h-7 w-28 my-2" />
              ) : (
                <b className="block text-xl sm:text-2xl font-bold mt-2 tracking-[-.5px] text-ink">
                  {depositedBalance.toLocaleString('ru-RU')} ₽
                </b>
              )}
              <p className="text-[11.5px] text-subtle mt-1.5 leading-snug">
                Деньги из пополнений. При выводе удерживается комиссия 10%.
              </p>
            </GlassCard>
            <GlassCard className="rounded-[18px] p-4 sm:p-5 min-w-0">
              <div className="flex items-center gap-2">
                <ArrowUpCircle size={15} className="text-mint shrink-0" />
                <span className="text-[12.5px] text-subtle">Заработанный</span>
              </div>
              {balanceLoading ? (
                <Skeleton className="h-7 w-28 my-2" />
              ) : (
                <b className="block text-xl sm:text-2xl font-bold mt-2 tracking-[-.5px] text-mint">
                  {earnedBalance.toLocaleString('ru-RU')} ₽
                </b>
              )}
              <p className="text-[11.5px] text-subtle mt-1.5 leading-snug">
                Доход с биржи и реферальной программы. Вывод без комиссии.
              </p>
            </GlassCard>
          </div>

          {/* Мини-статы */}
          <div className="grid grid-cols-2 gap-3 sm:gap-3.5 mb-4">
            <GlassCard className="rounded-[18px] p-3.5 sm:p-5 min-w-0">
              <div className="text-[12px] sm:text-[12.5px] text-subtle whitespace-nowrap">↓ Получено</div>
              <b className="block text-base sm:text-2xl font-bold mt-2 tracking-[-.5px] text-mint whitespace-nowrap">+{totalIncome.toLocaleString('ru-RU')} ₽</b>
            </GlassCard>
            <GlassCard className="rounded-[18px] p-3.5 sm:p-5 min-w-0">
              <div className="text-[12px] sm:text-[12.5px] text-subtle whitespace-nowrap">↑ Потрачено</div>
              <b className="block text-base sm:text-2xl font-bold mt-2 tracking-[-.5px] text-ink whitespace-nowrap">−{totalExpense.toLocaleString('ru-RU')} ₽</b>
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
          {/* flex-wrap: заголовок + три чипа фильтра (~384px) не влезали в 288px */}
          <div className="flex items-center flex-wrap gap-y-2 mb-3.5">
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
                {vipPricing && vipPricing.discountPercent > 0 && (
                  <p className="text-xs text-gold mb-1">Скидка {vipPricing.discountPercent}% за ваш уровень</p>
                )}
                {(['month', 'year'] as const).map((plan, i) => {
                  const price = plan === 'month' ? vipPricing?.monthPrice : vipPricing?.yearPrice
                  const base  = plan === 'month' ? vipPricing?.monthBasePrice : vipPricing?.yearBasePrice
                  // !whitespace-normal: у Button в базе whitespace-nowrap, а
                  // «Месяц — 300 ₽ активировать бесплатно» (10 уровень) не
                  // влезает в 248px сайдбара на мобильном.
                  return (
                    <Button
                      key={plan}
                      variant={i === 0 ? 'mint' : 'ghost'}
                      disabled={!vipPricing}
                      onClick={() => openVipPurchase(plan)}
                      className="w-full justify-center text-center !whitespace-normal"
                    >
                      {VIP_PLAN_LABEL[plan]}
                      {vipPricing && price !== undefined && base !== undefined && (
                        <>
                          {' — '}
                          {price < base && <s className="opacity-60 mr-1.5">{rub(base)}</s>}
                          {price === 0 ? 'активировать бесплатно' : rub(price)}
                        </>
                      )}
                    </Button>
                  )
                })}
                {vipPricing?.monthPrice === 0 && (
                  <p className="text-xs text-subtle">Ваш уровень даёт VIP без списания с баланса.</p>
                )}
              </div>
            )}
          </GlassCard>

          <GlassCard className="rounded-[20px] p-5">
            <h3 className="text-sm font-semibold mb-3.5 flex items-center gap-2 text-ink"><Crown size={16} className="text-gold" /> VIP</h3>
            <ul className="flex flex-col gap-2 text-[13px] text-ink/90 mb-3">
              <li>· Приоритет объявлений на бирже</li>
              <li>· Скидка{vipPricing?.gostTokenDiscountPercent ? ` ${vipPricing.gostTokenDiscountPercent}%` : ''} на ГОСТ-токены</li>
              <li>· Косметика: бейдж, рамка аватара, цветной ник</li>
            </ul>
            <p className="text-xs text-subtle mb-4">На 10 уровне — бесплатно</p>
            <Button to="/vip-info" variant="ghost" className="w-full justify-center">Подробнее →</Button>
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
      <WithdrawModal
        open={withdrawOpen}
        onClose={() => { setWithdrawOpen(false); fetchBalance() }}
        depositedBalance={depositedBalance}
        earnedBalance={earnedBalance}
      />
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
