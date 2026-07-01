import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, PenLine, Pin, Lock, MessageSquare, Eye, User, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { timeAgo } from '../lib/timeAgo'
import CreateThreadModal from '../components/Forum/CreateThreadModal'

const API = import.meta.env.VITE_BACKEND_URL as string

type Sort = 'activity' | 'date' | 'popular'

interface Author { id: string; nickname: string | null; avatar_url: string | null }

interface Thread {
  id: string
  title: string
  is_pinned: boolean
  is_locked: boolean
  views_count: number
  posts_count: number
  last_post_at: string | null
  created_at: string
  author: Author | null
  last_post_author: Author | null
}

interface CategoryInfo { id: string; name: string; icon_name: string }

function ThreadCard({ t }: { t: Thread }) {
  return (
    <Link to={`/forum/thread/${t.id}`}
      className="block bg-surface border border-line rounded-xl p-4 hover:border-accent/40 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        {/* Author avatar */}
        <div className="shrink-0 mt-0.5">
          {t.author?.avatar_url ? (
            <img src={t.author.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center">
              <User size={14} className="text-accent" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {t.is_pinned && <Pin size={13} className="text-accent shrink-0" />}
            {t.is_locked && <Lock size={13} className="text-subtle shrink-0" />}
            <span className="font-medium text-ink group-hover:text-accent transition-colors text-sm leading-snug">
              {t.title}
            </span>
          </div>

          {/* Meta */}
          <div className="mt-1 flex items-center gap-3 text-xs text-subtle flex-wrap">
            <span>{t.author?.nickname ?? 'Аноним'} · {timeAgo(t.created_at)}</span>
            <span className="flex items-center gap-1"><MessageSquare size={11} />{t.posts_count}</span>
            <span className="flex items-center gap-1"><Eye size={11} />{t.views_count}</span>
          </div>

          {/* Last reply */}
          {t.last_post_at && t.last_post_author && (
            <div className="mt-1 text-xs text-subtle flex items-center gap-1">
              <span>Последний ответ:</span>
              {t.last_post_author.avatar_url && (
                <img src={t.last_post_author.avatar_url} className="w-3.5 h-3.5 rounded-full" alt="" />
              )}
              <span>{t.last_post_author.nickname ?? 'Аноним'}</span>
              <span>· {timeAgo(t.last_post_at)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function ForumCategory() {
  const { id }            = useParams<{ id: string }>()
  const { user, session } = useAuth()
  const showToast         = useToast()

  const [category,   setCategory]   = useState<CategoryInfo | null>(null)
  const [threads,    setThreads]    = useState<Thread[]>([])
  const [sort,       setSort]       = useState<Sort>('activity')
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  async function loadThreads(p: number, s: Sort, reset = false) {
    const setter = reset ? setLoading : setLoadingMore
    setter(true)
    try {
      const res  = await fetch(`${API}/forum/categories/${id}/threads?page=${p}&sort=${s}`)
      const data = await res.json()
      setCategory(data.category ?? null)
      setThreads(prev => reset ? (data.threads ?? []) : [...prev, ...(data.threads ?? [])])
      setHasMore(data.has_more ?? false)
      setPage(p)
    } catch {
      showToast('Не удалось загрузить темы', 'error')
    } finally {
      setter(false)
    }
  }

  useEffect(() => { if (id) loadThreads(1, sort, true) }, [id, sort])

  function changeSort(s: Sort) { setSort(s); setPage(1) }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/forum" className="flex items-center gap-1 text-sm text-subtle hover:text-ink transition-colors">
          <ArrowLeft size={15} /> Форум
        </Link>
        {category && (
          <>
            <span className="text-subtle">/</span>
            <span className="text-sm font-medium text-ink">{category.name}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-ink">{category?.name ?? '…'}</h1>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="relative">
            <select value={sort} onChange={e => changeSort(e.target.value as Sort)}
              className="appearance-none px-3 py-1.5 pr-7 text-sm border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30">
              <option value="activity">По активности</option>
              <option value="date">По дате</option>
              <option value="popular">По популярности</option>
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          </div>

          {user && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors">
              <PenLine size={14} />
              Новая тема
            </button>
          )}
        </div>
      </div>

      {/* Threads */}
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface border border-line rounded-xl p-4 animate-pulse h-20" />
            ))
          : threads.map(t => <ThreadCard key={t.id} t={t} />)
        }
      </div>

      {!loading && threads.length === 0 && (
        <div className="text-center py-16 text-subtle">В этой категории пока нет тем</div>
      )}

      {hasMore && (
        <div className="mt-4 text-center">
          <button onClick={() => loadThreads(page + 1, sort)} disabled={loadingMore}
            className="px-6 py-2 text-sm border border-line rounded-lg text-ink hover:bg-panel transition-colors disabled:opacity-50">
            {loadingMore ? 'Загрузка…' : 'Загрузить ещё'}
          </button>
        </div>
      )}

      {showCreate && session && category && (
        <CreateThreadModal
          token={session.access_token}
          prefillCategoryId={id}
          prefillCategoryName={category.name}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
