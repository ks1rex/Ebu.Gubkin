import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Eye, EyeOff, Edit } from 'lucide-react'
import { apiCall } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/format'
import { useToast } from '../contexts/ToastContext'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

const CLS = {
  badge: 'inline-flex items-center gap-1 bg-[#f59e0b22] text-amber-500 border border-[#f59e0b44] rounded-lg py-0.5 px-[7px] text-[0.72rem] font-semibold',
  iconBtn: (active: boolean) =>
    `flex items-center gap-[5px] bg-transparent border rounded-[7px] py-[6px] px-3 text-[0.8rem] cursor-pointer font-medium ${
      active ? 'border-teal-legacy text-teal-legacy' : 'border-slate-700 text-slate-500'
    }`,
}

export default function ServicesMine() {
  const toast = useToast()
  const [listings, setListings] = useState<any[]>([])
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    try {
      const data = await apiCall('GET', '/listings/mine')
      setListings(Array.isArray(data?.listings) ? data.listings : [])
      setUsage(data?.usage ?? null)
    }
    catch { setListings([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleToggle(id: string, current: boolean) {
    setToggling(t => ({ ...t, [id]: true }))
    try {
      const updated = await apiCall('PATCH', `/listings/${id}/toggle`)
      setListings(ls => ls.map(l => l.id === id ? { ...l, is_active: updated.is_active, hidden_reason: updated.hidden_reason } : l))
      setUsage(u => u ? { ...u, used: u.used + (current ? -1 : 1) } : u)
      toast(!current ? 'Услуга активирована' : 'Услуга скрыта', 'success')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setToggling(t => ({ ...t, [id]: false })) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-2.5 text-slate-200 text-[1.3rem] font-bold">
          Мои услуги
          {usage && <span className="text-slate-500 text-[0.8rem] font-medium">использовано {usage.used} из {usage.limit}</span>}
        </div>
        <Link to="/market/services/new" className="bg-teal-legacy rounded-lg py-[9px] px-[18px] text-white font-semibold no-underline text-[0.88rem]">+ Новая услуга</Link>
      </div>

      {loading ? <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ /> : listings.length === 0 ? (
        <EmptyState title="У вас нет услуг">
          <Link to="/market/services/new" className="text-teal-legacy">Создать первую</Link>
        </EmptyState>
      ) : (
        listings.map((l: any) => (
          <div key={l.id} className={`bg-[#0f1923] border border-[#1e3a4a] rounded-xl p-[1.15rem] mb-2 flex items-center gap-3 flex-wrap ${l.is_active ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex-1 min-w-0">
              <Link to={`/market/services/${l.id}`} className="text-slate-200 font-semibold text-[0.95rem] no-underline">{l.title}</Link>
              <div className="text-slate-500 text-[0.78rem] mt-1 flex gap-2.5 flex-wrap">
                <span>{formatCurrency(l.price)}</span>
                {parseFloat(l.deposit_amount ?? 0) > 0 && <span className={CLS.badge}><Shield size={10} />Залог {formatCurrency(l.deposit_amount)}</span>}
                {!l.is_active && <span className={CLS.badge}>Скрыто</span>}
                <span>{formatDate(l.created_at)}</span>
              </div>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              <button className={CLS.iconBtn(l.is_active)} onClick={() => handleToggle(l.id, l.is_active)} disabled={toggling[l.id]} title={l.is_active ? 'Скрыть' : 'Активировать'}>
                {l.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                {l.is_active ? 'Активна' : 'Скрыта'}
              </button>
              <Link to={`/market/services/${l.id}/edit`} className="flex items-center gap-[5px] text-slate-500 no-underline text-[0.8rem] border border-slate-700 rounded-[7px] py-[6px] px-3"><Edit size={13} />Изменить</Link>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
