import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Eye, EyeOff, Edit } from 'lucide-react'
import { apiCall } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/format'
import { useToast } from '../contexts/ToastContext'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

const S: Record<string, any> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: 12 },
  h1: { display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontSize: '1.3rem', fontWeight: 700 },
  usage: { color: '#64748b', fontSize: '0.8rem', fontWeight: 500 },
  newBtn: { background: '#14a89a', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontWeight: 600, textDecoration: 'none', fontSize: '0.88rem' },
  card: { background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 12, padding: '1.15rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  info: { flex: 1, minWidth: 0 },
  cardTitle: { color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' },
  meta: { color: '#64748b', fontSize: '0.78rem', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' },
  badge: (color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 10, padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600 }),
  actions: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  iconBtn: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${active ? '#14a89a' : '#334155'}`, borderRadius: 7, padding: '6px 12px', color: active ? '#14a89a' : '#64748b', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }),
  editLink: { display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', textDecoration: 'none', fontSize: '0.8rem', border: '1px solid #334155', borderRadius: 7, padding: '6px 12px' },
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
      <div style={S.header}>
        <div style={S.h1}>
          Мои услуги
          {usage && <span style={S.usage}>использовано {usage.used} из {usage.limit}</span>}
        </div>
        <Link to="/market/services/new" style={S.newBtn}>+ Новая услуга</Link>
      </div>

      {loading ? <Spinner /> : listings.length === 0 ? (
        <EmptyState title="У вас нет услуг">
          <Link to="/market/services/new" style={{ color: '#14a89a' }}>Создать первую</Link>
        </EmptyState>
      ) : (
        listings.map((l: any) => (
          <div key={l.id} style={{ ...S.card, opacity: l.is_active ? 1 : 0.6 }}>
            <div style={S.info}>
              <Link to={`/market/services/${l.id}`} style={S.cardTitle}>{l.title}</Link>
              <div style={S.meta}>
                <span>{formatCurrency(l.price)}</span>
                {parseFloat(l.deposit_amount ?? 0) > 0 && <span style={S.badge('#f59e0b')}><Shield size={10} />Залог {formatCurrency(l.deposit_amount)}</span>}
                {!l.is_active && <span style={S.badge('#f59e0b')}>Скрыто</span>}
                <span>{formatDate(l.created_at)}</span>
              </div>
            </div>
            <div style={S.actions}>
              <button style={S.iconBtn(l.is_active)} onClick={() => handleToggle(l.id, l.is_active)} disabled={toggling[l.id]} title={l.is_active ? 'Скрыть' : 'Активировать'}>
                {l.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                {l.is_active ? 'Активна' : 'Скрыта'}
              </button>
              <Link to={`/market/services/${l.id}/edit`} style={S.editLink}><Edit size={13} />Изменить</Link>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
