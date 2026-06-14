import { useEffect, useState, useMemo } from 'react'
import { Loader2, UserX, UserCheck, ShieldCheck, ShieldOff, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { timeAgo } from '../../lib/timeAgo'

const API = import.meta.env.VITE_BACKEND_URL as string

interface AdminUser {
  id: string
  email: string
  nickname: string | null
  full_name: string | null
  avatar_url: string | null
  balance: number
  is_admin: boolean
  is_banned: boolean
  created_at: string
}

type Filter = 'all' | 'banned' | 'admins'

export default function AdminUsers() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [acting, setActing] = useState<Record<string, boolean>>({})

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : (data.data ?? []))
    } catch {
      toast('Не удалось загрузить пользователей', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function patchUser(id: string, patch: { is_banned?: boolean; is_admin?: boolean }) {
    setActing(a => ({ ...a, [id]: true }))
    try {
      const res = await fetch(`${API}/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      toast('Обновлено', 'success')
      setUsers(u => u.map(x => x.id === id ? { ...x, ...patch } : x))
    } catch {
      toast('Ошибка при обновлении', 'error')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  const filtered = useMemo(() => {
    let list = users
    if (filter === 'banned') list = list.filter(u => u.is_banned)
    if (filter === 'admins') list = list.filter(u => u.is_admin)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        (u.nickname ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    }
    return list
  }, [users, filter, search])

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'banned', label: 'Заблокированные' },
    { id: 'admins', label: 'Администраторы' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-ink">Пользователи</h1>
        <span className="text-sm text-subtle">{users.length} всего</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по никнейму или email..."
            className="w-full pl-8 pr-3 py-2 border border-line rounded-lg text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-1 bg-panel p-1 rounded-xl">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === f.id ? 'bg-surface text-ink shadow-sm' : 'text-subtle hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-subtle text-sm">Пользователей не найдено</div>
      ) : (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel border-b border-line">
              <tr>
                <th className="py-2 px-3 text-left text-subtle font-medium">Пользователь</th>
                <th className="py-2 px-3 text-left text-subtle font-medium hidden md:table-cell">Email</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Баланс</th>
                <th className="py-2 px-3 text-left text-subtle font-medium hidden lg:table-cell">Регистрация</th>
                <th className="py-2 px-3 text-center text-subtle font-medium">Роль</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.nickname ?? ''}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-accent">
                            {(user.nickname ?? user.email)?.[0]?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                      )}
                      <span className="text-ink font-medium truncate max-w-[120px]">
                        {user.nickname ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-subtle hidden md:table-cell truncate max-w-[180px]">
                    {user.email}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {(user.balance ?? 0).toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="py-2 px-3 text-subtle hidden lg:table-cell">
                    {timeAgo(user.created_at)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {user.is_admin && (
                        <span className="px-1.5 py-0.5 bg-accent-subtle text-accent text-xs rounded-full font-medium">
                          ADMIN
                        </span>
                      )}
                      {user.is_banned && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          БАН
                        </span>
                      )}
                      {!user.is_admin && !user.is_banned && (
                        <span className="text-xs text-subtle">Пользователь</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => patchUser(user.id, { is_banned: !user.is_banned })}
                        disabled={acting[user.id]}
                        title={user.is_banned ? 'Разбанить' : 'Заблокировать'}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          user.is_banned
                            ? 'text-success hover:bg-green-50'
                            : 'text-error hover:bg-red-50'
                        }`}
                      >
                        {acting[user.id] ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : user.is_banned ? (
                          <UserCheck size={14} />
                        ) : (
                          <UserX size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => patchUser(user.id, { is_admin: !user.is_admin })}
                        disabled={acting[user.id]}
                        title={user.is_admin ? 'Снять права админа' : 'Сделать админом'}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          user.is_admin
                            ? 'text-accent hover:bg-accent-subtle'
                            : 'text-subtle hover:bg-panel'
                        }`}
                      >
                        {user.is_admin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
