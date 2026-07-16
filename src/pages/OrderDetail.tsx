import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, FileText, Users, Send, MessageSquare, CheckCircle, AlertOctagon, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { StatusBadge } from '../lib/statusMap'
import StarRating from '../components/StarRating'
import { useToast } from '../contexts/ToastContext'
import Spinner from '../components/Spinner'
import VipName from '../components/VipBadge'

const CLS = {
  h1: 'text-slate-200 text-[1.3rem] font-bold mb-2 flex items-center gap-3 flex-wrap',
  card: 'bg-[#0f1923] border border-[#1e3a4a] rounded-xl p-6 mb-4',
  sectionTitle: 'text-slate-400 text-[0.8rem] font-semibold uppercase tracking-[0.05em] mb-4',
  meta: 'grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 mb-4',
  metaItem: 'text-slate-500 text-[0.85rem]',
  metaValue: 'text-slate-200 font-medium mt-0.5',
  paymentBox: 'bg-[#0d2620] border border-teal-legacy-hover rounded-lg p-5 mb-4',
  paymentTitle: 'text-teal-legacy font-bold mb-2 text-[1.05rem]',
  paymentText: 'text-slate-400 text-[0.9rem] leading-[1.7]',
  amount: 'text-teal-legacy text-[1.5rem] font-bold',
  fileRow: 'flex items-center gap-2.5 py-2 border-b border-[#1e3a4a]',
  dlBtn: 'flex items-center gap-[5px] bg-transparent border border-[#1e3a4a] rounded-md py-1 px-2.5 text-slate-400 text-[0.8rem] cursor-pointer',
  desc: 'text-slate-300 leading-[1.7] whitespace-pre-wrap text-[0.95rem]',
  textarea: 'w-full bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-[10px] px-3 text-slate-200 text-[0.9rem] leading-[1.6] resize-y min-h-[100px] box-border',
  input: 'w-full bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-[9px] px-3 text-slate-200 text-[0.9rem] box-border',
  submitBtn: 'inline-flex items-center gap-1.5 bg-teal-legacy rounded-lg py-[9px] px-5 text-white font-semibold cursor-pointer text-[0.9rem]',
  dangerBtn: 'inline-flex items-center gap-1.5 bg-red-500 rounded-lg py-[9px] px-5 text-white font-semibold cursor-pointer text-[0.9rem]',
  appsLink: 'inline-flex items-center gap-1.5 py-[9px] px-5 rounded-lg bg-[#1e3a4a] text-slate-400 no-underline text-[0.9rem] font-medium',
  chatLink: 'inline-flex items-center gap-1.5 py-[9px] px-5 rounded-lg bg-[#0d2620] text-teal-legacy border border-teal-legacy-hover no-underline text-[0.9rem] font-medium',
  confirmBtn: 'inline-flex items-center gap-1.5 bg-teal-legacy rounded-lg py-[9px] px-[18px] text-white font-semibold cursor-pointer text-[0.88rem] mr-2 mb-2',
  disputeBtn: 'inline-flex items-center gap-1.5 bg-transparent border border-red-500 rounded-lg py-[9px] px-[18px] text-red-500 font-semibold cursor-pointer text-[0.88rem] mb-2',
  cancelBtn: 'bg-transparent border border-slate-700 rounded-lg py-2 px-3.5 text-slate-400 cursor-pointer text-[0.85rem]',
  overlay: 'fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]',
  modal: 'bg-[#0f1923] border border-[#1e3a4a] rounded-[14px] p-8 max-w-[440px] w-[90%]',
  modalTitle: 'text-slate-200 font-bold text-[1.1rem] mb-2',
  modalText: 'text-slate-400 text-[0.9rem] leading-[1.6] mb-6',
  modalBtns: 'flex gap-3 justify-end',
  okBtn: 'bg-teal-legacy rounded-lg py-2 px-5 text-white font-semibold cursor-pointer',
}

