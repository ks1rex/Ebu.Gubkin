import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star, Shield, Search } from 'lucide-react'
import { apiCall } from '../lib/api'
import { formatCurrency } from '../lib/format'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import VipName from '../components/VipBadge'

const CLS = {
  badge: 'bg-[#f59e0b22] text-amber-500 border border-[#f59e0b44] rounded-xl py-[3px] px-2 text-[0.72rem] font-semibold flex items-center gap-1',
}

export default function ServicesCatalog() {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  async function load(q = '') {
    setLoading(true)
    try {
      const qs = q ? `?search=${encodeURIComponent(q)}` : ''
      const data = await apiCall('GET', `/listings${qs}`)
      setListings(data ?? [])
    } catch { setListings([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setQuery(search.trim())
    load(search.trim())
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="text-slate-200 text-[1.4rem] font-bold">Каталог услуг</div>
        <div className="flex gap-2.5 items-center flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2.5 items-center">
            <input className="bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-[9px] px-3 text-slate-200 text-[0.9rem] w-60" placeholder="Поиск услуги..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="bg-teal-legacy rounded-lg py-[9px] px-4 text-white font-semibold cursor-pointer flex items-center gap-1.5" type="submit"><Search size={15} />Найти</button>
          </form>
          <Link to="/market/services/new" className="bg-teal-legacy rounded-lg py-[9px] px-[18px] text-white font-semibold no-underline text-[0.9rem]">+ Разместить услугу</Link>
        </div>
      </div>

      {loading ? <Spinner color="#14a89a" /* teal-legacy — see tailwind.config.ts */ /> : listings.length === 0 ? (
        <EmptyState title={`Услуг пока нет${query ? ` по запросу «${query}»` : ''}`} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {listings.map((l: any) => (
            <Link key={l.id} to={`/market/services/${l.id}`} className="bg-[#0f1923] border border-[#1e3a4a] rounded-xl p-5 no-underline flex flex-col gap-2.5">
              <div className="text-slate-200 font-bold text-base leading-[1.3]">{l.title}</div>
              <div className="flex items-center gap-2">
                <div className="text-teal-legacy text-[0.82rem] font-medium"><VipName name={l.owner?.nickname} isVip={l.owner?.is_vip} /></div>
                {parseFloat(l.owner?.rating_as_executor ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-amber-500 text-[0.8rem]">
                    <Star size={11} fill="#f59e0b" />{parseFloat(l.owner.rating_as_executor).toFixed(1)}
                  </div>
                )}
              </div>
              <div className="flex gap-[6px] flex-wrap">
                {parseFloat(l.deposit_amount ?? 0) > 0 && <span className={CLS.badge}><Shield size={11} />Залог {formatCurrency(l.deposit_amount)}</span>}
              </div>
              <div className="text-teal-legacy text-[1.3rem] font-bold mt-auto">{formatCurrency(l.price)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
