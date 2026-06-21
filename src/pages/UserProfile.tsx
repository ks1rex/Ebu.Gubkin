import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiCall } from '../lib/api'
import Spinner from '../components/Spinner'
import { GlassCard, Avatar, Stars } from '../components/glass'

interface Profile {
  id: string
  nickname: string | null
  avatar_url: string | null
  university_group: string | null
  rating_as_executor?: number | string | null
  rating_as_customer?: number | string | null
  reviews_count_executor?: number | null
  reviews_count_customer?: number | null
}

interface Review {
  id: string
  rating: number
  comment: string | null
  context: 'as_executor' | 'as_customer'
  created_at: string
  reviewer_id: string
  reviewer?: { nickname: string | null }
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
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
  if (!profile) return <div className="text-error">Пользователь не найден</div>

  const execRating = parseFloat(String(profile.rating_as_executor ?? 0))
  const custRating = parseFloat(String(profile.rating_as_customer ?? 0))

  return (
    <div className="max-w-2xl mx-auto">
      <GlassCard className="rounded-[26px] overflow-hidden mb-4">
        <div className="h-[120px] relative" style={{ background: 'linear-gradient(120deg,#7c3aed,#db2777 55%,#0ea5e9)' }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 160% at 80% -20%, rgba(255,255,255,.25), transparent 60%)' }} />
        </div>
        <div className="px-7 pb-6 flex gap-5 items-end -mt-12 relative">
          <Avatar
            name={profile.nickname}
            src={profile.avatar_url}
            size={96}
            radius={26}
            className="text-[34px] border-4 border-[rgba(36,21,81,.6)] shadow-[0_14px_36px_rgba(0,0,0,.4)]"
          />
          <div className="pb-1.5">
            <h1 className="text-2xl font-bold tracking-[-.5px] text-ink">{profile.nickname}</h1>
            {profile.university_group && <div className="text-sm text-subtle mt-1">{profile.university_group}</div>}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-4">
        <GlassCard className="rounded-[18px] px-5 py-4.5">
          <b className="block text-2xl font-bold tracking-[-.5px] text-mint">{execRating > 0 ? execRating.toFixed(1) : '—'}</b>
          <span className="text-xs text-subtle">рейтинг исполнителя</span>
        </GlassCard>
        <GlassCard className="rounded-[18px] px-5 py-4.5">
          <b className="block text-2xl font-bold tracking-[-.5px] text-ink">{profile.reviews_count_executor ?? 0}</b>
          <span className="text-xs text-subtle">отзывов как исполнитель</span>
        </GlassCard>
        <GlassCard className="rounded-[18px] px-5 py-4.5">
          <b className="block text-2xl font-bold tracking-[-.5px] text-gold">{custRating > 0 ? custRating.toFixed(1) : '—'}</b>
          <span className="text-xs text-subtle">рейтинг заказчика</span>
        </GlassCard>
        <GlassCard className="rounded-[18px] px-5 py-4.5">
          <b className="block text-2xl font-bold tracking-[-.5px] text-ink">{profile.reviews_count_customer ?? 0}</b>
          <span className="text-xs text-subtle">отзывов как заказчик</span>
        </GlassCard>
      </div>

      {reviews.length > 0 && (
        <div>
          <div className="text-[13px] tracking-wide uppercase text-subtle font-semibold mb-3.5">Отзывы с биржи</div>
          <div className="flex flex-col gap-3">
            {reviews.map(r => (
              <GlassCard key={r.id} className="rounded-2xl px-5 py-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <Stars rating={r.rating} />
                  <Link to={`/market/users/${r.reviewer_id}`} className="text-lav text-[13.5px] font-semibold hover:underline">
                    {r.reviewer?.nickname}
                  </Link>
                  <span className="text-subtle text-xs">{r.context === 'as_executor' ? '· как исполнитель' : '· как заказчик'}</span>
                  <span className="text-subtle text-xs ml-auto">{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                {r.comment && <p className="text-[13.5px] text-[#e6e1f7] leading-relaxed">{r.comment}</p>}
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
