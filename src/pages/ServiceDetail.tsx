import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, Shield, AlertTriangle } from 'lucide-react'
import { apiCall } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../lib/format'
import { useToast } from '../contexts/ToastContext'
import Spinner from '../components/Spinner'

const S: Record<string, any> = {
  page: { maxWidth: 720, margin: '0 auto' },
  card: { background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' },
  title: { color: '#e2e8f0', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem' },
  desc: { color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '1rem' },
  owner: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' },
  ownerLink: { color: '#14a89a', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' },
  rating: { display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: '0.82rem' },
  badge: (color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 12, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600, marginRight: 8, marginBottom: 6 }),
  price: { color: '#14a89a', fontSize: '1.6rem', fontWeight: 700 },
  depositNote: { color: '#f59e0b', fontSize: '0.83rem' },
  contactBanner: { background: '#1a0a00', border: '1px solid #ef444444', borderRadius: 10, padding: '12px 14px', marginBottom: '1rem', fontSize: '0.85rem', color: '#fca5a5', lineHeight: 1.5 },
  textarea: { width: '100%', background: '#0a1420', border: '1px solid #1e3a4a', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: '0.92rem', minHeight: 80, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  label: { color: '#94a3b8', fontSize: '0.82rem', marginBottom: 4, display: 'block' },
  err: { color: '#f87171', fontSize: '0.84rem' },
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

  if (loading) return <Spinner />
  if (!listing) return <div style={{ color: '#f87171', padding: '2rem' }}>Услуга не найдена</div>

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
      navigate(`/orders/${result.id}`)
    } catch (err: any) {
      if (err.data?.error === 'insufficient_balance') {
        setError(`Недостаточно средств. Нужно ${formatCurrency(err.data.required)}, на балансе ${formatCurrency(err.data.balance)}.`)
      } else {
        setError(err.message)
      }
    } finally { setOrdering(false) }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.title}>{listing.title}</div>
        <div style={S.owner}>
          <Link to={`/users/${listing.owner_id}`} style={S.ownerLink}>{listing.owner?.nickname}</Link>
          {parseFloat(listing.owner?.rating_as_executor ?? 0) > 0 && (
            <div style={S.rating}>
              <Star size={12} fill="#f59e0b" />{parseFloat(listing.owner.rating_as_executor).toFixed(1)}
              <span style={{ color: '#64748b' }}>({listing.owner.reviews_count_executor})</span>
            </div>
          )}
        </div>
        {listing.requires_contact_exchange && (
          <div style={S.contactBanner}>
            <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            <strong>Обмен контактными данными:</strong> {listing.contact_exchange_reason}
          </div>
        )}
        <div>
          {deposit > 0 && <span style={S.badge('#f59e0b')}><Shield size={12} />Залог {formatCurrency(deposit)}</span>}
          {listing.requires_contact_exchange && <span style={S.badge('#ef4444')}><AlertTriangle size={12} />Обмен контактами</span>}
        </div>
        <div style={S.desc}>{listing.description}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
          <div style={S.price}>{formatCurrency(price)}</div>
          {deposit > 0 && <div style={S.depositNote}>+ залог {formatCurrency(deposit)} (вернётся после завершения)</div>}
        </div>
        {deposit > 0 && <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Итого к списанию: {formatCurrency(total)}</div>}
      </div>

      {!isOwner && profile && (
        <div style={S.card}>
          <form onSubmit={handleOrder} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>Заказать услугу</div>
            <div>
              <label style={S.label}>Комментарий к заказу (необязательно)</label>
              <textarea style={S.textarea} value={comment} onChange={e => setComment(e.target.value)} placeholder="Уточните детали, пожелания, удобное время..." />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.82rem' }}>К списанию: <strong style={{ color: '#14a89a' }}>{formatCurrency(total)}</strong>{deposit > 0 && <> ({formatCurrency(price)} + залог {formatCurrency(deposit)})</>}</div>
              <div style={{ fontSize: '0.82rem', color: insufficient ? '#f87171' : '#64748b', marginTop: 6 }}>
                Ваш баланс: {formatCurrency(balance)}
                {insufficient && <> — <Link to="/wallet" style={{ color: '#14a89a' }}>пополнить кошелёк</Link></>}
              </div>
            </div>
            {error && <div style={S.err}>{error}</div>}
            <button style={{ background: (insufficient || ordering) ? '#1e3a4a' : '#14a89a', border: 'none', borderRadius: 8, padding: '11px 24px', color: (insufficient || ordering) ? '#64748b' : '#fff', fontWeight: 600, cursor: (insufficient || ordering) ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }} type="submit" disabled={insufficient || ordering}>
              {ordering ? 'Оформление...' : `Заказать за ${formatCurrency(total)}`}
            </button>
          </form>
        </div>
      )}

      {isOwner && (
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/services/${id}/edit`} style={{ background: '#1e3a4a', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#e2e8f0', textDecoration: 'none', fontWeight: 500, fontSize: '0.88rem' }}>Редактировать</Link>
          <Link to="/services/mine" style={{ color: '#64748b', fontSize: '0.85rem', padding: '9px 0', textDecoration: 'none' }}>← Мои услуги</Link>
        </div>
      )}
    </div>
  )
}
