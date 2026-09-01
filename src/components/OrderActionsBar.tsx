import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, AlertOctagon, DollarSign, XCircle, ChevronDown } from 'lucide-react'
import { apiCall } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

const S: Record<string, any> = {
  wrap: { background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 10, padding: '12px 14px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 10 },
  pending: { border: '1px solid #f59e0b' },
  cancelPending: { border: '1px solid #f87171' },
  topRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  text: { color: '#94a3b8', fontSize: '0.85rem', flex: 1, minWidth: 180 },
  amount: { color: '#e2e8f0', fontWeight: 700 },
  hint: { color: '#64748b', fontSize: '0.76rem' },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { background: '#0e8a7d', border: 'none', borderRadius: 8, padding: '7px 13px', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 },
  btnGhost: { background: 'none', border: '1px solid #1e3a4a', borderRadius: 8, padding: '7px 13px', color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 },
  btnDanger: { background: 'none', border: '1px solid #7f1d1d', borderRadius: 8, padding: '7px 13px', color: '#f87171', fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 },
  btnDangerFilled: { background: '#7f1d1d', border: 'none', borderRadius: 8, padding: '7px 13px', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 },
  input: { background: '#0a1319', border: '1px solid #1e3a4a', borderRadius: 8, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.85rem', width: 120 },
  textarea: { background: '#0a1319', border: '1px solid #1e3a4a', borderRadius: 8, padding: '8px 10px', color: '#e2e8f0', fontSize: '0.85rem', width: '100%', minHeight: 70, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  err: { color: '#f87171', fontSize: '0.8rem' },
  confirmRow: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  confirmItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem' },
  menuWrap: { position: 'relative' },
  menuList: { position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 10, padding: 5, minWidth: 200, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
  menuItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, background: 'none', border: 'none', color: '#e2e8f0', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', width: '100%' },
}

const round2 = (n: number) => Math.round(n * 100) / 100
const DEFAULT_PCT = 11

interface Props {
  order: any
  userId?: string
  onChange: () => void
}

type Mode = 'idle' | 'price' | 'cancel' | 'dispute' | 'confirm'

// Единая плашка действий над заказом в работе: изменить цену, предложить
// отмену по согласию сторон, подтвердить выполнение, открыть спор — раньше
// это были отдельные плашки друг под другом, выглядело криво.
//
// orders.final_amount/base_amount — сумма ИСПОЛНИТЕЛЮ (без комиссии биржи),
// orders.reserved_amount — реально списанная у ЗАКАЗЧИКА сумма (с комиссией).
// Заказчик всегда видит/вводит цену с комиссией, исполнитель — без неё.
export default function OrderActionsBar({ order, userId, onChange }: Props) {
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('idle')
  const [amount, setAmount] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [pct, setPct] = useState(DEFAULT_PCT)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiCall('GET', '/settings/public/commissions')
      .then((r: { marketplace_commission_pct: number }) => setPct(r.marketplace_commission_pct ?? DEFAULT_PCT))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  const isCustomer = order.customer_id === userId
  const isExecutor = order.executor_id === userId
  const charge = (payout: number) => round2(payout * (1 + pct / 100))

  const payoutNow = order.final_amount ?? order.base_amount
  const chargeNow = order.reserved_amount ?? charge(payoutNow)
  const myCurrentLabel = isCustomer ? 'Вы платите' : 'Вам причитается'
  const myCurrentValue = isCustomer ? chargeNow : payoutNow

  const canPriceOrCancel = order.status === 'in_progress'
  const canConfirm = order.status === 'in_progress' || order.status === 'awaiting_confirmation'
    ? !(isCustomer && order.confirmed_by_customer) && !(isExecutor && order.confirmed_by_executor)
    : false
  const canDispute = order.status === 'in_progress' || order.status === 'awaiting_confirmation'

  async function run(action: () => Promise<any>, after?: () => void) {
    setBusy(true)
    setErr('')
    try {
      await action()
      onChange()
      setMode('idle')
      after?.()
    } catch (e: any) {
      if (e.data?.error === 'insufficient_balance') {
        toast(`У заказчика не хватает баланса на доплату (нужно ${e.data.required} ₽) — предложение можно принять после пополнения`, 'error')
      } else {
        setErr(e.message ?? 'Не получилось')
      }
    } finally {
      setBusy(false)
    }
  }

  function proposePrice() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    run(() => apiCall('POST', `/orders/${order.id}/propose-price`, { amount: amt }), () => setAmount(''))
  }

  function submitDispute() {
    if (!disputeReason.trim()) return
    run(() => apiCall('POST', `/orders/${order.id}/dispute`, { reason: disputeReason }), () => setDisputeReason(''))
  }

  // ── Активное предложение цены — приоритетнее обычной панели ──────────────
  if (order.pending_amount != null) {
    const isProposer = order.pending_amount_proposed_by === userId
    const pendingPayout = order.pending_amount
    const pendingCharge = charge(pendingPayout)
    const topup = round2(pendingCharge - (order.reserved_amount ?? 0))

    return (
      <div style={{ ...S.wrap, ...S.pending }}>
        <div style={S.topRow}>
          <div style={S.text}>
            {isProposer ? (
              <>Вы предложили новую цену — {isCustomer ? 'вы будете платить' : 'исполнитель получит'} <span style={S.amount}>{isCustomer ? pendingCharge : pendingPayout} ₽</span> — ждём подтверждения второй стороны</>
            ) : (
              <>
                Вам предложили новую цену: {isCustomer ? <>вы заплатите <span style={S.amount}>{pendingCharge} ₽</span> (сейчас {chargeNow} ₽)</> : <>вы получите <span style={S.amount}>{pendingPayout} ₽</span> (сейчас {payoutNow} ₽)</>}
                {isCustomer && topup > 0 && <div style={S.hint}>При принятии с баланса спишется доплата {topup} ₽</div>}
                {isCustomer && topup < 0 && <div style={S.hint}>При принятии на баланс вернётся {Math.abs(topup)} ₽</div>}
              </>
            )}
          </div>
          {isProposer ? (
            <button style={S.btnGhost} disabled={busy} onClick={() => run(() => apiCall('POST', `/orders/${order.id}/propose-price/cancel`))}>Отменить</button>
          ) : (
            <>
              <button style={S.btn} disabled={busy} onClick={() => run(() => apiCall('POST', `/orders/${order.id}/propose-price/accept`))}>Принять</button>
              <button style={S.btnGhost} disabled={busy} onClick={() => run(() => apiCall('POST', `/orders/${order.id}/propose-price/decline`))}>Отклонить</button>
            </>
          )}
        </div>
        {err && <div style={S.err}>{err}</div>}
      </div>
    )
  }

  // ── Активное предложение отмены — тоже приоритетнее обычной панели ───────
  if (order.cancel_requested_by != null) {
    const isRequester = order.cancel_requested_by === userId
    return (
      <div style={{ ...S.wrap, ...S.cancelPending }}>
        <div style={S.topRow}>
          <div style={S.text}>
            {isRequester
              ? 'Вы предложили отменить заказ по согласию сторон — ждём подтверждения второй стороны'
              : 'Вам предложили отменить заказ по согласию сторон — заказчику вернутся все зарезервированные деньги'}
          </div>
          {isRequester ? (
            <button style={S.btnGhost} disabled={busy} onClick={() => run(() => apiCall('POST', `/orders/${order.id}/cancel-request/cancel`))}>Отозвать</button>
          ) : (
            <>
              <button style={S.btnDangerFilled} disabled={busy} onClick={() => run(() => apiCall('POST', `/orders/${order.id}/cancel-request/accept`))}>Подтвердить отмену</button>
              <button style={S.btnGhost} disabled={busy} onClick={() => run(() => apiCall('POST', `/orders/${order.id}/cancel-request/decline`))}>Отклонить</button>
            </>
          )}
        </div>
        {err && <div style={S.err}>{err}</div>}
      </div>
    )
  }

  // ── Обычная панель: текущая цена + кнопки действий ────────────────────────
  return (
    <div style={S.wrap}>
      <div style={S.topRow}>
        <div style={S.text}>{myCurrentLabel}: <span style={S.amount}>{myCurrentValue} ₽</span></div>
      </div>

      {order.status === 'awaiting_confirmation' && (
        <div style={S.confirmRow}>
          {[{ label: 'Заказчик', done: order.confirmed_by_customer }, { label: 'Исполнитель', done: order.confirmed_by_executor }].map(({ label, done }) => (
            <div key={label} style={{ ...S.confirmItem, color: done ? '#4ade80' : '#64748b' }}>
              <CheckCircle size={13} /> {label} подтвердил
            </div>
          ))}
        </div>
      )}

      {mode === 'idle' && (canPriceOrCancel || canConfirm || canDispute) && (
        <div style={S.menuWrap} ref={menuRef}>
          <button style={S.btnGhost} onClick={() => setMenuOpen(o => !o)}>
            Действия <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div style={S.menuList}>
              {canPriceOrCancel && (
                <button style={S.menuItem} onClick={() => { setMode('price'); setAmount(String(myCurrentValue)); setErr(''); setMenuOpen(false) }}>
                  <DollarSign size={14} className="text-teal-legacy" /> Изменить цену
                </button>
              )}
              {canConfirm && (
                <button style={S.menuItem} onClick={() => { setMode('confirm'); setErr(''); setMenuOpen(false) }}>
                  <CheckCircle size={14} className="text-teal-legacy" /> Подтвердить выполнение
                </button>
              )}
              {canDispute && (
                <button style={S.menuItem} onClick={() => { setMode('dispute'); setErr(''); setMenuOpen(false) }}>
                  <AlertOctagon size={14} className="text-red-400" /> Открыть спор
                </button>
              )}
              {canPriceOrCancel && (
                <button style={S.menuItem} onClick={() => { setMode('cancel'); setErr(''); setMenuOpen(false) }}>
                  <XCircle size={14} className="text-red-400" /> Предложить отмену
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'price' && (
        <div style={S.btnRow}>
          <input style={S.input} type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Новая цена, ₽" autoFocus />
          <button style={S.btn} disabled={busy || !amount} onClick={proposePrice}>Предложить</button>
          <button style={S.btnGhost} disabled={busy} onClick={() => setMode('idle')}>Отмена</button>
          {isCustomer && (
            <span style={S.hint}>
              Если цена вырастет — доплата спишется при подтверждении, не хватит средств — <Link to="/wallet" className="text-teal-legacy">пополните кошелёк</Link>
            </span>
          )}
        </div>
      )}

      {mode === 'cancel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={S.hint}>Заказ отменится только если вторая сторона подтвердит — заказчику вернутся все зарезервированные {chargeNow} ₽.</div>
          <div style={S.btnRow}>
            <button style={S.btnDangerFilled} disabled={busy} onClick={() => run(() => apiCall('POST', `/orders/${order.id}/cancel-request`))}>Да, предложить отмену</button>
            <button style={S.btnGhost} disabled={busy} onClick={() => setMode('idle')}>Назад</button>
          </div>
        </div>
      )}

      {mode === 'confirm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={S.hint}>
            Подтверждаете, что работа {isCustomer ? 'принята и выполнена согласно договорённостям' : 'выполнена в полном объёме'}?
            {isExecutor && <> После подтверждения обеими сторонами на баланс начислится <strong>{payoutNow} ₽</strong>.</>}
          </div>
          <div style={S.btnRow}>
            <button style={S.btn} disabled={busy} onClick={() => run(() => apiCall('POST', `/orders/${order.id}/confirm`, {}))}>Да, подтверждаю</button>
            <button style={S.btnGhost} disabled={busy} onClick={() => setMode('idle')}>Назад</button>
          </div>
        </div>
      )}

      {mode === 'dispute' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea style={S.textarea} value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Что именно пошло не так?" autoFocus />
          <div style={S.btnRow}>
            <button style={S.btnDangerFilled} disabled={busy || !disputeReason.trim()} onClick={submitDispute}>Открыть спор</button>
            <button style={S.btnGhost} disabled={busy} onClick={() => setMode('idle')}>Назад</button>
          </div>
        </div>
      )}

      {err && <div style={S.err}>{err}</div>}
    </div>
  )
}