function formatTimeLeft(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return 'совсем скоро'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const toast = useToast()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dlLoading, setDlLoading] = useState<string | null>(null)
  const [topupLoading, setTopupLoading] = useState(false)

  const [applyMsg, setApplyMsg] = useState('')
  const [applyPrice, setApplyPrice] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError] = useState('')

  const [confirmModal, setConfirmModal] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const [reviews, setReviews] = useState<any[] | null>(null)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  async function loadOrder() {
    const data = await apiCall('GET', `/orders/${id}`)
    setOrder(data)
  }

  useEffect(() => {
    loadOrder().catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (order?.status === 'completed') {
      apiCall('GET', `/orders/${id}/reviews`)
        .then(data => { setReviews(data.reviews ?? []); setHasReviewed(data.has_reviewed ?? false) })
        .catch(() => setReviews([]))
    }
  }, [order?.status, id])

  async function handleDownload(att: any) {
    setDlLoading(att.id)
    try {
      const { url } = await apiCall('GET', `/orders/${id}/attachments/${att.id}/download`)
      window.open(url, '_blank', 'noopener')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setDlLoading(null) }
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault()
    setApplyLoading(true); setApplyError('')
    try {
      await apiCall('POST', `/orders/${id}/apply`, { message: applyMsg, proposed_amount: parseFloat(applyPrice) })
      await loadOrder(); setApplyMsg(''); setApplyPrice('')
    } catch (e: any) { setApplyError(e.message) }
    finally { setApplyLoading(false) }
  }

  async function handleConfirm() {
    setActionLoading(true); setActionError('')
    try { await apiCall('POST', `/orders/${id}/confirm`, {}); setConfirmModal(false); await loadOrder() }
    catch (e: any) { setActionError(e.message) }
    finally { setActionLoading(false) }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) return
    setActionLoading(true); setActionError('')
    try { await apiCall('POST', `/orders/${id}/dispute`, { reason: disputeReason }); setDisputeOpen(false); setDisputeReason(''); await loadOrder() }
    catch (e: any) { setActionError(e.message) }
    finally { setActionLoading(false) }
  }

  async function handleCancel() {
    setActionLoading(true); setActionError('')
    try { await apiCall('POST', `/orders/${id}/cancel`, {}); setCancelOpen(false); await loadOrder(); toast('Заказ отменён', 'success') }
    catch (e: any) { setActionError(e.message) }
    finally { setActionLoading(false) }
  }

  async function handleTopup() {
    setTopupLoading(true); setActionError('')
    try { await apiCall('POST', `/orders/${id}/topup`, {}); await loadOrder(); toast('Доплата проведена, заказ в работе', 'success') }
    catch (e: any) { setActionError(e.message) }
    finally { setTopupLoading(false) }
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reviewRating) return
    setReviewSubmitting(true); setReviewError('')
    try {
      await apiCall('POST', `/orders/${id}/reviews`, { rating: reviewRating, comment: reviewComment })
      const data = await apiCall('GET', `/orders/${id}/reviews`)
      setReviews(data.reviews ?? []); setHasReviewed(true)
    } catch (e: any) { setReviewError(e.message) }
    finally { setReviewSubmitting(false) }
  }

  if (loading) return <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ />
  if (!order) return <div className="text-red-400">Заказ не найден</div>

  const shortId = order.id.slice(0, 8).toUpperCase()
  const isOwner = order.customer_id === user?.id
  const isExecutor = order.executor_id === user?.id
  const isAdmin = profile?.is_admin === true

  const canConfirm = (isOwner || isExecutor) &&
    ['in_progress', 'awaiting_confirmation'].includes(order.status) &&
    !(isOwner && order.confirmed_by_customer) &&
    !(isExecutor && order.confirmed_by_executor)

  const canDispute = (isOwner || isExecutor) && ['in_progress', 'awaiting_confirmation'].includes(order.status)
  const chatStatuses = ['in_progress', 'awaiting_topup', 'awaiting_confirmation', 'completed', 'disputed', 'cancelled', 'assigned']
  const needsTopup = order.status === 'awaiting_topup' && isOwner
  const topupAmount = needsTopup ? parseFloat(order.required_topup ?? 0) : null

  return (
    <div className="max-w-[800px] mx-auto">
      <div className={CLS.h1}>{order.title}<StatusBadge status={order.status} /></div>

      <div className="text-slate-500 text-[0.85rem] mb-6 flex items-center gap-4 flex-wrap">
        <span>Заказ #{shortId} · {order.subject} · {new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
        {isOwner && order.status === 'open' && (
          <Link to={`/market/orders/${id}/applications`} className={CLS.appsLink}><Users size={14} /> Заявки исполнителей</Link>
        )}
        {chatStatuses.includes(order.status) && (isOwner || isExecutor || isAdmin) && (
          <Link to={`/market/orders/${id}/chat`} className={CLS.chatLink}>
            <MessageSquare size={14} /> Перейти в чат
          </Link>
        )}
      </div>

      {/* Awaiting topup */}
      {needsTopup && topupAmount != null && topupAmount > 0 && (
        <div className={CLS.paymentBox}>
          <div className={CLS.paymentTitle}>Требуется доплата</div>
          <div className={CLS.paymentText}>
            Исполнитель предложил цену выше максимума. Для продолжения нужно доплатить{' '}
            <strong className="text-teal-legacy">{topupAmount} ₽</strong> с баланса кошелька.
          </div>
          {actionError && <div className="text-red-400 text-[0.82rem] my-2">{actionError}</div>}
          {!cancelOpen ? (
            <div className="mt-3 flex gap-2 flex-wrap">
              <button className={CLS.confirmBtn} onClick={handleTopup} disabled={topupLoading}>
                {topupLoading ? 'Оплата...' : `Доплатить ${topupAmount} ₽ с баланса`}
              </button>
              <button className={CLS.cancelBtn} onClick={() => { setActionError(''); setCancelOpen(true) }} disabled={topupLoading}>Отменить заказ</button>
            </div>
          ) : (
            <div className="mt-3">
              <div className="text-slate-400 text-[0.85rem] mb-2">Отменить заказ? Зарезервированная сумма ({order.reserved_amount} ₽) вернётся на ваш баланс.</div>
              <div className="flex gap-2">
                <button className={CLS.dangerBtn} onClick={handleCancel} disabled={actionLoading}>{actionLoading ? 'Отмена...' : 'Да, отменить'}</button>
                <button className={CLS.cancelBtn} onClick={() => { setCancelOpen(false); setActionError('') }}>Назад</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel open order */}
      {isOwner && order.status === 'open' && order.executor_id == null && (
        <div className={CLS.card}>
          {!cancelOpen ? (
            <button className={CLS.disputeBtn} onClick={() => { setActionError(''); setCancelOpen(true) }}>Отменить заказ</button>
          ) : (
            <div>
              <div className="text-slate-400 text-[0.85rem] mb-2">Отменить заказ? Вся зарезервированная сумма ({order.reserved_amount} ₽) будет возвращена на ваш баланс.</div>
              {actionError && <div className="text-red-400 text-[0.82rem] mb-1.5">{actionError}</div>}
              <div className="flex gap-2">
                <button className={CLS.dangerBtn} onClick={handleCancel} disabled={actionLoading}>{actionLoading ? 'Отмена...' : 'Да, отменить'}</button>
                <button className={CLS.cancelBtn} onClick={() => { setCancelOpen(false); setActionError('') }}>Назад</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm / dispute */}
      {(canConfirm || canDispute) && (
        <div className={CLS.card}>
          <div className={CLS.sectionTitle}>Завершение работы</div>
          {order.status === 'awaiting_confirmation' && (
            <div className="flex flex-wrap gap-5 mb-3.5">
              {[{ label: 'Заказчик', done: order.confirmed_by_customer }, { label: 'Исполнитель', done: order.confirmed_by_executor }].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <CheckCircle size={15} className={done ? 'text-green-500' : 'text-slate-700'} />
                  <span className={`text-[0.85rem] ${done ? 'text-green-500' : 'text-slate-500'}`}>{label} подтвердил</span>
                </div>
              ))}
            </div>
          )}
          {order.status === 'awaiting_confirmation' && order.confirmation_deadline && (
            <div className="text-amber-500 text-[0.82rem] mb-3.5">
              ⏱ Автоподтверждение через {formatTimeLeft(order.confirmation_deadline)}, если вторая сторона не ответит
            </div>
          )}
          {canConfirm && (
            <button className={CLS.confirmBtn} onClick={() => { setActionError(''); setConfirmModal(true) }}>
              <CheckCircle size={15} /> Подтвердить выполнение работы
            </button>
          )}
          {canDispute && !disputeOpen && (
            <button className={CLS.disputeBtn} onClick={() => { setActionError(''); setDisputeOpen(true) }}>
              <AlertOctagon size={15} /> Открыть спор
            </button>
          )}
          {disputeOpen && (
            <div className="mt-2">
              <div className="text-slate-400 text-[0.82rem] mb-1.5">Опишите причину спора:</div>
              <textarea className={CLS.textarea} value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Что именно пошло не так?" />
              {actionError && <div className="text-red-400 text-[0.82rem] my-1.5">{actionError}</div>}
              <div className="flex gap-2 mt-2">
                <button className={CLS.dangerBtn} onClick={handleDispute} disabled={actionLoading || !disputeReason.trim()}>{actionLoading ? 'Отправка...' : 'Подтвердить спор'}</button>
                <button className={CLS.cancelBtn} onClick={() => { setDisputeOpen(false); setDisputeReason(''); setActionError('') }}>Отмена</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed */}
      {order.status === 'completed' && (
        <>
          <div className="bg-[#0a1f12] border border-[#22c55e44] rounded-xl p-6 mb-4">
            <div className="flex items-center gap-2.5 text-green-500 font-bold text-[1.05rem]">
              <CheckCircle size={20} /> Заказ завершён
            </div>
            {order.completed_at && <div className="text-slate-500 text-[0.82rem] mt-1.5">{new Date(order.completed_at).toLocaleString('ru-RU')}</div>}
          </div>
          <div className={CLS.card}>
            <div className={CLS.sectionTitle}>Отзывы</div>
            {(isOwner || isExecutor) && !hasReviewed && (
              <form onSubmit={handleReviewSubmit} className={reviews?.length ? 'mb-6' : 'mb-0'}>
                <div className="text-slate-400 text-[0.85rem] mb-2">{isOwner ? 'Оцените исполнителя:' : 'Оцените заказчика:'}</div>
                <StarRating value={reviewRating} onChange={setReviewRating} size={26} gap={4} />
                <textarea className={`${CLS.textarea} mt-2.5`} value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Комментарий (необязательно)" />
                {reviewError && <div className="text-red-400 text-[0.82rem] mt-1.5">{reviewError}</div>}
                <button type="submit" className={`${CLS.submitBtn} mt-2.5`} disabled={reviewSubmitting || !reviewRating}>{reviewSubmitting ? 'Отправка...' : 'Оставить отзыв'}</button>
              </form>
            )}
            {reviews === null && <div className="text-slate-500 text-[0.85rem]">Загрузка...</div>}
            {(reviews ?? []).map((r: any) => (
              <div key={r.id} className="bg-[#070d14] border border-[#1e3a4a] rounded-lg p-4 mb-2">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <StarRating value={r.rating} size={14} gap={1} />
                  <Link to={`/market/users/${r.reviewer_id}`} className="text-teal-legacy text-[0.82rem] font-semibold no-underline">{r.reviewer?.nickname}</Link>
                  <span className="text-slate-500 text-[0.74rem]">{r.context === 'as_executor' ? '· о исполнителе' : '· о заказчике'}</span>
                  <span className="text-slate-500 text-[0.72rem] ml-auto">{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                {r.comment && <div className="text-slate-300 text-[0.88rem] leading-[1.6]">{r.comment}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Disputed */}
      {order.status === 'disputed' && (
        <div className="bg-[#1f0a0a] border border-[#ef444444] rounded-xl p-6 mb-4">
          <div className="flex items-center gap-2.5 text-red-500 font-bold text-[1.05rem]">
            <AlertOctagon size={20} /> Открыт спор
          </div>
          <div className="text-slate-400 text-[0.85rem] mt-1.5">Ожидайте решения администратора. Средства зарезервированы до урегулирования.</div>
        </div>
      )}

      {/* Apply block */}
      {order.status === 'open' && !isOwner && !isAdmin && (
        <div className={CLS.card}>
          <div className={CLS.sectionTitle}>{order.already_applied ? 'Ваша заявка' : 'Откликнуться на заказ'}</div>
          {order.already_applied ? (
            <div className="text-green-500 text-[0.9rem]">
              ✓ Заявка подана · статус: {({'pending': 'на рассмотрении', 'accepted': 'принята', 'rejected': 'отклонена'} as Record<string,string>)[order.my_application_status] ?? order.my_application_status}
            </div>
          ) : (
            <form onSubmit={handleApply} className="flex flex-col gap-3">
              <div>
                <div className="text-slate-400 text-[0.82rem] mb-[5px]">Ваша цена (₽) <span className="text-red-500">*</span><span className="text-slate-500 font-normal ml-1.5">— можно предложить выше или ниже бюджета</span></div>
                <input className={`${CLS.input} max-w-[200px]`} type="number" min="1" step="0.01" placeholder="500" value={applyPrice} onChange={e => setApplyPrice(e.target.value)} required />
              </div>
              <div>
                <div className="text-slate-400 text-[0.82rem] mb-[5px]">Сообщение заказчику <span className="text-red-500">*</span></div>
                <textarea className={CLS.textarea} placeholder="Расскажите почему подходите..." value={applyMsg} onChange={e => setApplyMsg(e.target.value)} required />
              </div>
              {applyError && <div className="text-red-400 text-[0.85rem]">{applyError}{applyError.includes('заблокирован') && <> · <Link to="/support" className="text-teal-legacy">Поддержка</Link></>}</div>}
              <div>
                <button type="submit" className={CLS.submitBtn} disabled={applyLoading}><Send size={14} />{applyLoading ? 'Отправка...' : 'Отправить заявку'}</button>
              </div>
            </form>
          )}
        </div>
      )}


      {/* Order info */}
      <div className={CLS.card}>
        <div className={CLS.sectionTitle}>Детали заказа</div>
        <div className={CLS.meta}>
          <div className={CLS.metaItem}>Тип заказа<div className={CLS.metaValue}>{{ order: 'Заказ', service: 'Услуга' }[order.order_type as string] ?? order.order_type}</div></div>
          <div className={CLS.metaItem}>Сумма исполнителю<div className={CLS.metaValue}>{order.final_amount ?? order.base_amount} ₽</div></div>
          {parseFloat(order.deposit_amount ?? 0) > 0 && (
            <div className={CLS.metaItem}>Залог<div className="flex items-center gap-[5px] mt-0.5"><Shield size={13} className="text-amber-500" /><span className="text-amber-500 font-medium">{order.deposit_amount} ₽</span></div></div>
          )}
          <div className={CLS.metaItem}>Зарезервировано<div className={CLS.amount}>{order.reserved_amount} ₽</div></div>
          {order.customer && <div className={CLS.metaItem}>Заказчик<div className={CLS.metaValue}><Link to={`/market/users/${order.customer_id}`} className="text-teal-legacy no-underline"><VipName name={order.customer.nickname} isVip={order.customer.is_vip} /></Link></div></div>}
          {order.executor && <div className={CLS.metaItem}>Исполнитель<div className={CLS.metaValue}><Link to={`/market/users/${order.executor_id}`} className="text-teal-legacy no-underline"><VipName name={order.executor.nickname} isVip={order.executor.is_vip} /></Link></div></div>}
        </div>
        <div className={CLS.sectionTitle}>Описание</div>
        <div className={CLS.desc}>{order.description}</div>
      </div>

      {/* Attachments */}
      {order.order_attachments?.length > 0 && (
        <div className={CLS.card}>
          <div className={CLS.sectionTitle}>Файлы ({order.order_attachments.length})</div>
          {order.order_attachments.map((att: any) => (
            <div key={att.id} className={CLS.fileRow}>
              <FileText size={16} className="text-teal-legacy shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-[0.88rem] overflow-hidden text-ellipsis whitespace-nowrap">{att.file_name}</div>
                <div className="text-slate-500 text-xs">{(att.file_size / 1024).toFixed(0)} КБ · {att.visibility === 'public' ? 'Видно всем' : 'После выбора исполнителя'}</div>
              </div>
              <button className={CLS.dlBtn} onClick={() => handleDownload(att)} disabled={dlLoading === att.id}>
                <Download size={13} />{dlLoading === att.id ? '...' : 'Скачать'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className={CLS.overlay} onClick={() => !actionLoading && setConfirmModal(false)}>
          <div className={CLS.modal} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-3">
              <CheckCircle size={20} className="text-teal-legacy" />
              <div className={CLS.modalTitle}>Подтвердить выполнение?</div>
            </div>
            <div className={CLS.modalText}>
              Вы подтверждаете, что работа {isOwner ? 'принята и выполнена согласно договорённостям' : 'выполнена в полном объёме'}?
              {isExecutor && <><br /><br />После подтверждения обеими сторонами на ваш баланс будет начислена сумма <strong className="text-teal-legacy">{order.final_amount ?? order.base_amount} ₽</strong>.</>}
            </div>
            {actionError && <div className="text-red-400 text-[0.85rem] mb-3">{actionError}</div>}
            <div className={CLS.modalBtns}>
              <button className={`${CLS.cancelBtn} cursor-pointer`} onClick={() => setConfirmModal(false)} disabled={actionLoading}>Отмена</button>
              <button className={CLS.okBtn} onClick={handleConfirm} disabled={actionLoading}>{actionLoading ? 'Обработка...' : 'Да, подтверждаю'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
