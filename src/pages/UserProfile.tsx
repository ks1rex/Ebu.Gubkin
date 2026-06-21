import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiCall } from '../lib/api'
import { formatCurrency } from '../lib/format'
import Spinner from '../components/Spinner'
import { GlassCard, Avatar, Stars } from '../components/glass'
import { LEVEL_NAMES, levelProgress, ACHIEVEMENTS } from '../lib/gamification'

interface Activity { type: 'post' | 'deal' | 'thread'; text: string; ago: string }
interface Achievement { type: string; unlocked: boolean }

interface Profile {
  id: string
  nickname: string | null
  avatar_url: string | null
  university_group: string | null
  is_verified?: boolean
  bio?: string | null
  skills?: string[] | null
  level?: number
  reputation?: number
  current_threshold?: number
  next_threshold?: number
  rating_as_executor?: number | string | null
  rating_as_customer?: number | string | null
  reviews_count_executor?: number | null
  reviews_count_customer?: number | null
  recent_activity?: Activity[]
  achievements?: Achievement[]
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

interface Service { id: string; title: string; price: number }

type Tab = 'activity' | 'threads' | 'services' | 'reviews'
const TABS: { key: Tab; label: string }[] = [
  { key: 'activity', label: 'Активность' },
  { key: 'threads',  label: 'Темы' },
  { key: 'services', label: 'Услуги' },
  { key: 'reviews',  label: 'Отзывы' },
]

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('activity')

  const [reviews, setReviews]   = useState<Review[] | null>(null)
  const [services, setServices] = useState<Service[] | null>(null)
  const [tabLoading, setTabLoading] = useState(false)

