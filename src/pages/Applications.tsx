import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import Spinner from '../components/Spinner'
import VipName from '../components/VipBadge'

function StarsRow({ rating, count }: { rating?: number; count?: number }) {
  const filled = Math.round(rating || 0)
  return (
    <div className="flex items-center gap-[6px] mb-2">
      <span className="text-amber-500 text-[0.9rem]">{'★'.repeat(filled)}{'☆'.repeat(5 - filled)}</span>
      <span className="text-amber-500 text-[0.82rem] font-semibold">{(rating || 0).toFixed(1)}</span>
      <span className="text-slate-500 text-[0.78rem]">({count || 0} отзывов)</span>
    </div>
  )
}

export default function Applications() {
  const { id: orderId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [order, setOrder] = useState<any>(null)
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any>(null)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiCall('GET', `/market/orders/${orderId}`),
      apiCall('GET', `/orders/${orderId}/applications`),
    ]).then(([ord, appList]) => {
      if (ord.customer_id !== user?.id) {
        navigate(`/market/orders/${orderId}`, { replace: true })
        return
      }
      setOrder(ord)
      setApps(Array.isArray(appList) ? appList : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [orderId, user?.id, navigate])

  async function handleSelect() {
    setActing(true)
    setError('')
    try {
      await apiCall('POST', `/orders/${orderId}/applications/${modal.id}/select`, {})
      navigate(`/market/orders/${orderId}`)
    } catch (e: any) {
      setError(e.message)
      setActing(false)
    }
  }

  if (loading) return <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ />
  if (!order) return <div className="text-red-400">Заказ не найден</div>

  const pendingApps = apps.filter(a => a.status === 'pending')

  return (
    <div className="max-w-[720px] mx-auto">
      <Link to={`/market/orders/${orderId}`} className="inline-flex items-center gap-[6px] text-slate-500 text-[0.85rem] mb-5 no-underline"><ArrowLeft size={14} /> Назад к заказу</Link>
      <div className="text-slate-200 text-[1.3rem] font-bold mb-1">Заявки исполнителей</div>
      <div className="text-slate-500 text-[0.85rem] mb-6">Заказ: «{order.title}» · {pendingApps.length} активных заявок</div>

      {apps.length === 0 && (
        <div className="text-slate-500 text-center p-12">Заявок пока нет</div>
      )}

      {apps.map((app: any) => (
        <div key={app.id} className={`bg-[#0f1923] border border-[#1e3a4a] rounded-xl p-5 mb-2.5 ${app.status !== 'pending' ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Link to={`/market/users/${app.executor?.id}`} className="text-teal-legacy font-bold text-base mb-1 no-underline block"><VipName name={app.executor?.nickname} isVip={app.executor?.is_vip} /></Link>
              <StarsRow rating={app.executor?.rating_as_executor} count={app.executor?.reviews_count_executor} />
              {app.proposed_amount && <div className="text-teal-legacy text-[1.1rem] font-bold mb-2.5">{app.proposed_amount} ₽ — предложенная цена</div>}
              <div className="text-slate-300 text-[0.88rem] leading-[1.6] mb-2.5">{app.message}</div>
              <div className="text-slate-500 text-xs">{new Date(app.created_at).toLocaleString('ru-RU')}</div>
            </div>
            {app.status === 'pending' && <button className="bg-teal-legacy text-white rounded-lg py-2 px-5 font-semibold cursor-pointer text-[0.9rem]" onClick={() => setModal(app)}>Выбрать</button>}
            {app.status === 'accepted' && <span className="text-green-500 text-[0.82rem] font-semibold">✓ Выбран</span>}
            {app.status === 'rejected' && <span className="text-slate-500 text-[0.82rem]">Отклонён</span>}
          </div>
        </div>
      ))}

      {error && <div className="text-red-400 mt-2 text-[0.85rem]">{error}</div>}

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" onClick={() => !acting && setModal(null)}>
          <div className="bg-[#0f1923] border border-[#1e3a4a] rounded-[14px] p-8 max-w-[440px] w-[90%]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <AlertTriangle size={20} className="text-teal-legacy" />
              <div className="text-slate-200 font-bold text-[1.1rem]">Выбрать исполнителя?</div>
            </div>
            <div className="text-slate-400 text-[0.9rem] leading-[1.6] mb-6">
              Вы выбираете <strong>{modal.executor?.nickname}</strong>
              {modal.proposed_amount && <> с ценой <strong>{modal.proposed_amount} ₽</strong></>}.
              <br />Остальные заявки будут отклонены. Отменить это действие нельзя.
            </div>
            <div className="flex gap-3 justify-end">
              <button className="bg-transparent border border-slate-700 rounded-lg py-2 px-4 text-slate-400 cursor-pointer" onClick={() => setModal(null)} disabled={acting}>Отмена</button>
              <button className="bg-teal-legacy rounded-lg py-2 px-5 text-white font-semibold cursor-pointer" onClick={handleSelect} disabled={acting}>{acting ? 'Обработка...' : 'Подтвердить выбор'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
