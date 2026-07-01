import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageCircle, BookOpen, Briefcase, Megaphone, MessagesSquare,
  PenLine, Search,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { timeAgo } from '../lib/timeAgo'
import { apiCall } from '../lib/api'
import CreateThreadModal from '../components/Forum/CreateThreadModal'
import { GlassCard, Button, Avatar } from '../components/glass'

const API = import.meta.env.VITE_BACKEND_URL as string

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICONS: Record<string, any> = {
  MessageCircle, BookOpen, Briefcase, Megaphone, MessagesSquare,
}

const CAT_COLORS = ['#f5a3e8', '#5eead4', '#c4b5fd', '#7dd3fc', '#fbbf24']
function catColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return CAT_COLORS[h % CAT_COLORS.length]
}

interface ThreadStub { id: string; title: string; last_post_at: string | null; last_post_author: { nickname: string | null; avatar_url: string | null } | null }

interface Category {
  id: string
  name: string
  description: string | null
  icon_name: string
  threads_count: number
  last_thread: ThreadStub | null
  recent_threads: ThreadStub[]
}

interface HotThread {
  id: string
  title: string
  posts_count: number
  created_at: string
  last_post_at: string | null
  author: { id: string; nickname: string | null; avatar_url: string | null } | null
  category: { id: string; name: string } | null
}

interface Leader { id: string; nickname: string | null; avatar_url: string | null; reputation: number }
interface Stats { threads_count: number; posts_count: number }

type SortTab = 'activity' | 'date' | 'top'
const SORT_TABS: { key: SortTab; label: string }[] = [
  { key: 'activity', label: 'Активные' },
  { key: 'date',     label: 'Новые' },
  { key: 'top',      label: 'Топ' },
]

