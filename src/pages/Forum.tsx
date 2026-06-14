import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageCircle, BookOpen, Briefcase, Megaphone, MessagesSquare,
  PenLine, ChevronRight, User,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { timeAgo } from '../lib/timeAgo'
import CreateThreadModal from '../components/Forum/CreateThreadModal'

const API = import.meta.env.VITE_BACKEND_URL as string

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICONS: Record<string, any> = {
  MessageCircle, BookOpen, Briefcase, Megaphone, MessagesSquare,
}

interface LastThread {
  id: string
  title: string
  last_post_at: string | null
  last_post_author: { nickname: string | null; avatar_url: string | null } | null
}

interface Category {
  id: string
  name: string
  description: string | null
  icon_name: string
  threads_count: number
  last_thread: LastThread | null
}

function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100
  const rem = abs % 10
  if (abs >= 11 && abs <= 19) return many
  if (rem === 1) return one
  if (rem >= 2 && rem <= 4) return few
  return many
}

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

  useEffect(() => {
    fetch(`${API}/forum/categories`)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => showToast('Не удалось загрузить форум', 'error'))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    if (!user) { showToast('Войдите, чтобы создать обсуждение', 'error'); return }
    setShowCreate(true)
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Форум</h1>
          <p className="text-sm text-subtle mt-0.5">Общение студентов Губкинского университета</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors">
          <PenLine size={15} />
          Создать обсуждение
        </button>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
          : categories.map(cat => {
              const Icon = ICONS[cat.icon_name] ?? MessagesSquare
              return (
                <Link key={cat.id} to={`/forum/category/${cat.id}`}
                  className="block bg-surface border border-line rounded-xl p-5 hover:border-accent/40 hover:shadow-sm transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink group-hover:text-accent transition-colors">
                          {cat.name}
                        </span>
                        <span className="text-xs text-subtle bg-panel px-2 py-0.5 rounded-full">
                          {cat.threads_count} {plural(cat.threads_count, 'тема', 'темы', 'тем')}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-sm text-subtle mt-0.5 truncate">{cat.description}</p>
                      )}
                      {cat.last_thread && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
                          {cat.last_thread.last_post_author?.avatar_url ? (
                            <img src={cat.last_thread.last_post_author.avatar_url}
                              className="w-4 h-4 rounded-full object-cover" alt="" />
                          ) : (
                            <User size={12} />
                          )}
                          <span className="truncate max-w-[200px] text-ink/70">
                            {cat.last_thread.title}
                          </span>
                          {cat.last_thread.last_post_at && (
                            <span className="shrink-0">· {timeAgo(cat.last_thread.last_post_at)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-subtle group-hover:text-accent transition-colors shrink-0 mt-1" />
                  </div>
                </Link>
              )
            })
        }
      </div>

      {!loading && categories.length === 0 && (
        <div className="text-center py-16 text-subtle">Категории ещё не созданы</div>
      )}

      {showCreate && session && (
        <CreateThreadModal
          token={session.access_token}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
