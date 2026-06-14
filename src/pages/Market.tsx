import { useState, useEffect, useCallback, FormEvent, type ReactNode } from 'react'
import {
  Search, Plus, Loader2, BookOpen, FileText,
  X, ChevronRight, Check, AlertTriangle, XCircle, Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const API = import.meta.env.VITE_BACKEND_URL as string

// ── Types ───────────────────────────────────────────────────────────────────

interface Order {
  id: string
  title: string
  description: string | null
  subject: string | null
  base_amount: number
  final_amount: number | null
  status: string
  customer_id: string
  executor_id: string | null
  created_at: string
  already_applied?: boolean
  customer?: { nickname: string | null }
  executor?: { nickname: string | null }
}

interface Application {
  id: string
  executor_id: string
  message: string
  proposed_amount: number | null
  status: string
  created_at: string
  executor?: { id: string; nickname: string | null; rating_as_executor?: number }
}

interface Listing {
  id: string
  owner_id: string
  title: string
  description: string
  price: number
  is_active: boolean
  created_at: string
  owner?: { nickname: string | null }
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment:       { label: 'Ожидает оплаты', cls: 'bg-warning/10 text-warning border-warning/20'     },
  open:                  { label: 'Открыт',          cls: 'bg-success/10 text-success border-success/20'     },
  awaiting_topup:        { label: 'Нужна доплата',   cls: 'bg-warning/10 text-warning border-warning/20'     },
  in_progress:           { label: 'В работе',        cls: 'bg-accent/10 text-accent-muted border-accent/20'  },
  awaiting_confirmation: { label: 'На проверке',     cls: 'bg-warning/10 text-warning border-warning/20'     },
  completed:             { label: 'Завершён',        cls: 'bg-panel text-subtle border-line'                 },
  disputed:              { label: 'Спор',            cls: 'bg-error/10 text-error border-error/20'           },
  cancelled:             { label: 'Отменён',         cls: 'bg-panel text-subtle border-line'                 },
}

const SUBJECTS = [
  'Математика','Физика','Химия','Информатика','Экономика',
  'История','Право','Иностранный язык','Другое',
]

const INPUT = 'w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors placeholder:text-subtle'

// ── API helper ───────────────────────────────────────────────────────────────

async function api(path: string, opts?: RequestInit, token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (opts?.body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...((opts?.headers ?? {}) as Record<string, string>) } })
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Ошибка ${res.status}`)
  return json
}

// ── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: ReactNode; wide?: boolean
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-surface border border-line rounded-2xl w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] flex flex-col shadow-2xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-subtle hover:text-ink hover:bg-panel transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ── Create Order Modal ───────────────────────────────────────────────────────

function CreateOrderModal({ token, onDone, onClose }: {
  token: string; onDone: () => void; onClose: () => void
}) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', subject: '', base_amount: '' })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast('Введите название', 'error'); return }
    const amount = parseFloat(form.base_amount)
    if (!amount || amount <= 0) { toast('Введите корректную сумму', 'error'); return }
    setSaving(true)
    try {
      await api('/orders', { method: 'POST', body: JSON.stringify({ ...form, base_amount: amount }) }, token)
      toast('Заказ создан', 'success')
      onDone()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Новый заказ" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Название <span className="text-error">*</span></label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Курсовая по матанализу" className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Описание</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Подробно опишите задание, требования, сроки..." className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Предмет</label>
            <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className={INPUT}>
              <option value="">— выбрать —</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Бюджет, ₽ <span className="text-error">*</span></label>
            <input type="number" min="1" value={form.base_amount} onChange={e => setForm(f => ({ ...f, base_amount: e.target.value }))} placeholder="500" className={INPUT} />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className="flex-1 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
            {saving ? 'Создаём...' : 'Создать заказ'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 border border-line text-ink text-sm rounded-lg hover:bg-panel transition-colors">Отмена</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Create Listing Modal ─────────────────────────────────────────────────────

function CreateListingModal({ token, onDone, onClose }: {
  token: string; onDone: () => void; onClose: () => void
}) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', price: '' })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast('Введите название', 'error'); return }
    const price = parseFloat(form.price)
    if (!price || price <= 0) { toast('Введите корректную цену', 'error'); return }
    setSaving(true)
    try {
      await api('/listings', { method: 'POST', body: JSON.stringify({ ...form, price }) }, token)
      toast('Объявление опубликовано', 'success')
      onDone()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Новое объявление" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Название услуги <span className="text-error">*</span></label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Помогу с курсовой по математике" className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Описание</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Опишите что вы предлагаете, опыт, сроки..." className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Цена, ₽ <span className="text-error">*</span></label>
          <input type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="1000" className={INPUT} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className="flex-1 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
            {saving ? 'Публикуем...' : 'Опубликовать'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 border border-line text-ink text-sm rounded-lg hover:bg-panel transition-colors">Отмена</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Apply Modal ──────────────────────────────────────────────────────────────

function ApplyModal({ order, token, onDone, onClose }: {
  order: Order; token: string; onDone: () => void; onClose: () => void
}) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [proposed, setProposed] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) { toast('Напишите сообщение', 'error'); return }
    setSaving(true)
    try {
      await api(`/orders/${order.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim(), proposed_amount: proposed ? parseFloat(proposed) : undefined }),
      }, token)
      toast('Отклик отправлен', 'success')
      onDone()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Откликнуться на заказ" onClose={onClose}>
      <p className="text-sm text-subtle mb-4 line-clamp-2">{order.title}</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Сообщение <span className="text-error">*</span></label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Расскажите почему вы подходите для этого задания..." className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Ваша цена, ₽ <span className="text-subtle font-normal">(необязательно)</span></label>
          <input type="number" min="1" value={proposed} onChange={e => setProposed(e.target.value)} placeholder={String(order.base_amount)} className={INPUT} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className="flex-1 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
            {saving ? 'Отправляем...' : 'Отправить отклик'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 border border-line text-ink text-sm rounded-lg hover:bg-panel transition-colors">Отмена</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({ order, token, userId, onRefresh, onClose, onApply }: {
  order: Order
  token: string | undefined
  userId: string | undefined
  onRefresh: () => void
  onClose: () => void
  onApply: () => void
}) {
  const toast = useToast()
  const [apps, setApps]       = useState<Application[]>([])
  const [loadApps, setLoadApps] = useState(false)
  const [acting, setActing]   = useState<Record<string, boolean>>({})

  const isOwner    = order.customer_id === userId
  const isExecutor = order.executor_id === userId
  const statusMeta = STATUS[order.status]

  useEffect(() => {
    if (isOwner && token && ['open', 'in_progress'].includes(order.status)) fetchApps()
  }, [])

  async function fetchApps() {
    if (!token) return
    setLoadApps(true)
    try {
      const data = await api(`/orders/${order.id}/applications`, undefined, token)
      setApps(Array.isArray(data) ? data : [])
    } catch { /* silent */ } finally { setLoadApps(false) }
  }

  async function act(key: string, fn: () => Promise<void>) {
    setActing(a => ({ ...a, [key]: true }))
    try { await fn() } finally { setActing(a => ({ ...a, [key]: false })) }
  }

  async function selectApp(appId: string) {
    await act(appId, async () => {
      await api(`/orders/${order.id}/applications/${appId}/select`, { method: 'POST' }, token)
      toast('Исполнитель выбран', 'success')
      onRefresh(); onClose()
    })
  }

  async function confirmOrder() {
    await act('confirm', async () => {
      await api(`/orders/${order.id}/confirm`, { method: 'POST' }, token)
      toast('Подтверждение отправлено', 'success')
      onRefresh(); onClose()
    })
  }

  async function cancelOrder() {
    if (!window.confirm('Отменить заказ? Средства вернутся на баланс.')) return
    await act('cancel', async () => {
      await api(`/orders/${order.id}/cancel`, { method: 'POST' }, token)
      toast('Заказ отменён', 'success')
      onRefresh(); onClose()
    })
  }

  async function disputeOrder() {
    const reason = window.prompt('Опишите причину спора:')
    if (!reason?.trim()) return
    await act('dispute', async () => {
      await api(`/orders/${order.id}/dispute`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }, token)
      toast('Спор открыт', 'success')
      onRefresh(); onClose()
    })
  }

  const canConfirm = (isOwner || isExecutor) && order.status === 'awaiting_confirmation'
  const canCancel  = isOwner && ['open', 'in_progress', 'pending_payment'].includes(order.status)
  const canDispute = (isOwner || isExecutor) && order.status === 'in_progress'
  const canApply   = !isOwner && !isExecutor && order.status === 'open' && !order.already_applied && !!token

  return (
    <Modal title="Детали заказа" onClose={onClose} wide>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-ink leading-snug">{order.title}</h2>
            <p className="text-xs text-subtle mt-1">
              {order.customer?.nickname ?? 'аноним'} · {new Date(order.created_at).toLocaleDateString('ru-RU')}
              {order.executor && <> · исполнитель: <strong>{order.executor.nickname}</strong></>}
            </p>
          </div>
          {statusMeta && (
            <span className={`text-xs px-2 py-0.5 rounded-md border shrink-0 ${statusMeta.cls}`}>
              {statusMeta.label}
            </span>
          )}
        </div>

        {/* Amount */}
        <div className="flex gap-3">
          <div className="bg-panel rounded-lg px-4 py-3">
            <p className="text-xs text-subtle mb-0.5">Бюджет</p>
            <p className="text-lg font-bold text-accent-muted">{order.base_amount.toLocaleString('ru-RU')} ₽</p>
          </div>
          {order.subject && (
            <div className="bg-panel rounded-lg px-4 py-3">
              <p className="text-xs text-subtle mb-0.5">Предмет</p>
              <p className="text-sm text-ink">{order.subject}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {order.description && (
          <div>
            <p className="text-xs font-medium text-subtle uppercase tracking-wide mb-2">Описание</p>
            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{order.description}</p>
          </div>
        )}

        {/* Actions */}
        {(canConfirm || canCancel || canDispute) && (
          <div className="flex gap-2 flex-wrap border-t border-line pt-4">
            {canConfirm && (
              <button onClick={confirmOrder} disabled={acting.confirm} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-success text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                {acting.confirm ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {isOwner ? 'Подтвердить выполнение' : 'Сдать работу'}
              </button>
            )}
            {canCancel && (
              <button onClick={cancelOrder} disabled={acting.cancel} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-error/40 text-error rounded-lg hover:bg-error/10 disabled:opacity-50 transition-colors">
                {acting.cancel ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Отменить
              </button>
            )}
            {canDispute && (
              <button onClick={disputeOrder} disabled={acting.dispute} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-warning/40 text-warning rounded-lg hover:bg-warning/10 disabled:opacity-50 transition-colors">
                {acting.dispute ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                Открыть спор
              </button>
            )}
          </div>
        )}

        {/* Apply */}
        {canApply && (
          <button onClick={onApply} className="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors">
            Откликнуться
          </button>
        )}
        {order.already_applied && (
          <p className="text-sm text-success text-center bg-success/10 rounded-lg py-2">Вы уже откликнулись на этот заказ</p>
        )}
        {!token && order.status === 'open' && (
          <p className="text-sm text-subtle text-center">Войдите в аккаунт, чтобы откликнуться</p>
        )}

        {/* Applications (owner view) */}
        {isOwner && order.status === 'open' && (
          <div className="border-t border-line pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-subtle" />
              <p className="text-sm font-medium text-ink">Отклики</p>
            </div>
            {loadApps ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-subtle" /></div>
            ) : apps.filter(a => a.status === 'pending').length === 0 ? (
              <p className="text-sm text-subtle text-center py-4">Откликов пока нет</p>
            ) : (
              <div className="space-y-2">
                {apps.filter(a => a.status === 'pending').map(app => (
                  <div key={app.id} className="bg-panel rounded-lg p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink">{app.executor?.nickname ?? 'аноним'}</span>
                        {app.proposed_amount && (
                          <span className="text-xs text-accent-muted font-semibold">{app.proposed_amount.toLocaleString('ru-RU')} ₽</span>
                        )}
                        <span className="text-xs text-subtle">{new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <p className="text-xs text-subtle mt-1 line-clamp-3">{app.message}</p>
                    </div>
                    <button
                      onClick={() => selectApp(app.id)}
                      disabled={!!acting[app.id]}
                      className="shrink-0 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                    >
                      {acting[app.id] ? <Loader2 size={12} className="animate-spin" /> : 'Выбрать'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const statusMeta = STATUS[order.status]
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-line rounded-xl p-4 flex flex-col gap-3 hover:border-accent/40 hover:bg-panel/30 transition-all"
    >
      <div>
        <h3 className="font-semibold text-ink text-sm leading-snug line-clamp-2">{order.title}</h3>
        {order.description && <p className="text-xs text-subtle mt-1 line-clamp-2">{order.description}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {order.subject && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-panel text-subtle border border-line">{order.subject}</span>
        )}
        {statusMeta && order.status !== 'open' && (
          <span className={`text-xs px-2 py-0.5 rounded-md border ${statusMeta.cls}`}>{statusMeta.label}</span>
        )}
        {order.already_applied && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-success/10 text-success border border-success/20">Отклик подан</span>
        )}
      </div>
      <div className="mt-auto pt-3 border-t border-line flex items-center justify-between gap-2">
        <div>
          <p className="text-accent-muted font-bold text-sm">{order.base_amount.toLocaleString('ru-RU')} ₽</p>
          <p className="text-xs text-subtle mt-0.5">
            {order.customer?.nickname ?? 'аноним'} · {new Date(order.created_at).toLocaleDateString('ru-RU')}
          </p>
        </div>
        <ChevronRight size={14} className="text-subtle shrink-0" />
      </div>
    </button>
  )
}

// ── Listing Card ─────────────────────────────────────────────────────────────

function ListingCard({ listing, token, userId, onRefresh }: {
  listing: Listing; token?: string; userId?: string; onRefresh: () => void
}) {
  const toast = useToast()
  const [acting, setActing] = useState(false)
  const isOwner = listing.owner_id === userId

  async function orderFromListing() {
    if (!token) { toast('Войдите в аккаунт', 'error'); return }
    setActing(true)
    try {
      await api(`/listings/${listing.id}/order`, { method: 'POST' }, token)
      toast('Заказ создан из объявления', 'success')
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally { setActing(false) }
  }

  async function deleteListing() {
    if (!token || !isOwner) return
    if (!window.confirm('Удалить объявление?')) return
    setActing(true)
    try {
      await api(`/listings/${listing.id}`, { method: 'DELETE' }, token)
      toast('Объявление удалено', 'success')
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally { setActing(false) }
  }

  return (
    <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-3 hover:border-accent/30 transition-colors">
      <div>
        <h3 className="font-semibold text-ink text-sm leading-snug">{listing.title}</h3>
        {listing.description && <p className="text-xs text-subtle mt-1 line-clamp-3">{listing.description}</p>}
      </div>
      <div className="mt-auto pt-3 border-t border-line flex items-center justify-between gap-2">
        <div>
          <p className="text-accent-muted font-bold text-sm">{listing.price.toLocaleString('ru-RU')} ₽</p>
          <p className="text-xs text-subtle mt-0.5">{listing.owner?.nickname ?? 'аноним'}</p>
        </div>
        {isOwner ? (
          <button
            onClick={deleteListing}
            disabled={acting}
            className="text-xs px-2.5 py-1 rounded-md border border-error/40 text-error hover:bg-error/10 disabled:opacity-50 transition-colors shrink-0"
          >
            Удалить
          </button>
        ) : (
          <button
            onClick={orderFromListing}
            disabled={acting}
            className="text-xs px-2.5 py-1 rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors shrink-0"
          >
            {acting ? '...' : 'Заказать'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

type Role = 'customer' | 'executor'
type Tab  = 'feed' | 'mine' | 'applied' | 'listings'

const TABS: { key: Tab; label: string; roles: Role[] }[] = [
  { key: 'feed',     label: 'Лента заказов', roles: ['customer', 'executor'] },
  { key: 'mine',     label: 'Мои заказы',    roles: ['customer'] },
  { key: 'applied',  label: 'Мои отклики',   roles: ['executor'] },
  { key: 'listings', label: 'Объявления',    roles: ['customer', 'executor'] },
]

export default function Market() {
  const { user, session } = useAuth()
  const token = session?.access_token

  const [role,         setRole]         = useState<Role>('customer')
  const [tab,          setTab]          = useState<Tab>('feed')
  const [orders,       setOrders]       = useState<Order[]>([])
  const [listings,     setListings]     = useState<Listing[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [detail,       setDetail]       = useState<Order | null>(null)
  const [applyOrder,   setApplyOrder]   = useState<Order | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [showCreateL,  setShowCreateL]  = useState(false)

  const load = useCallback(async (t: Tab, q: string) => {
    if (!API) { setLoading(false); return }
    setLoading(true)
    try {
      if (t === 'listings') {
        const data = await fetch(`${API}/listings`).then(r => r.json()) as Listing[]
        setListings(Array.isArray(data) ? data : [])
      } else {
        let url = `${API}/orders`
        if (t === 'mine')    url = `${API}/orders/mine`
        if (t === 'applied') url = `${API}/orders/applied`
        if (t === 'feed' && q) url += `?search=${encodeURIComponent(q)}`
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const data = await fetch(url, { headers }).then(r => r.json()) as Order[]
        setOrders(Array.isArray(data) ? data : [])
      }
    } catch {
      setOrders([]); setListings([])
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    if (tab === 'feed') {
      const t = setTimeout(() => load(tab, search), search ? 350 : 0)
      return () => clearTimeout(t)
    }
    load(tab, '')
  }, [tab, search, load])

  useEffect(() => { setSearch(''); setTab('feed') }, [role])

  const visibleTabs = TABS.filter(t => !user || t.roles.includes(role))
  const showCreateListBtn = user && role === 'executor' && tab === 'listings'
  const showCreateOrderBtn = user && role === 'customer'

  const empty = (
    <div className="flex flex-col items-center py-16 text-center">
      <BookOpen size={36} className="text-subtle mb-3 opacity-60" />
      <p className="text-ink font-medium">
        {tab === 'feed' && search ? 'Ничего не найдено' :
         tab === 'feed'           ? 'Открытых заказов пока нет' :
         tab === 'mine'           ? 'Вы ещё не создавали заказов' :
         tab === 'applied'        ? 'Откликов пока нет' :
                                    'Объявлений пока нет'}
      </p>
      <p className="text-subtle text-sm mt-1 max-w-xs">
        {tab === 'feed' && search ? 'Попробуйте изменить запрос' :
         tab === 'feed'           ? 'Загляните позже' :
         tab === 'mine'           ? 'Нажмите «Создать заказ», чтобы разместить задание' :
         tab === 'applied'        ? 'Найдите заказ в ленте и откликнитесь' :
                                    'Исполнители ещё не разместили предложения'}
      </p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Modals ── */}
      {showCreate && token && (
        <CreateOrderModal token={token} onDone={() => { load('mine', ''); setTab('mine') }} onClose={() => setShowCreate(false)} />
      )}
      {showCreateL && token && (
        <CreateListingModal token={token} onDone={() => load('listings', '')} onClose={() => setShowCreateL(false)} />
      )}
      {applyOrder && token && (
        <ApplyModal order={applyOrder} token={token} onDone={() => load(tab, search)} onClose={() => setApplyOrder(null)} />
      )}
      {detail && !applyOrder && (
        <OrderDetailModal
          order={detail}
          token={token}
          userId={user?.id}
          onRefresh={() => load(tab, search)}
          onClose={() => setDetail(null)}
          onApply={() => setApplyOrder(detail)}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText size={22} className="text-accent-muted" />
          <h1 className="text-2xl font-bold text-ink">Биржа</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {user && (
            <div className="flex items-center bg-panel rounded-lg p-1 gap-0.5">
              {(['customer', 'executor'] as Role[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    role === r ? 'bg-surface text-ink shadow-sm' : 'text-subtle hover:text-ink'
                  }`}
                >
                  {r === 'customer' ? 'Заказчик' : 'Исполнитель'}
                </button>
              ))}
            </div>
          )}

          {showCreateOrderBtn && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors shrink-0"
            >
              <Plus size={16} />Создать заказ
            </button>
          )}
          {showCreateListBtn && (
            <button
              onClick={() => setShowCreateL(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors shrink-0"
            >
              <Plus size={16} />Создать объявление
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0.5 border-b border-line">
        {visibleTabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch('') }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-accent text-accent-muted'
                : 'border-transparent text-subtle hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      {tab === 'feed' && (
        <div className="relative max-w-lg">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по заголовку, предмету..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-line bg-surface text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
        </div>
      )}

      {/* ── Content ── */}
      {!API ? (
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
          VITE_BACKEND_URL не задан — добавьте в .env.local
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-subtle animate-spin" /></div>
      ) : tab === 'listings' ? (
        listings.length === 0 ? empty : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map(l => (
              <ListingCard key={l.id} listing={l} token={token} userId={user?.id} onRefresh={() => load('listings', '')} />
            ))}
          </div>
        )
      ) : orders.length === 0 ? empty : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map(o => (
            <OrderCard key={o.id} order={o} onClick={() => setDetail(o)} />
          ))}
        </div>
      )}
    </div>
  )
}
