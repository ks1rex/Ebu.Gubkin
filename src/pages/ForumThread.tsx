import { useEffect, useState, useRef, FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Lock, Pin, User, Trash2, Flag, Shield,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { timeAgo } from '../lib/timeAgo'
import ReportModal from '../components/Forum/ReportModal'

const API = import.meta.env.VITE_BACKEND_URL as string

const EMOJIS = ['👍', '👎', '😂', '🔥'] as const
type Emoji = typeof EMOJIS[number]

interface Author { id: string; nickname: string | null; avatar_url: string | null }

interface Reaction { id: string; user_id: string; emoji: string }

interface Post {
  id: string
  content: string
  is_deleted: boolean
  moderation_status: string
  created_at: string
  author: Author | null
  reactions: Reaction[]
}

interface Thread {
  id: string
  title: string
  is_pinned: boolean
  is_locked: boolean
  views_count: number
  posts_count: number
  created_at: string
  author: Author | null
  category: { id: string; name: string } | null
}

function Avatar({ author }: { author: Author | null }) {
  if (author?.avatar_url) {
    return <img src={author.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
  }
  return (
    <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
      <User size={14} className="text-accent" />
    </div>
  )
}

function ReactionBar({
  reactions, postId, userId, token, onChange,
}: {
  reactions: Reaction[]; postId: string; userId: string | null; token: string | null; onChange: () => void
}) {
  const counts: Record<string, number> = {}
  const mine: Record<string, boolean>  = {}
  for (const r of reactions) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
    if (r.user_id === userId) mine[r.emoji] = true
  }

  async function toggle(emoji: Emoji) {
    if (!token) return
    await fetch(`${API}/forum/posts/${postId}/react`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ emoji }),
    })
    onChange()
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => toggle(emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors
            ${mine[emoji]
              ? 'bg-accent-subtle border-accent/40 text-accent font-medium'
              : 'bg-panel border-line text-subtle hover:border-accent/40 hover:text-ink'
            }`}>
          {emoji}
          {(counts[emoji] ?? 0) > 0 && <span>{counts[emoji]}</span>}
        </button>
      ))}
    </div>
  )
}

function PostCard({
  post, currentUserId, isAdmin, token, onDelete, onReport, onReactionChange,
}: {
  post: Post
  currentUserId: string | null
  isAdmin: boolean
  token: string | null
  onDelete: (id: string) => void
  onReport: (id: string) => void
  onReactionChange: () => void
}) {
  const isOwn = post.author?.id === currentUserId

  if (post.is_deleted && !isAdmin) {
    return (
      <div className="py-3 px-4 border-b border-line last:border-0">
        <p className="text-sm text-subtle italic">Пост удалён</p>
      </div>
    )
  }

  return (
    <div className={`py-4 px-4 border-b border-line last:border-0 ${post.is_deleted ? 'opacity-50' : ''}`}>
      <div className="flex gap-3">
        <Avatar author={post.author} />
        <div className="flex-1 min-w-0">
          {/* Author + date */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-ink">{post.author?.nickname ?? 'Аноним'}</span>
            <span className="text-xs text-subtle">{timeAgo(post.created_at)}</span>
            {post.moderation_status === 'flagged' && isAdmin && (
              <span className="text-xs bg-error/10 text-error px-1.5 py-0.5 rounded">AI-флаг</span>
            )}
            {post.is_deleted && <span className="text-xs bg-panel text-subtle px-1.5 py-0.5 rounded">Удалён</span>}
          </div>

          {/* Content */}
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>

          {/* Reactions + actions */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <ReactionBar
              reactions={post.reactions}
              postId={post.id}
              userId={currentUserId}
              token={token}
              onChange={onReactionChange}
            />
            <div className="ml-auto flex items-center gap-1">
              {currentUserId && !post.is_deleted && (
                <button onClick={() => onReport(post.id)} title="Пожаловаться"
                  className="p-1.5 rounded text-subtle hover:text-error hover:bg-error/10 transition-colors">
                  <Flag size={13} />
                </button>
              )}
              {(isOwn || isAdmin) && !post.is_deleted && (
                <button onClick={() => onDelete(post.id)} title="Удалить"
                  className="p-1.5 rounded text-subtle hover:text-error hover:bg-error/10 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ForumThread() {
  const { id }            = useParams<{ id: string }>()
  const { user, session, profile } = useAuth()
  const showToast         = useToast()

  const [thread,     setThread]     = useState<Thread | null>(null)
  const [posts,      setPosts]      = useState<Post[]>([])
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reply,      setReply]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [reportId,   setReportId]   = useState<string | null>(null)
  const [locking,    setLocking]    = useState(false)
  const viewTracked = useRef(false)

  const isAdmin = profile?.is_admin ?? false

  async function loadThread() {
    const res  = await fetch(`${API}/forum/threads/${id}`)
    const data = await res.json()
    if (res.ok) setThread(data)
  }

  async function loadPosts(p: number, reset = false) {
    const setter = reset ? setLoading : setLoadingMore
    setter(true)
    try {
      const res  = await fetch(`${API}/forum/threads/${id}/posts?page=${p}`)
      const data = await res.json()
      setPosts(prev => reset ? (data.posts ?? []) : [...prev, ...(data.posts ?? [])])
      setHasMore(data.has_more ?? false)
      setPage(p)
    } catch {
      showToast('Не удалось загрузить сообщения', 'error')
    } finally {
      setter(false)
    }
  }

  useEffect(() => {
    if (!id) return
    loadThread()
    loadPosts(1, true)
    // Increment view count once per session per thread
    const key = `forum_viewed_${id}`
    if (!viewTracked.current && !sessionStorage.getItem(key)) {
      viewTracked.current = true
      sessionStorage.setItem(key, '1')
      fetch(`${API}/forum/threads/${id}/view`, { method: 'POST' }).catch(() => {})
    }
  }, [id])

  async function sendReply(e: FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !session) return
    setSending(true)
    try {
      const res  = await fetch(`${API}/forum/threads/${id}/posts`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ content: reply.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Ошибка при отправке', 'error'); return }
      setReply('')
      // Refresh last page to show new post
      await loadPosts(1, true)
    } catch {
      showToast('Не удалось отправить ответ', 'error')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(postId: string) {
    if (!session) return
    if (!confirm('Удалить пост?')) return
    const res = await fetch(`${API}/forum/posts/${postId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_deleted: true } : p))
    } else {
      showToast('Не удалось удалить пост', 'error')
    }
  }

  async function toggleLock() {
    if (!session || !thread) return
    setLocking(true)
    try {
      const res  = await fetch(`${API}/forum/threads/${id}/lock`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok) setThread(prev => prev ? { ...prev, is_locked: data.is_locked } : prev)
    } catch {
      showToast('Ошибка', 'error')
    } finally {
      setLocking(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-sm flex-wrap">
        <Link to="/forum" className="flex items-center gap-1 text-subtle hover:text-ink transition-colors">
          <ArrowLeft size={14} /> Форум
        </Link>
        {thread?.category && (
          <>
            <span className="text-subtle">/</span>
            <Link to={`/forum/category/${thread.category.id}`} className="text-subtle hover:text-ink transition-colors">
              {thread.category.name}
            </Link>
          </>
        )}
      </div>

      {/* Thread header */}
      {thread && (
        <div className="bg-surface border border-line rounded-xl p-5 mb-4">
          <div className="flex items-start gap-2 flex-wrap">
            {thread.is_pinned && <Pin size={15} className="text-accent mt-0.5 shrink-0" />}
            {thread.is_locked && <Lock size={15} className="text-subtle mt-0.5 shrink-0" />}
            <h1 className="text-lg font-semibold text-ink leading-snug">{thread.title}</h1>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-subtle flex-wrap">
            <div className="flex items-center gap-1.5">
              <Avatar author={thread.author} />
              <span>{thread.author?.nickname ?? 'Аноним'}</span>
            </div>
            <span>· {timeAgo(thread.created_at)}</span>
            <span>· {thread.posts_count} {plural(thread.posts_count, 'ответ', 'ответа', 'ответов')}</span>
            <span>· {thread.views_count} просмотров</span>
          </div>
          {isAdmin && (
            <div className="mt-3 flex items-center gap-2">
              <button onClick={toggleLock} disabled={locking}
                className="flex items-center gap-1 px-3 py-1 text-xs border border-line rounded-md text-subtle hover:text-ink hover:bg-panel transition-colors disabled:opacity-50">
                <Shield size={12} />
                {thread.is_locked ? 'Разблокировать тему' : 'Закрыть тему'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Posts */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden mb-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border-b border-line last:border-0 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-panel shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-panel rounded w-1/4" />
                    <div className="h-3 bg-panel rounded w-full" />
                    <div className="h-3 bg-panel rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))
          : posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id ?? null}
                isAdmin={isAdmin}
                token={session?.access_token ?? null}
                onDelete={handleDelete}
                onReport={setReportId}
                onReactionChange={() => loadPosts(1, true)}
              />
            ))
        }
        {!loading && posts.length === 0 && (
          <div className="py-8 text-center text-subtle text-sm">Нет сообщений</div>
        )}
      </div>

      {hasMore && (
        <div className="text-center mb-4">
          <button onClick={() => loadPosts(page + 1)} disabled={loadingMore}
            className="px-6 py-2 text-sm border border-line rounded-lg text-ink hover:bg-panel transition-colors disabled:opacity-50">
            {loadingMore ? 'Загрузка…' : 'Загрузить ещё'}
          </button>
        </div>
      )}

      {/* Reply form */}
      <div className="bg-surface border border-line rounded-xl p-4">
        {user ? (
          thread?.is_locked ? (
            <div className="flex items-center gap-2 text-sm text-subtle py-2">
              <Lock size={14} /> Тема закрыта для новых ответов
            </div>
          ) : (
            <form onSubmit={sendReply} className="space-y-3">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Написать ответ…"
                rows={4}
                maxLength={10000}
                className="w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={!reply.trim() || sending}
                  className="px-5 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
                  {sending ? 'Отправка…' : 'Ответить'}
                </button>
              </div>
            </form>
          )
        ) : (
          <div className="text-sm text-subtle py-2 text-center">
            <Link to="/login" className="text-accent hover:underline">Войдите</Link>, чтобы ответить
          </div>
        )}
      </div>

      {/* Report modal */}
      {reportId && session && (
        <ReportModal
          postId={reportId}
          token={session.access_token}
          onClose={() => setReportId(null)}
        />
      )}
    </div>
  )
}

function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100
  const rem = abs % 10
  if (abs >= 11 && abs <= 19) return many
  if (rem === 1) return one
  if (rem >= 2 && rem <= 4) return few
  return many
}
