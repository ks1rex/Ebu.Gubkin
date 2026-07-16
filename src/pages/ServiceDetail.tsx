import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, Shield } from 'lucide-react'
import { apiCall } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../lib/format'
import { useToast } from '../contexts/ToastContext'
import Spinner from '../components/Spinner'
import VipName from '../components/VipBadge'

const CLS = {
  badge: 'inline-flex items-center gap-[5px] bg-[#f59e0b22] text-amber-500 border border-[#f59e0b44] rounded-xl py-1 px-2.5 text-[0.78rem] font-semibold mr-2 mb-1.5',
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const toast = useToast()

  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [ordering, setOrdering] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiCall('GET', `/listings/${id}`)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ />
  if (!listing) return <div className="text-red-400 p-8">Услуга не найдена</div>

  const price = parseFloat(listing.price)
  const deposit = parseFloat(listing.deposit_amount ?? 0)
  const total = Math.round((price + deposit) * 100) / 100
  const balance = parseFloat(String(profile?.balance ?? 0))
  const insufficient = balance < total
  const isOwner = profile?.id === listing.owner_id

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setOrdering(true)
    try {
      const result = await apiCall('POST', `/listings/${id}/order`, { comment: comment.trim() || undefined })
      toast('Услуга заказана! Откройте чат с исполнителем.', 'success')
      navigate(`/market/orders/${result.id}`)
    } catch (err: any) {
      if (err.data?.error === 'insufficient_balance') {
        setError(`Недостаточно средств. Нужно ${formatCurrency(err.data.required)}, на балансе ${formatCurrency(err.data.balance)}.`)
      } else {
        setError(err.message)
      }
    } finally { setOrdering(false) }
  }

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="bg-[#0f1923] border border-[#1e3a4a] rounded-xl p-6 mb-4">
        <div className="text-slate-200 text-[1.3rem] font-bold mb-3">{listing.title}</div>
        <div className="flex items-center gap-2 mb-4">
          <Link to={`/market/users/${listing.owner_id}`} className="text-teal-legacy font-semibold no-underline text-[0.9rem]"><VipName name={listing.owner?.nickname} isVip={listing.owner?.is_vip} /></Link>
          {parseFloat(listing.owner?.rating_as_executor ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-amber-500 text-[0.82rem]">
              <Star size={12} fill="#f59e0b" />{parseFloat(listing.owner.rating_as_executor).toFixed(1)}
              <span className="text-slate-500">({listing.owner.reviews_count_executor})</span>
            </div>
          )}
        </div>
        <div>
          {deposit > 0 && <span className={CLS.badge}><Shield size={12} />Залог {formatCurrency(deposit)}</span>}
        </div>
        <div className="text-slate-400 text-[0.92rem] leading-[1.6] whitespace-pre-wrap mb-4">{listing.description}</div>
        <div className="flex items-baseline gap-2.5 flex-wrap mt-1.5">
          <div className="text-teal-legacy text-[1.6rem] font-bold">{formatCurrency(price)}</div>
          {deposit > 0 && <div className="text-amber-500 text-[0.83rem]">+ залог {formatCurrency(deposit)} (вернётся после завершения)</div>}
        </div>
        {deposit > 0 && <div className="text-slate-500 text-[0.85rem] mt-1">Итого к списанию: {formatCurrency(total)}</div>}
      </div>

      {!isOwner && profile && (
        <div className="bg-[#0f1923] border border-[#1e3a4a] rounded-xl p-6 mb-4">
          <form onSubmit={handleOrder} className="flex flex-col gap-3">
            <div className="text-slate-200 font-semibold mb-1">Заказать услугу</div>
            <div>
              <label className="text-slate-400 text-[0.82rem] mb-1 block">Комментарий к заказу (необязательно)</label>
              <textarea className="w-full bg-[#0a1420] border border-[#1e3a4a] rounded-lg py-[10px] px-3 text-slate-200 text-[0.92rem] min-h-[80px] resize-y font-[inherit] box-border" value={comment} onChange={e => setComment(e.target.value)} placeholder="Уточните детали, пожелания, удобное время..." />
            </div>
            <div>
              <div className="text-slate-500 text-[0.82rem]">К списанию: <strong className="text-teal-legacy">{formatCurrency(total)}</strong>{deposit > 0 && <> ({formatCurrency(price)} + залог {formatCurrency(deposit)})</>}</div>
              <div className={`text-[0.82rem] mt-1.5 ${insufficient ? 'text-red-400' : 'text-slate-500'}`}>
                Ваш баланс: {formatCurrency(balance)}
                {insufficient && <> — <Link to="/wallet" className="text-teal-legacy">пополнить кошелёк</Link></>}
              </div>
            </div>
            {error && <div className="text-red-400 text-[0.84rem]">{error}</div>}
            <button
              className={`rounded-lg py-[11px] px-6 font-semibold text-[0.95rem] ${
                (insufficient || ordering) ? 'bg-[#1e3a4a] text-slate-500 cursor-not-allowed' : 'bg-teal-legacy text-white cursor-pointer'
              }`}
              type="submit" disabled={insufficient || ordering}>
              {ordering ? 'Оформление...' : `Заказать за ${formatCurrency(total)}`}
            </button>
          </form>
        </div>
      )}

      {isOwner && (
        <div className="flex gap-2.5">
          <Link to={`/market/services/${id}/edit`} className="bg-[#1e3a4a] rounded-lg py-[9px] px-[18px] text-slate-200 no-underline font-medium text-[0.88rem]">Редактировать</Link>
          <Link to="/market/services/mine" className="text-slate-500 text-[0.85rem] py-[9px] no-underline">← Мои услуги</Link>
        </div>
      )}
    </div>
  )
}
