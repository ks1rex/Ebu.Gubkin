import { useEffect, useState } from 'react'
import { Loader2, Check, Trash2, UserX } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'
import { apiCall } from '../../lib/api'

interface FlaggedPost {
  id: string
  content: string
  created_at: string
  moderation_reason: string | null
  author: {
    id: string
    nickname: string | null
  }
}

interface ForumReport {
  id: string
  post_id: string
  reason: string
  status: string
  created_at: string
  reporter: { nickname: string | null }
  post: {
    content: string
    author: { id: string; nickname: string | null }
  }
}

type Tab = 'flagged' | 'reports'

export default function AdminForumMod() {
  const toast = useToast()

  const [tab, setTab] = useState<Tab>('flagged')
  const [flagged, setFlagged] = useState<FlaggedPost[]>([])
  const [reports, setReports] = useState<ForumReport[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<Record<string, boolean>>({})

  async function fetchFlagged() {
    setLoading(true)
    try {
      const data = await apiCall('GET', '/admin/forum/flagged')
      setFlagged(Array.isArray(data) ? data : (data.data ?? []))
    } catch {
      toast('Не удалось загрузить AI-флаги', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function fetchReports() {
    setLoading(true)
    try {
      const data = await apiCall('GET', '/admin/forum/reports')
      setReports(Array.isArray(data) ? data : (data.data ?? []))
    } catch {
      toast('Не удалось загрузить жалобы', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'flagged') fetchFlagged()
    else fetchReports()
  }, [tab])

  async function approvePost(id: string) {
    setActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('POST', `/admin/forum/posts/${id}/approve`)
      toast('Пост одобрен', 'success')
      setFlagged(f => f.filter(p => p.id !== id))
    } catch {
      toast('Ошибка', 'error')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  async function deletePost(id: string) {
    setActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('DELETE', `/admin/forum/posts/${id}`)
      toast('Пост удалён', 'success')
      setFlagged(f => f.filter(p => p.id !== id))
      setReports(r => r.filter(p => p.post_id !== id))
    } catch {
      toast('Ошибка при удалении', 'error')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  async function resolveReport(reportId: string, action: 'dismiss' | 'delete_post') {
    setActing(a => ({ ...a, [reportId]: true }))
    try {
      await apiCall('POST', `/admin/forum/reports/${reportId}/resolve`, { action })
      toast(action === 'delete_post' ? 'Пост удалён' : 'Жалоба оставлена без действий', 'success')
      setReports(r => r.filter(x => x.id !== reportId))
    } catch {
      toast('Ошибка при обработке жалобы', 'error')
    } finally {
      setActing(a => ({ ...a, [reportId]: false }))
    }
  }

  async function banUser(userId: string, key: string) {
    setActing(a => ({ ...a, [key]: true }))
    try {
      await apiCall('PATCH', `/admin/users/${userId}`, { is_banned: true })
      toast('Пользователь заблокирован', 'success')
    } catch {
      toast('Ошибка при бане', 'error')
    } finally {
      setActing(a => ({ ...a, [key]: false }))
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'flagged', label: 'AI-флаги' },
    { id: 'reports', label: 'Жалобы' },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Модерация форума</h1>

      <div className="flex gap-1 bg-panel p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-surface text-ink shadow-sm' : 'text-subtle hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
      ) : tab === 'flagged' ? (
        flagged.length === 0 ? (
          <div className="text-center py-16 text-subtle text-sm">Флагов нет</div>
        ) : (
          <div className="space-y-3">
            {flagged.map(post => (
              <div key={post.id} className="bg-surface rounded-xl border border-line p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-subtle">
                    <strong className="text-ink">{post.author.nickname ?? 'Аноним'}</strong>
                    {' · '}{timeAgo(post.created_at)}
                    {post.moderation_reason && (
                      <span className="ml-2 px-1.5 py-0.5 bg-warning/10 text-warning rounded-full text-xs">
                        {post.moderation_reason}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-ink bg-panel rounded-lg p-3">{post.content}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => approvePost(post.id)}
                    disabled={acting[post.id]}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-success text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {acting[post.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Одобрить
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    disabled={acting[post.id]}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-error text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <Trash2 size={12} />
                    Удалить
                  </button>
                  <button
                    onClick={() => banUser(post.author.id, `ban-${post.id}`)}
                    disabled={acting[`ban-${post.id}`]}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-line text-ink rounded-lg hover:bg-panel disabled:opacity-50 transition-colors"
                  >
                    {acting[`ban-${post.id}`] ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />}
                    Забанить автора
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        reports.length === 0 ? (
          <div className="text-center py-16 text-subtle text-sm">Жалоб нет</div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="bg-surface rounded-xl border border-line p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-subtle">
                    Жалоба от <strong className="text-ink">{report.reporter.nickname ?? 'Аноним'}</strong>
                    {' · '}{timeAgo(report.created_at)}
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                    }`}>
                      {report.status === 'pending' ? 'На рассмотрении' : report.status}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-ink">
                  <span className="text-subtle">Причина: </span>{report.reason}
                </div>
                <div className="bg-panel rounded-lg p-3 text-sm">
                  <div className="text-xs text-subtle mb-1">
                    Пост от <strong>{report.post.author.nickname ?? 'Аноним'}</strong>:
                  </div>
                  <p className="text-ink">{report.post.content}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveReport(report.id, 'dismiss')}
                    disabled={acting[report.id]}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-line text-ink rounded-lg hover:bg-panel disabled:opacity-50 transition-colors"
                  >
                    {acting[report.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Оставить
                  </button>
                  <button
                    onClick={() => resolveReport(report.id, 'delete_post')}
                    disabled={acting[report.id]}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-error text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {acting[report.id] ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Удалить пост
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
