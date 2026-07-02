import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit3 } from 'lucide-react'
import { apiCall } from '../lib/api'
import { formatCurrency } from '../lib/format'
import { timeAgo } from '../lib/timeAgo'
import Spinner from './Spinner'
import Modal from './Modal'
import { GlassCard, Avatar, Stars } from './glass'
import { LEVEL_NAMES, LEVEL_THRESHOLDS, levelProgress, ACHIEVEMENTS } from '../lib/gamification'
import VipName from './VipBadge'

// Matches GET /profile/:id/public's recent_activity — shape differs by type
// (see reshbirga backend/src/routes/profile.js).
type Activity =
  | { type: 'post'; text: string; forum_category: string | null; ago: string }
  | { type: 'deal'; amount: number; ago: string }
  | { type: 'thread'; title: string; ago: string }

interface Achievement { type: string; earned_at: string }

export interface PublicProfile {
  id: string
  nickname: string | null
  avatar_url: string | null
  university_group?: string | null
  bio?: string | null
  skills?: string[] | null
  level?: number
  reputation?: number
  next_level_reputation?: number | null
  average_rating?: number | string | null
  reviews_count?: number | null
  deals_count?: number | null
  forum_posts_count?: number | null
  recent_activity?: Activity[]
  achievements?: Achievement[]
  is_vip?: boolean
}

interface Review {
  author_id: string
  author_username: string | null
  author_avatar: string | null
  rating: number
  text: string | null
  created_at: string
}

interface Service { id: string; title: string; price: number }

type Tab = 'activity' | 'threads' | 'services' | 'reviews'
const TABS: { key: Tab; label: string }[] = [
  { key: 'activity', label: 'Активность' },
  { key: 'threads',  label: 'Темы' },
  { key: 'services', label: 'Услуги' },
  { key: 'reviews',  label: 'Отзывы' },
]

interface Props {
  profile: PublicProfile
  userId: string
  isOwner: boolean
  onEdit?: () => void
}

function activityText(a: Activity): string {
  if (a.type === 'post') return a.forum_category ? `Ответил в теме «${a.forum_category}»` : a.text
  if (a.type === 'thread') return `Создал тему «${a.title}»`
  return 'Завершил сделку на бирже'
}

