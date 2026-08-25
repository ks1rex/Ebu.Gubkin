import { useEffect, useState, useRef, FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Lock, Pin, Trash2, Flag, Shield, Paperclip, Smile, AtSign,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { timeAgo } from '../lib/timeAgo'
import { profileLink } from '../lib/format'
import { Attachment } from '../lib/attachments'
import { useForumAttachments } from '../lib/useForumAttachments'
import ReportModal from '../components/Forum/ReportModal'
import AttachmentList from '../components/Forum/AttachmentList'
import { GlassCard, Avatar, Button } from '../components/glass'
import VipName from '../components/VipBadge'

const API = import.meta.env.VITE_BACKEND_URL as string

const EMOJIS = ['👍', '👎', '😂', '🔥'] as const
type Emoji = typeof EMOJIS[number]

const REPLY_EMOJIS = ['😀', '😂', '😍', '🤔', '😢', '😡', '👍', '👎', '🔥', '🎉', '🙏', '😮', '😴', '🤝', '💯', '❤️']

const POSTS_PAGE_SIZE = 10 // держим в паре с reshbirga/backend/src/routes/forum.js

interface Author { id: string; nickname: string | null; avatar_url: string | null; level?: number; is_vip?: boolean }

interface Reaction { id: string; user_id: string; emoji: string }

interface Post {
  id: string
  content: string
  attachments: Attachment[]
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
  cover_url: string | null
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
          {isOp && <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-[7px] text-canvas bg-gold">Автор</span>}
          {post.moderation_status === 'flagged' && isAdmin && (
            <span className="text-xs bg-error/10 text-error px-1.5 py-0.5 rounded">AI-флаг</span>
          )}
          {post.is_deleted && <span className="text-xs bg-panel text-subtle px-1.5 py-0.5 rounded">Удалён</span>}
        </div>

        {post.content && <p className="text-[14.5px] leading-relaxed text-ink/90 whitespace-pre-wrap break-words">{post.content}</p>}
        <AttachmentList attachments={post.attachments} />

        <div className="mt-4 flex items-center gap-2.5 flex-wrap">
          <ReactionBar
            reactions={post.reactions}
            postId={post.id}
            userId={currentUserId}
            token={token}
            onChange={onReactionChange}
          />
        </div>

        <div className="mt-2.5 flex items-center gap-4 flex-wrap">
          <span className="text-[12.5px] text-subtle">{timeAgo(post.created_at)}</span>
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
  const [reply,      setReply]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [reportId,   setReportId]   = useState<string | null>(null)
  const [locking,    setLocking]    = useState(false)
  const viewTracked = useRef(false)
  const postsTopRef = useRef<HTMLDivElement>(null)
  const { attachments: replyAttachments, uploading: replyUploading, handleFiles: handleReplyFiles, removeAttachment: removeReplyAttachment, reset: resetReplyAttachments } = useForumAttachments()
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const [emojiOpen,   setEmojiOpen]   = useState(false)
  const [mentionOpen, setMentionOpen] = useState(false)

  const isAdmin = profile?.is_admin ?? false

  // Кому можно упомянуть — только участники этой темы (кто уже написал в неё
  // или её создал), без похода за отдельным списком пользователей.
  const participants = (() => {
    const byId = new Map<string, string>()
    if (thread?.author?.id && thread.author.nickname) byId.set(thread.author.id, thread.author.nickname)
    for (const p of posts) {
      if (p.author?.id && p.author.nickname) byId.set(p.author.id, p.author.nickname)
    }
    byId.delete(user?.id ?? '')
    return [...byId.entries()].map(([id, nickname]) => ({ id, nickname }))
  })()

  function insertAtCursor(text: string) {
    const el = replyRef.current
    if (!el) { setReply(r => r + text); return }
    const start = el.selectionStart ?? reply.length
    const end   = el.selectionEnd ?? reply.length
    const next  = reply.slice(0, start) + text + reply.slice(end)
    setReply(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  async function loadThread() {
    const res  = await fetch(`${API}/forum/threads/${id}`)
    const data = await res.json()
    if (res.ok) setThread(data)
  }

  async function loadPosts(p: number, scroll = false) {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/forum/threads/${id}/posts?page=${p}`)
      const data = await res.json()
      setPosts(data.posts ?? [])
      setHasMore(data.has_more ?? false)
      setPage(p)
      if (scroll) postsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {
      showToast('Не удалось загрузить сообщения', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    loadThread()
    loadPosts(1)
    const key = `forum_viewed_${id}`
    if (!viewTracked.current && !sessionStorage.getItem(key)) {
      viewTracked.current = true
      sessionStorage.setItem(key, '1')
      fetch(`${API}/forum/threads/${id}/view`, { method: 'POST' }).catch(() => {})
    }
  }, [id])

  async function sendReply(e: FormEvent) {
    e.preventDefault()
    if ((!reply.trim() && replyAttachments.length === 0) || !session) return
    setSending(true)
    try {
      const res  = await fetch(`${API}/forum/threads/${id}/posts`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ content: reply.trim(), attachments: replyAttachments }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Ошибка при отправке', 'error'); return }
      setReply('')
      resetReplyAttachments()
      // Новый ответ уходит в конец темы — открываем последнюю страницу,
      // иначе свежий ответ не будет виден без ручного перехода по страницам.
      const threadRes  = await fetch(`${API}/forum/threads/${id}`)
      const threadData = await threadRes.json()
      if (threadRes.ok) setThread(threadData)
      const total = threadData.posts_count ?? 1
      await loadPosts(Math.max(1, Math.ceil(total / POSTS_PAGE_SIZE)))
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
            <GlassCard className="rounded-[24px] px-5 py-5 sm:px-7 sm:py-6 mb-4">
              {thread.cover_url && (
                <img src={thread.cover_url} alt="" className="w-full max-h-[220px] object-cover rounded-[16px] mb-4" />
              )}
              <div className="flex items-start gap-2 flex-wrap mb-3.5">
                {thread.is_pinned && <Pin size={15} className="text-lav mt-1 shrink-0" />}
                {thread.is_locked && <Lock size={15} className="text-subtle mt-1 shrink-0" />}
                <h1 className="text-[24px] sm:text-[30px] font-bold leading-[1.18] tracking-[-.6px] text-ink min-w-0 break-words">{thread.title}</h1>
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
          <div ref={postsTopRef} />
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
                  onReactionChange={() => loadPosts(page)}
                />
              ))
          }
          {!loading && posts.length === 0 && (
            <GlassCard className="rounded-[20px] py-10 text-center mb-3.5">
              <p className="text-sm text-subtle">Нет сообщений</p>
            </GlassCard>
          )}

          {!loading && (page > 1 || hasMore) && (
            <div className="flex items-center justify-center gap-1.5 mb-4">
              <button onClick={() => loadPosts(page - 1, true)} disabled={page <= 1}
                className="w-9 h-9 grid place-items-center text-sm border border-line rounded-xl text-ink hover:bg-panel transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                ‹
              </button>
              {pageNumbers(page, thread ? Math.max(1, Math.ceil(thread.posts_count / POSTS_PAGE_SIZE)) : page + (hasMore ? 1 : 0)).map((n, i) => n === '…' ? (
                <span key={`gap-${i}`} className="px-1 text-subtle text-sm">…</span>
              ) : (
                <button key={n} onClick={() => loadPosts(n, true)}
                  className={`w-9 h-9 grid place-items-center text-sm rounded-xl transition-colors ${
                    n === page ? 'bg-lav text-canvas font-semibold' : 'border border-line text-ink hover:bg-panel'
                  }`}>
                  {n}
                </button>
              ))}
              <button onClick={() => loadPosts(page + 1, true)} disabled={!hasMore}
                className="w-9 h-9 grid place-items-center text-sm border border-line rounded-xl text-ink hover:bg-panel transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                ›
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
                  <div className="flex-1 min-w-0">
                    <textarea
                      ref={replyRef}
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Написать ответ…"
                      rows={4}
                      maxLength={10000}
                      className="w-full min-h-[96px] rounded-[14px] bg-white/[.06] border border-white/[.14] text-ink text-sm px-4 py-3.5 resize-none leading-relaxed placeholder:text-subtle2 focus:outline-none focus:border-lav/40 transition-colors"
                    />
                    <AttachmentList attachments={replyAttachments} onRemove={removeReplyAttachment} />
                    <div className="flex items-center flex-wrap gap-2.5 mt-3">
                      <div className="flex gap-2 flex-wrap text-subtle">
                        <label title="Прикрепить фото/файл" className="w-[38px] h-[38px] rounded-[11px] grid place-items-center bg-white/[.06] border border-white/[.12] cursor-pointer hover:text-ink">
                          <Paperclip size={15} />
                          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx" className="hidden" onChange={handleReplyFiles} disabled={replyUploading} />
                        </label>

                        <div className="relative">
                          <button type="button" title="Смайлики" onClick={() => { setEmojiOpen(v => !v); setMentionOpen(false) }}
                            className="w-[38px] h-[38px] rounded-[11px] grid place-items-center bg-white/[.06] border border-white/[.12] hover:text-ink">
                            <Smile size={15} />
                          </button>
                          {emojiOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                              <div className="absolute bottom-full left-0 mb-2 z-20 w-[220px] p-2.5 rounded-[14px] bg-canvas border border-white/[.14] shadow-xl grid grid-cols-6 gap-1">
                                {REPLY_EMOJIS.map(em => (
                                  <button key={em} type="button" onClick={() => { insertAtCursor(em); setEmojiOpen(false) }}
                                    className="text-lg leading-none w-8 h-8 rounded-lg hover:bg-white/[.08] grid place-items-center">
                                    {em}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {participants.length > 0 && (
                          <div className="relative">
                            <button type="button" title="Упомянуть участника" onClick={() => { setMentionOpen(v => !v); setEmojiOpen(false) }}
                              className="w-[38px] h-[38px] rounded-[11px] grid place-items-center bg-white/[.06] border border-white/[.12] hover:text-ink">
                              <AtSign size={15} />
                            </button>
                            {mentionOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setMentionOpen(false)} />
                                <div className="absolute bottom-full left-0 mb-2 z-20 w-[200px] max-h-[220px] overflow-y-auto p-1.5 rounded-[14px] bg-canvas border border-white/[.14] shadow-xl">
                                  {participants.map(p => (
                                    <button key={p.id} type="button" onClick={() => { insertAtCursor(`@${p.nickname} `); setMentionOpen(false) }}
                                      className="w-full text-left text-sm text-ink px-2.5 py-2 rounded-lg hover:bg-white/[.08] truncate">
                                      @{p.nickname}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <Button type="submit" variant="mint" className="ml-auto" disabled={(!reply.trim() && replyAttachments.length === 0) || sending || replyUploading}>
                        {sending ? 'Отправка…' : replyUploading ? 'Загрузка файлов…' : 'Отправить ответ'}
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
            <GlassCard className="rounded-[20px] p-5">
              <h3 className="text-sm font-semibold text-ink mb-3.5 flex items-center gap-2">📌 Об этой теме</h3>

              <Link to={`/users/${profileLink(thread.author)}`} className="flex items-center gap-3 py-2.5 border-b border-white/[.08] hover:opacity-80 transition-opacity">
                <Avatar name={thread.author?.nickname} src={thread.author?.avatar_url} size={40} radius={12} isVip={thread.author?.is_vip} />
                <div className="min-w-0">
                  <div className="text-[13px] text-subtle">Автор</div>
                  <div className="font-semibold text-[14px] text-ink truncate"><VipName name={thread.author?.nickname ?? 'Аноним'} isVip={thread.author?.is_vip} /></div>
                </div>
              </Link>

              <div className="flex gap-2.5 py-2.5 border-b border-white/[.08] text-[13px]">
                <span className="text-subtle">Создана</span>
                <span className="ml-auto text-ink">{new Date(thread.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              {thread.category && (
                <div className="flex gap-2.5 py-2.5 border-b border-white/[.08] text-[13px]">
                  <span className="text-subtle">Категория</span>
                  <Link to={`/forum/category/${thread.category.id}`} className="ml-auto text-ink hover:underline">{thread.category.name}</Link>
                </div>
              )}
              <div className="flex gap-2.5 py-2.5 text-[13px]">
                <span className="text-subtle">Статус</span>
                <span className={`ml-auto ${thread.is_locked ? 'text-subtle' : 'text-mint'}`}>
                  {thread.is_locked ? 'Закрыта' : 'Открыта'}
                </span>
              </div>
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

// Номера страниц с многоточием: 1 … 4 5 [6] 7 8 … 12
function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100
  const rem = abs % 10
  if (abs >= 11 && abs <= 19) return many
  if (rem === 1) return one
  if (rem >= 2 && rem <= 4) return few
  return many
}
