import { useEffect, useState, useRef, FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Lock, Pin, Trash2, Flag, Shield, Paperclip, Smile, AtSign, Code2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { timeAgo } from '../lib/timeAgo'
import ReportModal from '../components/Forum/ReportModal'
import { GlassCard, Avatar, Button } from '../components/glass'
import VipName from '../components/VipBadge'

const API = import.meta.env.VITE_BACKEND_URL as string

const EMOJIS = ['👍', '👎', '😂', '🔥'] as const
type Emoji = typeof EMOJIS[number]

interface Author { id: string; nickname: string | null; avatar_url: string | null; level?: number; is_vip?: boolean }

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
    <div className="flex items-center gap-2 flex-wrap">
      {EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => toggle(emoji)}
          className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-[11px] transition-colors duration-150 ${
            mine[emoji]
              ? 'bg-mint/[.16] border border-mint/40 text-mint'
              : 'bg-white/[.07] border border-white/[.12] text-ink hover:bg-white/[.13]'
          }`}>
          {emoji}
          {(counts[emoji] ?? 0) > 0 && <span>{counts[emoji]}</span>}
        </button>
      ))}
    </div>
  )
}

function PostCard({
  post, isOp, currentUserId, isAdmin, token, onDelete, onReport, onReactionChange,
}: {
  post: Post
  isOp: boolean
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
      <GlassCard className="rounded-[20px] px-6 py-5 mb-3.5">
        <p className="text-sm text-subtle italic">Пост удалён</p>
      </GlassCard>
    )
  }

  return (
    <GlassCard
      className={`rounded-[20px] px-6 py-5 mb-3.5 flex gap-4 ${post.is_deleted ? 'opacity-50' : ''} ${
        isOp ? '!bg-accent/[.12] !border-lav/[.35]' : ''
      }`}
    >
      <Avatar name={post.author?.nickname} src={post.author?.avatar_url} size={46} radius={14} isVip={post.author?.is_vip} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
          <span className="font-semibold text-[15px] text-ink"><VipName name={post.author?.nickname ?? 'Аноним'} isVip={post.author?.is_vip} /></span>
          {post.author?.level != null && (
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md text-lav bg-white/[.08]">Ур. {post.author.level}</span>
          )}
          {isOp && <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-[7px] text-[#08221c] bg-gold">Автор</span>}
          {post.moderation_status === 'flagged' && isAdmin && (
            <span className="text-xs bg-error/10 text-error px-1.5 py-0.5 rounded">AI-флаг</span>
          )}
          {post.is_deleted && <span className="text-xs bg-panel text-subtle px-1.5 py-0.5 rounded">Удалён</span>}
          <span className="text-[12.5px] text-subtle ml-auto">{timeAgo(post.created_at)}</span>
        </div>

        <p className="text-[14.5px] leading-relaxed text-[#e6e1f7] whitespace-pre-wrap break-words">{post.content}</p>

        <div className="mt-4 flex items-center gap-2.5 flex-wrap">
          <ReactionBar
            reactions={post.reactions}
            postId={post.id}
            userId={currentUserId}
            token={token}
            onChange={onReactionChange}
          />
          <span className="flex-1" />
          {currentUserId && !post.is_deleted && (
            <button onClick={() => onReport(post.id)} className="text-[13px] font-medium text-subtle hover:text-ink transition-colors flex items-center gap-1">
              <Flag size={12} /> Пожаловаться
            </button>
          )}
          {(isOwn || isAdmin) && !post.is_deleted && (
            <button onClick={() => onDelete(post.id)} className="text-[13px] font-medium text-subtle hover:text-error transition-colors flex items-center gap-1">
              <Trash2 size={12} /> Удалить
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

export default function ForumThread() {
  const { id }            = useParams<{ id: string }>()
  const { user, session, profile, isVip } = useAuth()
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

  const totalReactions = posts.reduce((sum, p) => sum + p.reactions.length, 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-[13px] font-medium flex-wrap text-subtle">
        <Link to="/forum" className="flex items-center gap-1 hover:text-ink transition-colors">
          <ArrowLeft size={14} /> Форум
        </Link>
        {thread?.category && (
          <>
            <span className="opacity-50">/</span>
            <Link to={`/forum/category/${thread.category.id}`} className="hover:text-ink transition-colors">
              {thread.category.name}
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="min-w-0">
          {/* Thread header */}
          {thread && (
            <GlassCard className="rounded-[24px] px-7 py-6 mb-4">
              <div className="flex items-start gap-2 flex-wrap mb-3.5">
                {thread.is_pinned && <Pin size={15} className="text-lav mt-1 shrink-0" />}
                {thread.is_locked && <Lock size={15} className="text-subtle mt-1 shrink-0" />}
                <h1 className="text-[30px] font-bold leading-[1.18] tracking-[-.6px] text-ink">{thread.title}</h1>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Avatar name={thread.author?.nickname} src={thread.author?.avatar_url} size={44} radius={13} isVip={thread.author?.is_vip} />
                <div>
                  <div className="font-semibold text-[14.5px] text-ink"><VipName name={thread.author?.nickname ?? 'Аноним'} isVip={thread.author?.is_vip} /></div>
                  <div className="text-[12.5px] text-subtle">{timeAgo(thread.created_at)}</div>
                </div>
                <div className="ml-auto flex gap-5 text-right">
                  <div><b className="block text-lg font-bold text-ink">{thread.posts_count}</b><span className="text-[11px] text-subtle">{plural(thread.posts_count, 'ответ', 'ответа', 'ответов')}</span></div>
                  <div><b className="block text-lg font-bold text-mint">{thread.views_count}</b><span className="text-[11px] text-subtle">просмотров</span></div>
                  <div><b className="block text-lg font-bold text-gold">{totalReactions}</b><span className="text-[11px] text-subtle">реакций</span></div>
                </div>
              </div>
              {isAdmin && (
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={toggleLock} disabled={locking}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs border border-line rounded-lg text-subtle hover:text-ink hover:bg-panel transition-colors disabled:opacity-50">
                    <Shield size={12} />
                    {thread.is_locked ? 'Разблокировать тему' : 'Закрыть тему'}
                  </button>
                </div>
              )}
            </GlassCard>
          )}

          {/* Posts */}
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <GlassCard key={i} className="rounded-[20px] px-6 py-5 mb-3.5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-[46px] h-[46px] rounded-[14px] bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/10 rounded w-1/4" />
                      <div className="h-3 bg-white/10 rounded w-full" />
                      <div className="h-3 bg-white/10 rounded w-3/4" />
                    </div>
                  </div>
                </GlassCard>
              ))
            : posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  isOp={!!thread?.author && post.author?.id === thread.author.id}
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
            <GlassCard className="rounded-[20px] py-10 text-center mb-3.5">
              <p className="text-sm text-subtle">Нет сообщений</p>
            </GlassCard>
          )}

          {hasMore && (
            <div className="text-center mb-4">
              <button onClick={() => loadPosts(page + 1)} disabled={loadingMore}
                className="px-6 py-2.5 text-sm border border-line rounded-xl text-ink hover:bg-panel transition-colors disabled:opacity-50">
                {loadingMore ? 'Загрузка…' : 'Загрузить ещё'}
              </button>
            </div>
          )}

          {/* Reply form */}
          <GlassCard className="rounded-[22px] px-6 py-5 mt-1.5">
            <h3 className="text-base font-semibold text-ink mb-3.5">Ваш ответ</h3>
            {user ? (
              thread?.is_locked ? (
                <div className="flex items-center gap-2 text-sm text-subtle py-2">
                  <Lock size={14} /> Тема закрыта для новых ответов
                </div>
              ) : (
                <form onSubmit={sendReply} className="flex gap-3.5">
                  <Avatar name={profile?.nickname ?? 'Я'} src={profile?.avatar_url} size={44} radius={13} isVip={isVip} />
                  <div className="flex-1">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Написать ответ…"
                      rows={4}
                      maxLength={10000}
                      className="w-full min-h-[96px] rounded-[14px] bg-white/[.06] border border-white/[.14] text-ink text-sm px-4 py-3.5 resize-none leading-relaxed placeholder:text-subtle2 focus:outline-none focus:border-lav/40 transition-colors"
                    />
                    <div className="flex items-center gap-2.5 mt-3">
                      <div className="flex gap-2 text-subtle">
                        <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center bg-white/[.06] border border-white/[.12]"><Paperclip size={15} /></span>
                        <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center bg-white/[.06] border border-white/[.12]"><Smile size={15} /></span>
                        <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center bg-white/[.06] border border-white/[.12]"><AtSign size={15} /></span>
                        <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center bg-white/[.06] border border-white/[.12]"><Code2 size={15} /></span>
                      </div>
                      <span className="flex-1" />
                      <Button type="submit" variant="mint" disabled={!reply.trim() || sending}>
                        {sending ? 'Отправка…' : 'Отправить ответ'}
                      </Button>
                    </div>
                  </div>
                </form>
              )
            ) : (
              <div className="text-sm text-subtle py-2 text-center">
                <Link to="/login" className="text-lav hover:underline">Войдите</Link>, чтобы ответить
              </div>
            )}
          </GlassCard>
        </div>

        {/* Sidebar */}
        {thread && (
          <div className="flex flex-col gap-4">
            <GlassCard className="rounded-[20px] p-5 text-center">
              <Avatar name={thread.author?.nickname} src={thread.author?.avatar_url} size={64} radius={18} isVip={thread.author?.is_vip} className="mx-auto mb-3 text-[22px]" />
              <Link to={`/market/users/${thread.author?.id}`} className="font-semibold text-base text-ink hover:underline">
                <VipName name={thread.author?.nickname ?? 'Аноним'} isVip={thread.author?.is_vip} />
              </Link>
            </GlassCard>
            <GlassCard className="rounded-[20px] p-5">
              <h3 className="text-sm font-semibold text-ink mb-3.5 flex items-center gap-2">📌 Об этой теме</h3>
              <div className="flex gap-2.5 py-2.5 border-b border-white/[.08] text-[13px]">
                <span className="text-subtle">Создана</span>
                <span className="ml-auto text-ink">{new Date(thread.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              {thread.category && (
                <div className="flex gap-2.5 py-2.5 text-[13px]">
                  <span className="text-subtle">Категория</span>
                  <span className="ml-auto text-ink">{thread.category.name}</span>
                </div>
              )}
            </GlassCard>
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