function Skeleton() {
  return (
    <div className="bg-surface border border-line rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-panel shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-panel rounded w-1/3" />
          <div className="h-3 bg-panel rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}

export default function Forum() {
  const { user, session } = useAuth()
  const showToast         = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search,     setSearch]     = useState('')

  const [hotSort, setHotSort] = useState<SortTab>('activity')
  const [hotThreads, setHotThreads] = useState<HotThread[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch(`${API}/forum/categories`)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => showToast('Не удалось загрузить форум', 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    apiCall('GET', `/forum/threads?sort=${hotSort}&limit=7`)
      .then(d => setHotThreads(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [hotSort])

  useEffect(() => {
    apiCall('GET', '/profile/leaderboard').then(d => setLeaders(Array.isArray(d?.users) ? d.users.slice(0, 3) : [])).catch(() => {})
    apiCall('GET', '/stats/public').then(setStats).catch(() => {})
  }, [])

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
  }, [categories, search])

  const popularCategories = useMemo(
    () => [...categories].sort((a, b) => b.threads_count - a.threads_count),
    [categories],
  )

  function openCreate() {
    if (!user) { showToast('Войдите, чтобы создать обсуждение', 'error'); return }
    setShowCreate(true)
  }

  return (
    <div>
      {/* Hero */}
      <GlassCard className="rounded-[26px] px-8 py-7 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-5">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-.5px] text-ink">Общение студентов Губки</h1>
            <p className="text-sm text-subtle mt-1.5 max-w-lg leading-relaxed">
              С правилами, горячий, разнообразный — это не место всех, без парадоксов.
            </p>
          </div>
          <Button onClick={openCreate} variant="pri">
            <PenLine size={15} /> Создать обсуждение
          </Button>
        </div>
        <div className="flex items-center gap-7 mb-5">
          <div><b className="text-xl font-bold text-ink">{stats?.threads_count ?? '—'}</b><span className="text-xs text-subtle ml-1.5">тем</span></div>
          <div><b className="text-xl font-bold text-ink">{stats?.posts_count ?? '—'}</b><span className="text-xs text-subtle ml-1.5">обсуждений</span></div>
        </div>
        <div className="flex items-center gap-2 bg-white/[.07] border border-white/[.12] rounded-[14px] px-3.5 py-2.5 text-sm max-w-sm">
          <Search size={15} className="text-subtle shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по категориям…"
            className="bg-transparent outline-none text-ink placeholder:text-subtle w-full"
          />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div>
          {/* Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
              : filteredCategories.map(cat => {
                  const Icon = ICONS[cat.icon_name] ?? MessagesSquare
                  return (
                    <Link key={cat.id} to={`/forum/category/${cat.id}`}>
                      <GlassCard hover className="rounded-[20px] p-5 h-full">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-11 h-11 rounded-[13px] shrink-0 flex items-center justify-center" style={{ background: `${catColor(cat.name)}26` }}>
                            <Icon size={20} style={{ color: catColor(cat.name) }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-ink">{cat.name}</span>
                              <span className="text-xs text-subtle bg-white/[.08] px-2 py-0.5 rounded-full">{cat.threads_count} тем</span>
                            </div>
                            {cat.description && <p className="text-sm text-subtle mt-0.5 leading-snug">{cat.description}</p>}
                          </div>
                        </div>
                        {cat.last_thread?.last_post_at && (
                          <div className="text-xs text-subtle mb-2.5">
                            Последнее: {cat.last_thread.last_post_author?.nickname ?? 'Аноним'} · {timeAgo(cat.last_thread.last_post_at)}
                          </div>
                        )}
                        {cat.recent_threads.length > 0 && (
                          <div className="border-t border-white/[.08] pt-2.5 flex flex-col gap-1.5">
                            {cat.recent_threads.map(t => (
                              <div key={t.id} className="text-xs text-ink/80 truncate">· {t.title}</div>
                            ))}
                          </div>
                        )}
                      </GlassCard>
                    </Link>
                  )
                })
            }
            {!loading && filteredCategories.length === 0 && (
              <div className="col-span-full text-center py-12 text-subtle text-sm">Ничего не найдено</div>
            )}
          </div>

          {/* Hot threads */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-semibold text-ink">Горячие темы</h2>
            <div className="flex gap-1 bg-white/[.07] border border-white/[.12] rounded-[12px] p-1 ml-auto">
              {SORT_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setHotSort(t.key)}
                  className={`text-sm font-semibold px-3.5 py-1.5 rounded-[9px] transition-colors ${hotSort === t.key ? 'text-[#1a1140] bg-gradient-to-br from-lav to-[#ddd6fe]' : 'text-subtle'}`}
                >{t.label}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {hotThreads.length === 0
              ? <GlassCard className="rounded-2xl py-8 text-center text-subtle text-sm">Тем пока нет</GlassCard>
              : hotThreads.map(t => (
                  <GlassCard key={t.id} className="rounded-2xl px-5 py-3.5 flex items-center gap-3">
                    <Link to={`/market/users/${t.author?.id}`} className="shrink-0">
                      <Avatar name={t.author?.nickname} src={t.author?.avatar_url} size={34} radius={10} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/forum/thread/${t.id}`} className="text-sm text-ink hover:text-lav transition-colors truncate block">{t.title}</Link>
                      <div className="text-xs text-subtle mt-0.5 flex items-center gap-1.5">
                        <Link to={`/market/users/${t.author?.id}`} className="hover:text-ink transition-colors">{t.author?.nickname}</Link>
                        {t.category && (
                          <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded" style={{ color: catColor(t.category.name), background: `${catColor(t.category.name)}1f` }}>
                            {t.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-ink shrink-0">{t.posts_count}</div>
                  </GlassCard>
                ))
            }
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {leaders.length > 0 && (
            <GlassCard className="rounded-[20px] p-5">
              <h3 className="text-sm font-semibold text-ink mb-3.5">🏆 Топ авторов недели</h3>
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

          {popularCategories.length > 0 && (
            <GlassCard className="rounded-[20px] p-5">
              <h3 className="text-sm font-semibold text-ink mb-3.5">🔥 Популярные категории</h3>
              <div className="flex flex-wrap gap-2">
                {popularCategories.map(c => (
                  <Link
                    key={c.id}
                    to={`/forum/category/${c.id}`}
                    className="text-sm font-medium px-3.5 py-2 rounded-[11px] whitespace-nowrap transition-colors duration-150 text-lav bg-white/[.07] border border-white/[.12] hover:bg-white/[.12] hover:text-ink"
                  >
                    {c.name} · {c.threads_count}
                  </Link>
                ))}
              </div>
            </GlassCard>
          )}

          <GlassCard className="rounded-[20px] p-5">
            <h3 className="text-sm font-semibold text-ink mb-3.5">📋 Правила коротко</h3>
            <ol className="text-[13px] text-subtle leading-relaxed space-y-2 list-decimal list-inside">
              <li>Уважай собеседников — даже если не согласен</li>
              <li>Реклама — только в специальных темах</li>
              <li>Помогай форуму — репортируй нарушения</li>
            </ol>
          </GlassCard>
        </div>
      </div>

      {showCreate && session && (
        <CreateThreadModal
          token={session.access_token}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
