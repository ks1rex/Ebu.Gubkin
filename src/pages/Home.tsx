import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Briefcase, FileText, Wallet as WalletIcon, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { formatCurrency } from '../lib/format'
import { timeAgo } from '../lib/timeAgo'
import { GlassCard, Button, Avatar, Chip } from '../components/glass'

const logoHorizontal = `${import.meta.env.BASE_URL}logo-horizontal.png`

// ponytail: no websocket presence channel exists yet — static placeholder
// until one ships (see TODO_BACKEND.md).
const ONLINE_NOW = 312

interface Stats { users_count: number; threads_count: number; orders_count: number; total_paid: number }

interface ThreadPreview {
  id: string
  title: string
  posts_count: number
  created_at: string
  last_post_at: string | null
  author: { id: string; nickname: string | null; avatar_url: string | null } | null
  category: { id: string; name: string } | null
}

interface OrderPreview {
  id: string
  title: string
  base_amount: number
  created_at: string
  customer: { nickname: string | null; avatar_url: string | null } | null
}

interface ListingPreview {
  id: string
  title: string
  price: number
  created_at: string
  owner: { nickname: string | null; avatar_url: string | null } | null
}

interface Leader { id: string; nickname: string | null; avatar_url: string | null; reputation: number }

export default function Home() {
  const { user, profile } = useAuth()

  const [stats, setStats] = useState<Stats | null>(null)
  const [feedMode, setFeedMode] = useState<'forum' | 'market'>('forum')
  const [threads, setThreads] = useState<ThreadPreview[]>([])
  const [orders, setOrders]   = useState<OrderPreview[]>([])
  const [listings, setListings] = useState<ListingPreview[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    apiCall('GET', '/stats/public').then(setStats).catch(() => {})
    apiCall('GET', '/forum/threads?limit=5').then(d => setThreads(Array.isArray(d) ? d : [])).catch(() => {})
    apiCall('GET', '/orders?limit=5').then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {})
    apiCall('GET', '/listings?limit=5').then(d => setListings(Array.isArray(d) ? d : [])).catch(() => {})
    apiCall('GET', '/profile/leaderboard').then(d => setLeaders(Array.isArray(d?.users) ? d.users.slice(0, 4) : [])).catch(() => {})
    apiCall('GET', '/forum/trending-tags').then(d => setTags(Array.isArray(d?.tags) ? d.tags : [])).catch(() => {})
  }, [])

  const marketItems = [...orders.map(o => ({ ...o, kind: 'order' as const })), ...listings.map(l => ({ ...l, kind: 'listing' as const }))]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div>
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <img src={logoHorizontal} alt="Ebu.Gubkin" className="h-12 mx-auto mb-5 object-contain" />
        <div className="text-xs tracking-[2px] text-subtle font-semibold uppercase mb-4">
          Студенческая платформа Губкинского университета
        </div>
        <h1 className="text-[40px] leading-[1.1] font-bold tracking-[-1px] mb-4">
          <span className="text-ink">Вся студжизнь Губки —</span><br />
          <span className="bg-gradient-to-r from-[#7c3aed] to-pink bg-clip-text text-transparent">в одном месте</span>
        </h1>
        <p className="text-subtle text-[15px] leading-relaxed mb-7 max-w-md mx-auto">
          Форум, биржа подработок, оформление документов по ГОСТ и кошелёк. Без официоза — для своих.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button to="/market" variant="pri">Перейти на биржу</Button>
          <Button to="/forum" variant="ghost">Как это работает</Button>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-10">
        <GlassCard className="rounded-[18px] p-5 text-center">
          <b className="block text-2xl font-bold text-ink">{stats?.users_count ?? '—'}</b>
          <span className="text-xs text-subtle">студентов на сайте</span>
        </GlassCard>
        <GlassCard className="rounded-[18px] p-5 text-center">
          <b className="block text-2xl font-bold text-mint">{ONLINE_NOW}</b>
          <span className="text-xs text-subtle">онлайн сейчас</span>
        </GlassCard>
        <GlassCard className="rounded-[18px] p-5 text-center">
          <b className="block text-2xl font-bold text-ink">{stats?.threads_count ?? '—'}</b>
          <span className="text-xs text-subtle">тем на форуме</span>
        </GlassCard>
        <GlassCard className="rounded-[18px] p-5 text-center">
          <b className="block text-2xl font-bold text-gold">{stats ? formatCurrency(stats.total_paid) : '—'}</b>
          <span className="text-xs text-subtle">выплачено на бирже</span>
        </GlassCard>
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Link to="/forum">
          <GlassCard hover className="rounded-[20px] p-6 h-full flex flex-col">
            <div className="w-11 h-11 rounded-[13px] bg-lav/[.15] flex items-center justify-center mb-4">
              <BookOpen size={20} className="text-lav" />
            </div>
            <h3 className="font-semibold text-ink mb-1.5">Форум</h3>
            <p className="text-sm text-subtle leading-relaxed mb-3 flex-1">Обсуждения по предметам, курсам и жизни университета</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-subtle">{stats ? `${stats.threads_count} тем` : ''}</span>
              <ArrowRight size={15} className="text-lav" />
            </div>
          </GlassCard>
        </Link>
        <Link to="/market">
          <GlassCard hover className="rounded-[20px] p-6 h-full flex flex-col">
            <div className="w-11 h-11 rounded-[13px] bg-mint/[.15] flex items-center justify-center mb-4">
              <Briefcase size={20} className="text-mint" />
            </div>
            <h3 className="font-semibold text-ink mb-1.5">Биржа</h3>
            <p className="text-sm text-subtle leading-relaxed mb-3 flex-1">Заказы и услуги между студентами — быстро и безопасно</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-subtle">{stats ? `${stats.orders_count} заказов` : ''}</span>
              <ArrowRight size={15} className="text-mint" />
            </div>
          </GlassCard>
        </Link>
        <Link to="/gost">
          <GlassCard hover className="rounded-[20px] p-6 h-full flex flex-col">
            <div className="w-11 h-11 rounded-[13px] bg-gold/[.15] flex items-center justify-center mb-4">
              <FileText size={20} className="text-gold" />
            </div>
            <h3 className="font-semibold text-ink mb-1.5">ГОСТ-калькулятор</h3>
            <p className="text-sm text-subtle leading-relaxed mb-3 flex-1">AI-генерация документов по ГОСТ с автоформатированием</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-subtle">от 1 токена</span>
              <ArrowRight size={15} className="text-gold" />
            </div>
          </GlassCard>
        </Link>
        <Link to="/wallet">
          <GlassCard hover className="rounded-[20px] p-6 h-full flex flex-col">
            <div className="w-11 h-11 rounded-[13px] bg-pink/[.15] flex items-center justify-center mb-4">
              <WalletIcon size={20} className="text-pink" />
            </div>
            <h3 className="font-semibold text-ink mb-1.5">Кошелёк</h3>
            <p className="text-sm text-subtle leading-relaxed mb-3 flex-1">Рублёвый баланс и ГОСТ-токены в одном месте</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-subtle">{user ? `баланс ${formatCurrency(profile?.balance ?? 0)}` : 'реферальная программа'}</span>
              <ArrowRight size={15} className="text-pink" />
            </div>
          </GlassCard>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Что происходит сейчас */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-semibold text-ink">Что происходит сейчас</h2>
            <div className="flex gap-1 bg-white/[.07] border border-white/[.12] rounded-[12px] p-1 ml-auto">
              <button
                onClick={() => setFeedMode('forum')}
                className={`text-sm font-semibold px-4 py-1.5 rounded-[9px] transition-colors ${feedMode === 'forum' ? 'text-[#1a1140] bg-gradient-to-br from-lav to-[#ddd6fe]' : 'text-subtle'}`}
              >Форум</button>
              <button
                onClick={() => setFeedMode('market')}
                className={`text-sm font-semibold px-4 py-1.5 rounded-[9px] transition-colors ${feedMode === 'market' ? 'text-[#1a1140] bg-gradient-to-br from-lav to-[#ddd6fe]' : 'text-subtle'}`}
              >Биржа</button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {feedMode === 'forum' ? (
              threads.length === 0
                ? <GlassCard className="rounded-2xl py-8 text-center text-subtle text-sm">Тем пока нет</GlassCard>
                : threads.map(t => (
                    <Link key={t.id} to={`/forum/thread/${t.id}`}>
                      <GlassCard hover className="rounded-2xl px-5 py-4 flex items-center gap-3">
                        <Avatar name={t.author?.nickname} src={t.author?.avatar_url} size={36} radius={11} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink truncate">{t.title}</div>
                          <div className="text-xs text-subtle mt-0.5">
                            {t.author?.nickname} {t.category && <>· {t.category.name}</>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-subtle">{t.posts_count} ответов</div>
                          <div className="text-[11px] text-subtle/70">{timeAgo(t.last_post_at ?? t.created_at)}</div>
                        </div>
                      </GlassCard>
                    </Link>
                  ))
            ) : (
              marketItems.length === 0
                ? <GlassCard className="rounded-2xl py-8 text-center text-subtle text-sm">Пока пусто</GlassCard>
                : marketItems.map(item => (
                    <Link key={item.id} to={item.kind === 'order' ? `/market/orders/${item.id}` : `/market/services/${item.id}`}>
                      <GlassCard hover className="rounded-2xl px-5 py-4 flex items-center gap-3">
                        <Avatar
                          name={item.kind === 'order' ? item.customer?.nickname : item.owner?.nickname}
                          src={item.kind === 'order' ? item.customer?.avatar_url : item.owner?.avatar_url}
                          size={36} radius={11}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink truncate">{item.title}</div>
                          <div className="text-xs text-subtle mt-0.5">
                            {item.kind === 'order' ? item.customer?.nickname : item.owner?.nickname}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-mint">{formatCurrency(item.kind === 'order' ? item.base_amount : item.price)}</div>
                          <div className="text-[11px] text-subtle/70">{timeAgo(item.created_at)}</div>
                        </div>
                      </GlassCard>
                    </Link>
                  ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <GlassCard className="rounded-[20px] p-6 !bg-gradient-to-br !from-[#7c3aed]/[.22] !to-pink/[.14]">
            <h3 className="text-lg font-bold text-ink mb-2">Курсач по ГОСТ за ночь?</h3>
            <p className="text-[13px] text-subtle leading-relaxed mb-4">
              Загрузи задание, оформим по ГОСТ за пару минут. Списывай токены — не нервы.
            </p>
            <Button to="/gost" variant="pri" className="w-full justify-center">Открыть ГОСТ-калькулятор →</Button>
          </GlassCard>

          {leaders.length > 0 && (
            <GlassCard className="rounded-[20px] p-5">
              <h3 className="text-sm font-semibold text-ink mb-3.5">🏆 Топ студентов недели</h3>
              <div className="flex flex-col gap-3">
                {leaders.map((l, i) => (
                  <Link key={l.id} to={`/market/users/${l.id}`} className="flex items-center gap-2.5">
                    <span className="w-5 text-sm font-bold text-subtle shrink-0">{i + 1}</span>
                    <Avatar name={l.nickname} src={l.avatar_url} size={32} radius={10} className="text-xs" />
                    <span className="text-sm text-ink flex-1 truncate">{l.nickname}</span>
                    <span className="text-xs font-semibold text-mint shrink-0">{l.reputation}</span>
                  </Link>
                ))}
              </div>
            </GlassCard>
          )}

          {tags.length > 0 && (
            <GlassCard className="rounded-[20px] p-5">
              <h3 className="text-sm font-semibold text-ink mb-3.5">🔥 В тренде</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => <Chip key={t}>#{t}</Chip>)}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}