  useEffect(() => {
    apiCall('GET', `/profile/${id}/public`)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab === 'reviews' && reviews === null) {
      setTabLoading(true)
      apiCall('GET', `/profile/${id}/reviews`).then(r => setReviews(Array.isArray(r) ? r : [])).catch(() => setReviews([])).finally(() => setTabLoading(false))
    }
    if (tab === 'services' && services === null) {
      setTabLoading(true)
      apiCall('GET', `/profile/${id}/services`).then(r => setServices(Array.isArray(r) ? r : [])).catch(() => setServices([])).finally(() => setTabLoading(false))
    }
  }, [tab, id, reviews, services])

  if (loading) return <Spinner />
  if (!profile) return <div className="text-error">Пользователь не найден</div>

  const execRating = parseFloat(String(profile.rating_as_executor ?? 0))
  const custRating = parseFloat(String(profile.rating_as_customer ?? 0))
  const progress = profile.level != null && profile.reputation != null
    ? levelProgress(profile.level, profile.reputation, profile.current_threshold, profile.next_threshold)
    : null
  const activity = profile.recent_activity ?? []
  const threads = activity.filter(a => a.type === 'thread')

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
            <h1 className="text-2xl font-bold tracking-[-.5px] text-ink flex items-center gap-2">
              {profile.nickname}
              {profile.is_verified && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg text-white bg-lav/80">✓ студент</span>
              )}
            </h1>
            {profile.university_group && <div className="text-sm text-subtle mt-1">{profile.university_group}</div>}
            {profile.bio && <p className="text-sm text-ink/90 mt-2 max-w-md leading-relaxed">{profile.bio}</p>}
          </div>
        </div>
      </GlassCard>

      {profile.level != null && (
        <GlassCard className="rounded-[18px] p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-ink">Уровень {profile.level} — {LEVEL_NAMES[profile.level] ?? ''}</span>
            <span className="text-xs text-subtle">{profile.reputation ?? 0} репутации</span>
          </div>
          {progress && (
            <>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-lav to-mint rounded-full" style={{ width: `${progress.pct}%` }} />
              </div>
              <div className="text-xs text-subtle mt-1.5">ещё {progress.remaining} репутации до следующего уровня</div>
            </>
          )}
        </GlassCard>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {profile.skills.map(s => (
            <span key={s} className="text-xs text-lav bg-white/[.08] border border-white/[.1] rounded-lg px-2.5 py-1.5">{s}</span>
          ))}
        </div>
      )}

      {profile.achievements && (
        <GlassCard className="rounded-[18px] p-5 mb-4">
          <div className="text-[13px] tracking-wide uppercase text-subtle font-semibold mb-3.5">Достижения</div>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
            {Object.entries(ACHIEVEMENTS).map(([type, a]) => {
              const unlocked = profile.achievements!.some(x => x.type === type)
              return (
                <div
                  key={type}
                  title={a.name}
                  className={`aspect-square rounded-[14px] grid place-items-center text-xl border border-white/[.1] ${
                    unlocked ? 'bg-white/[.1]' : 'bg-white/[.03] grayscale opacity-35'
                  }`}
                >
                  {a.emoji}
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-4">
        <GlassCard className="rounded-[18px] p-5">
          <b className="block text-2xl font-bold tracking-[-.5px] text-mint">{execRating > 0 ? execRating.toFixed(1) : '—'}</b>
          <span className="text-xs text-subtle">рейтинг исполнителя</span>
        </GlassCard>
        <GlassCard className="rounded-[18px] p-5">
          <b className="block text-2xl font-bold tracking-[-.5px] text-ink">{profile.reviews_count_executor ?? 0}</b>
          <span className="text-xs text-subtle">отзывов как исполнитель</span>
        </GlassCard>
        <GlassCard className="rounded-[18px] p-5">
          <b className="block text-2xl font-bold tracking-[-.5px] text-gold">{custRating > 0 ? custRating.toFixed(1) : '—'}</b>
          <span className="text-xs text-subtle">рейтинг заказчика</span>
        </GlassCard>
        <GlassCard className="rounded-[18px] p-5">
          <b className="block text-2xl font-bold tracking-[-.5px] text-ink">{profile.reviews_count_customer ?? 0}</b>
          <span className="text-xs text-subtle">отзывов как заказчик</span>
        </GlassCard>
      </div>

      <div className="flex gap-1 bg-white/[.07] border border-white/[.12] rounded-[14px] p-1 mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-sm font-semibold py-2.5 rounded-[10px] transition-colors ${tab === t.key ? 'text-ink bg-white/[.12]' : 'text-subtle'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'activity' && (
        activity.length === 0
          ? <GlassCard className="rounded-2xl py-8 text-center text-subtle text-sm">Пока пусто</GlassCard>
          : <div className="flex flex-col gap-2">
              {activity.map((a, i) => (
                <GlassCard key={i} className="rounded-2xl px-5 py-3.5 flex items-center gap-3">
                  <span className="text-sm text-ink flex-1">{a.text}</span>
                  <span className="text-xs text-subtle shrink-0">{a.ago}</span>
                </GlassCard>
              ))}
            </div>
      )}

      {tab === 'threads' && (
        threads.length === 0
          ? <GlassCard className="rounded-2xl py-8 text-center text-subtle text-sm">Тем пока нет</GlassCard>
          : <div className="flex flex-col gap-2">
              {threads.map((a, i) => (
                <GlassCard key={i} className="rounded-2xl px-5 py-3.5 flex items-center gap-3">
                  <span className="text-sm text-ink flex-1">{a.text}</span>
                  <span className="text-xs text-subtle shrink-0">{a.ago}</span>
                </GlassCard>
              ))}
            </div>
      )}

      {tab === 'services' && (
        tabLoading ? <Spinner /> : !services || services.length === 0
          ? <GlassCard className="rounded-2xl py-8 text-center text-subtle text-sm">Услуг пока нет</GlassCard>
          : <div className="flex flex-col gap-2">
              {services.map(s => (
                <Link key={s.id} to={`/market/services/${s.id}`}>
                  <GlassCard hover className="rounded-2xl px-5 py-3.5 flex items-center gap-3">
                    <span className="text-sm text-ink flex-1">{s.title}</span>
                    <span className="text-sm font-semibold text-mint shrink-0">{formatCurrency(s.price)}</span>
                  </GlassCard>
                </Link>
              ))}
            </div>
      )}

      {tab === 'reviews' && (
        tabLoading ? <Spinner /> : !reviews || reviews.length === 0
          ? <GlassCard className="rounded-2xl py-8 text-center text-subtle text-sm">Отзывов пока нет</GlassCard>
          : <div className="flex flex-col gap-3">
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
      )}
    </div>
  )
}
