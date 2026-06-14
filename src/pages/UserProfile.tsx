import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { apiCall } from '../lib/api'
import Spinner from '../components/Spinner'

function Stars({ rating, count, label }: { rating?: number; count?: number; label: string }) {
  const r = parseFloat(String(rating ?? 0))
  const filled = Math.round(r)
  if (!r) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={{ color: '#64748b', fontSize: '0.82rem' }}>{label}:</span>
      <span style={{ color: '#f59e0b' }}>{'★'.repeat(filled)}{'☆'.repeat(5 - filled)}</span>
      <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.82rem' }}>{r.toFixed(1)}</span>
      <span style={{ color: '#64748b', fontSize: '0.78rem' }}>({count ?? 0})</span>
    </div>
  )
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiCall('GET', `/users/${id}`),
      apiCall('GET', `/users/${id}/reviews`).catch(() => []),
    ]).then(([p, r]) => { setProfile(p); setReviews(Array.isArray(r) ? r : []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner />
  if (!profile) return <div style={{ color: '#f87171' }}>Пользователь не найден</div>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 14, padding: '2rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.25rem' }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} alt="" />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e3a4a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={28} style={{ color: '#64748b' }} />
            </div>
          )}
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '1.25rem', fontWeight: 700 }}>{profile.nickname}</div>
            {profile.university_group && <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 3 }}>{profile.university_group}</div>}
          </div>
        </div>

        <Stars rating={profile.rating_as_executor} count={profile.reviews_count_executor} label="Как исполнитель" />
        <Stars rating={profile.rating_as_customer} count={profile.reviews_count_customer} label="Как заказчик" />
      </div>

      {reviews.length > 0 && (
        <div style={{ background: '#0f1923', border: '1px solid #1e3a4a', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Отзывы</div>
          {reviews.map((r: any) => (
            <div key={r.id} style={{ borderBottom: '1px solid #1e3a4a', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#f59e0b' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <Link to={`/market/users/${r.reviewer_id}`} style={{ color: '#14a89a', fontSize: '0.8rem', textDecoration: 'none' }}>{r.reviewer?.nickname}</Link>
                <span style={{ color: '#64748b', fontSize: '0.74rem' }}>{r.context === 'as_executor' ? '· как исполнитель' : '· как заказчик'}</span>
                <span style={{ color: '#64748b', fontSize: '0.72rem', marginLeft: 'auto' }}>{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              {r.comment && <div style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5 }}>{r.comment}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