/** Shared profile display — used by both the own-profile page and public profiles. */
export default function ProfileView({ profile, userId, isOwner, onEdit }: Props) {
  const [tab, setTab] = useState<Tab>('activity')
  const [reviews, setReviews]   = useState<Review[] | null>(null)
  const [services, setServices] = useState<Service[] | null>(null)
  const [tabLoading, setTabLoading] = useState(false)
  const [openAchievement, setOpenAchievement] = useState<string | null>(null)
  const [levelModalOpen, setLevelModalOpen] = useState(false)

  useEffect(() => {
    if (tab === 'reviews' && reviews === null) {
      setTabLoading(true)
      apiCall('GET', `/profile/${userId}/reviews`).then(r => setReviews(Array.isArray(r?.reviews) ? r.reviews : [])).catch(() => setReviews([])).finally(() => setTabLoading(false))
    }
    if (tab === 'services' && services === null) {
      setTabLoading(true)
      apiCall('GET', `/profile/${userId}/services`).then(r => setServices(Array.isArray(r) ? r : [])).catch(() => setServices([])).finally(() => setTabLoading(false))
    }
  }, [tab, userId, reviews, services])

  const avgRating = parseFloat(String(profile.average_rating ?? 0))
  const progress = profile.level != null && profile.reputation != null
    ? levelProgress(profile.level, profile.reputation, profile.next_level_reputation)
    : null
  const activity = profile.recent_activity ?? []
  const threads = activity.filter((a): a is Extract<Activity, { type: 'thread' }> => a.type === 'thread')

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="lg:grid lg:grid-cols-[350px_1fr] lg:gap-6 lg:items-start">

        {/* ── Левая колонка ── */}
        <div className="space-y-4 mb-4 lg:mb-0">
          <GlassCard className="rounded-[26px] overflow-hidden">
            <div className="h-[120px] relative" style={{ background: 'linear-gradient(120deg,#7c3aed,#db2777 55%,#0ea5e9)' }}>
              <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 160% at 80% -20%, rgba(255,255,255,.25), transparent 60%)' }} />
            </div>
            <div className="px-6 pb-6 -mt-12 relative">
              <Avatar
                name={profile.nickname}
                src={profile.avatar_url}
                size={96}
                radius={26}
                isVip={profile.is_vip}
                className="text-[34px] border-4 border-[rgba(36,21,81,.6)] shadow-[0_14px_36px_rgba(0,0,0,.4)] mb-3"
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-start gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-[-.5px] text-ink flex items-center gap-2">
                    <VipName name={profile.nickname} isVip={profile.is_vip} />
                  </h1>
                  {profile.university_group && <div className="text-sm text-subtle mt-1">{profile.university_group}</div>}
                  {profile.bio && <p className="text-sm text-ink/90 mt-2 leading-relaxed">{profile.bio}</p>}
                </div>
                {isOwner && (
                  <button
                    onClick={onEdit}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-ink bg-white/[.1] border border-white/[.16] rounded-xl hover:bg-white/[.16] transition-colors shrink-0 w-full sm:w-auto lg:w-full"
                  >
                    <Edit3 size={14} /> Редактировать
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          {profile.level != null && (
            <button onClick={() => setLevelModalOpen(true)} className="block w-full text-left">
              <GlassCard hover className="rounded-[18px] p-5">
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
            </button>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            {profile.reputation != null && (
              <GlassCard className="rounded-[18px] p-5">
                <b className="block text-2xl font-bold tracking-[-.5px] text-lav">{profile.reputation}</b>
                <span className="text-xs text-subtle">репутация</span>
              </GlassCard>
            )}
            <GlassCard className="rounded-[18px] p-5">
              <b className="block text-2xl font-bold tracking-[-.5px] text-gold">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</b>
              <span className="text-xs text-subtle">средний рейтинг</span>
            </GlassCard>
            <GlassCard className="rounded-[18px] p-5">
              <b className="block text-2xl font-bold tracking-[-.5px] text-ink">{profile.reviews_count ?? 0}</b>
              <span className="text-xs text-subtle">отзывов</span>
            </GlassCard>
            <GlassCard className="rounded-[18px] p-5">
              <b className="block text-2xl font-bold tracking-[-.5px] text-mint">{profile.deals_count ?? 0}</b>
              <span className="text-xs text-subtle">сделок на бирже</span>
            </GlassCard>
            <GlassCard className="rounded-[18px] p-5">
              <b className="block text-2xl font-bold tracking-[-.5px] text-ink">{profile.forum_posts_count ?? 0}</b>
              <span className="text-xs text-subtle">постов на форуме</span>
            </GlassCard>
          </div>

          {profile.skills && profile.skills.length > 0 && (
            <div>
              <div className="text-[13px] tracking-wide uppercase text-subtle font-semibold mb-2.5">Навыки</div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(s => (
                  <span key={s} className="text-xs text-lav bg-white/[.08] border border-white/[.1] rounded-lg px-2.5 py-1.5">{s}</span>
                ))}
              </div>
            </div>
          )}

          {profile.achievements && (
            <GlassCard className="rounded-[18px] p-5">
              <div className="text-[13px] tracking-wide uppercase text-subtle font-semibold mb-3.5">Достижения</div>
              <div className="grid grid-cols-4 gap-2.5">
                {Object.entries(ACHIEVEMENTS).map(([type, a]) => {
                  const unlocked = profile.achievements!.some(x => x.type === type)
                  return (
                    <button
                      key={type}
                      onClick={() => setOpenAchievement(type)}
                      title={a.name}
                      className={`aspect-square rounded-[14px] grid place-items-center text-xl border border-white/[.1] transition-colors hover:bg-white/[.15] ${
                        unlocked ? 'bg-white/[.1]' : 'bg-white/[.03] grayscale opacity-35'
                      }`}
                    >
                      {a.emoji}
                    </button>
                  )
                })}
              </div>
            </GlassCard>
          )}
        </div>

        {/* ── Правая колонка ── */}
        <div>
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
                  <span className="text-sm text-ink flex-1">{activityText(a)}</span>
                  {a.type === 'deal'
                    ? <span className="text-sm font-semibold text-mint shrink-0">+{formatCurrency(a.amount)}</span>
                    : <span className="text-xs text-subtle shrink-0">{timeAgo(a.ago)}</span>}
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
                  <span className="text-sm text-ink flex-1">{a.title}</span>
                  <span className="text-xs text-subtle shrink-0">{timeAgo(a.ago)}</span>
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
              {reviews.map((r, i) => (
                <GlassCard key={i} className="rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Stars rating={r.rating} />
                    <Link to={`/market/users/${r.author_id}`} className="text-lav text-[13.5px] font-semibold hover:underline">
                      {r.author_username}
                    </Link>
                    <span className="text-subtle text-xs ml-auto">{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  {r.text && <p className="text-[13.5px] text-[#e6e1f7] leading-relaxed">{r.text}</p>}
                </GlassCard>
              ))}
            </div>
      )}
        </div>
      </div>

      {/* Achievement detail modal */}
      {openAchievement && ACHIEVEMENTS[openAchievement] && (() => {
        const a = ACHIEVEMENTS[openAchievement]
        const unlocked = profile.achievements?.some(x => x.type === openAchievement) ?? false
        const current = a.statKey ? (profile[a.statKey] ?? 0) : null
        return (
          <Modal open onClose={() => setOpenAchievement(null)} title={`${a.emoji} ${a.name}`}>
            <p className="text-sm text-ink leading-relaxed mb-4">{a.desc}</p>
            {a.target != null && current != null ? (
              <>
                <div className="h-2 rounded-full bg-panel overflow-hidden">
                  <div
                    className={`h-full rounded-full ${unlocked ? 'bg-success' : 'bg-accent'}`}
                    style={{ width: `${Math.min(100, (current / a.target) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-subtle mt-1.5">
                  Прогресс: {Math.min(current, a.target)} / {a.target}
                </div>
              </>
            ) : (
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                unlocked ? 'bg-success/10 text-success' : 'bg-panel text-subtle'
              }`}>
                {unlocked ? 'Получено' : 'Пока не получено'}
              </span>
            )}
          </Modal>
        )
      })()}

      {/* Level detail modal */}
      {levelModalOpen && profile.level != null && (
        <Modal open onClose={() => setLevelModalOpen(false)} title={`Уровень ${profile.level} — ${LEVEL_NAMES[profile.level] ?? ''}`}>
          <p className="text-sm text-subtle mb-3">Текущая репутация: <span className="text-ink font-medium">{profile.reputation ?? 0}</span></p>
          {progress && (
            <>
              <div className="h-2 rounded-full bg-panel overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${progress.pct}%` }} />
              </div>
              <div className="text-xs text-subtle mt-1.5 mb-4">ещё {progress.remaining} репутации до следующего уровня</div>
            </>
          )}
          <div className="text-xs text-subtle uppercase tracking-wide font-semibold mb-2 mt-2">Все уровни</div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {LEVEL_NAMES.slice(1).map((name, i) => {
              const lvl = i + 1
              const threshold = LEVEL_THRESHOLDS[lvl]
              const achieved = (profile.reputation ?? 0) >= threshold
              const isCurrent = lvl === profile.level
              return (
                <div
                  key={lvl}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm ${isCurrent ? 'bg-accent-subtle' : ''}`}
                >
                  <span className={isCurrent ? 'text-accent font-semibold' : achieved ? 'text-ink' : 'text-subtle'}>
                    {lvl}. {name}
                  </span>
                  <span className="text-xs text-subtle">{threshold}+ репутации</span>
                </div>
              )
            })}
          </div>
        </Modal>
      )}
    </div>
  )
}
