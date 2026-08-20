import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, UserX, UserCheck, ShieldCheck, ShieldOff, Crown, Search, ChevronLeft, ChevronRight, Star, Download, Printer, ExternalLink } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { timeAgo } from '../../lib/timeAgo'
import { apiCall } from '../../lib/api'
import { formatRatingValue } from '../../lib/format'
import { stampedName, fetchAllPages } from '../../lib/reportData'
import { downloadXlsx } from '../../lib/exportXlsx'
import { printReport } from '../../lib/printReport'
import { VipBadge } from '../../components/VipBadge'

interface AdminUser {
  id: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
  balance: number
  rating_as_customer: number | null
  rating_as_executor: number | null
  reviews_count_customer: number | null
  reviews_count_executor: number | null
  level: number | null
  reputation: number | null
  is_admin: boolean
  // Отсутствует в ответе бэкенда для не-владельцев (не false — поля нет
  // вовсе), чтобы рядовой админ не мог отличить владельца от админа.
  is_owner?: boolean
  is_banned: boolean
  is_vip: boolean
  vip_expires_at: string | null
  created_at: string
}

type Filter = 'all' | 'banned' | 'admins' | 'vip'

const LIMIT = 50

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'banned', label: 'Заблокированные' },
  { id: 'admins', label: 'Администраторы' },
  { id: 'vip', label: 'VIP' },
]

// В админке рейтинг показывается всегда, когда он есть в колонке, даже без
// отзывов: значение может быть выставлено руками в базе, и администратору важно
// видеть фактические данные. Число отзывов рисуется рядом, так что «5.00 (0)»
// читается как «оценка есть, отзывов нет».
function fmtRating(v: number | null, count: number | null) {
  const value = formatRatingValue(v)
  return value ? { value, count: count ?? 0 } : null
}

// Рейтинг заказчика / исполнителя — данные всегда приходили с бэкенда,
// но в таблице не выводились.
function Rating({ label, v, count }: { label: string; v: number | null; count: number | null }) {
  const r = fmtRating(v, count)
  if (!r) return <span className="text-xs text-subtle">{label}: —</span>
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-ink whitespace-nowrap">
      <span className="text-subtle">{label}:</span>
      <Star size={10} className="text-gold" fill="currentColor" />
      {r.value}
      <span className="text-subtle">({r.count})</span>
    </span>
  )
}

function vipTitle(u: AdminUser) {
  return u.vip_expires_at ? `VIP до ${new Date(u.vip_expires_at).toLocaleString('ru-RU')}` : undefined
}

export default function AdminUsers() {
  const toast = useToast()
  const { profile: viewerProfile } = useAuth()
  const effectiveIsOwner = !!viewerProfile?.is_owner

  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [acting, setActing] = useState<Record<string, boolean>>({})

  function params(p: number, limit: number, f = filter) {
    const q = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (f !== 'all') q.set('filter', f)
    if (search.trim()) q.set('search', search.trim())
    return q
  }

  // Фильтр/поиск/страницы теперь считает бэкенд — раньше страница грузила
  // всех пользователей целиком и фильтровала в браузере.
  async function fetchUsers(p = 1, f = filter) {
    setLoading(true)
    try {
      const data = await apiCall('GET', `/admin/users?${params(p, LIMIT, f)}`)
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch {
      toast('Не удалось загрузить пользователей', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers(1) }, [])

  function applyFilter(f: Filter) {
    setFilter(f)
    fetchUsers(1, f)
  }

  async function patchUser(id: string, patch: { is_banned?: boolean; is_admin?: boolean; is_owner?: boolean }) {
    setActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('PATCH', `/admin/users/${id}`, patch)
      toast('Обновлено', 'success')
      setUsers(u => u.map(x => x.id === id ? { ...x, ...patch } : x))
    } catch (e: any) {
      toast(e?.data?.error ?? 'Ошибка при обновлении', 'error')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  const EXPORT_HEADERS = ['Никнейм', 'Email', 'Баланс', 'Уровень', 'Репутация', 'Рейтинг заказчика', 'Отзывов', 'Рейтинг исполнителя', 'Отзывов', 'VIP до', 'Роль', 'Регистрация']

  function exportRow(u: AdminUser) {
    return [
      u.nickname ?? '', u.email ?? '', u.balance ?? 0, u.level ?? '', u.reputation ?? '',
      // Тот же формат, что в таблице админки, — файл и экран должны совпадать.
      formatRatingValue(u.rating_as_customer) ?? '',
      u.reviews_count_customer ?? 0,
      formatRatingValue(u.rating_as_executor) ?? '',
      u.reviews_count_executor ?? 0,
      u.vip_expires_at ? new Date(u.vip_expires_at).toLocaleString('ru-RU') : '',
      u.is_admin ? 'админ' : u.is_banned ? 'бан' : 'пользователь',
      new Date(u.created_at).toLocaleString('ru-RU'),
    ]
  }

  // Выгружаем весь отфильтрованный список постранично: и серверный предел
  // (500 на страницу), и молчаливая обрезка PostgREST на 1000 строк обходятся
  // только циклом по страницам.
  async function fetchExportRows() {
    return fetchAllPages<AdminUser>(async (p, limit) => {
      const data = await apiCall('GET', `/admin/users?${params(p, limit)}`)
      return { rows: data.users ?? [], total: data.total ?? 0 }
    })
  }

  function reportMeta(): [string, string][] {
    return [
      ['Фильтр', FILTERS.find(f => f.id === filter)?.label ?? 'Все'],
      ['Поиск', search.trim() || 'без поиска'],
    ]
  }

  async function exportAll() {
    setExporting(true)
    try {
      const { rows, total: found, truncated } = await fetchExportRows()
      downloadXlsx(stampedName('пользователи'), EXPORT_HEADERS, rows.map(exportRow))
      if (truncated) toast(`Выгружено ${rows.length} из ${found} — сузьте фильтр`, 'error')
    } catch {
      toast('Не удалось выгрузить отчёт', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function printAll() {
    setExporting(true)
    try {
      const { rows, total: found, truncated } = await fetchExportRows()
      const sumBalance = rows.reduce((s, u) => s + (Number(u.balance) || 0), 0)
      printReport({
        title: 'Пользователи платформы',
        meta: reportMeta(),
        headers: EXPORT_HEADERS,
        rows: rows.map(exportRow),
        numeric: [2, 3, 4, 5, 6, 7, 8],
        landscape: true,
        totals: [
          ['Всего пользователей', String(rows.length)],
          ['Суммарный баланс, ₽', sumBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
          ['С активным VIP', String(rows.filter(u => u.is_vip).length)],
          ['Заблокированных', String(rows.filter(u => u.is_banned).length)],
        ],
      })
      if (truncated) toast(`В отчёт попало ${rows.length} из ${found} — сузьте фильтр`, 'error')
    } catch {
      toast('Не удалось сформировать отчёт', 'error')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-ink">Пользователи</h1>
        <div className="flex items-center gap-3 no-print">
          <span className="text-sm text-subtle">{total} всего</span>
          <button onClick={exportAll} disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-line rounded-lg hover:bg-panel text-ink transition-colors disabled:opacity-50">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Excel
          </button>
          <button onClick={printAll} disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-line rounded-lg hover:bg-panel text-ink transition-colors disabled:opacity-50">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            PDF / печать
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchUsers(1)}
            placeholder="Поиск по никнейму или email..."
            className="w-full pl-8 pr-3 py-2 border border-line rounded-lg text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          />
        </div>
        <button onClick={() => fetchUsers(1)}
          className="px-3 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors shrink-0">
          Найти
        </button>
        <div className="flex gap-1 bg-panel p-1 rounded-xl">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => applyFilter(f.id)}
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
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-subtle text-sm">Пользователей не найдено</div>
      ) : (
        <>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {users.map(user => (
            <div key={user.id} className="bg-surface border border-line rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.nickname ?? ''} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-accent">
                      {(user.nickname ?? user.email ?? '?')[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate flex items-center gap-1.5">
                    {user.nickname ?? '—'}
                    {user.is_vip && <span title={vipTitle(user)}><VipBadge /></span>}
                  </p>
                  <p className="text-xs text-subtle truncate">{user.email ?? '—'}</p>
                </div>
                <span className="ml-auto font-bold text-ink shrink-0">
                  {(user.balance ?? 0).toLocaleString('ru-RU')} ₽
                </span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                <Rating label="Заказчик" v={user.rating_as_customer} count={user.reviews_count_customer} />
                <Rating label="Исполнитель" v={user.rating_as_executor} count={user.reviews_count_executor} />
                <span className="text-xs text-subtle">Ур. {user.level ?? 1}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <p className="text-subtle text-xs">Роль</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {effectiveIsOwner && user.is_owner && (
                      <span className="px-1.5 py-0.5 bg-warning/10 text-warning text-xs rounded-full font-medium">ВЛАДЕЛЕЦ</span>
                    )}
                    {user.is_admin && !(effectiveIsOwner && user.is_owner) && (
                      <span className="px-1.5 py-0.5 bg-accent-subtle text-accent text-xs rounded-full font-medium">АДМИН</span>
                    )}
                    {user.is_banned && (
                      <span className="px-1.5 py-0.5 bg-error/10 text-error text-xs rounded-full font-medium">БАН</span>
                    )}
                    {!user.is_admin && !user.is_banned && (
                      <span className="text-xs text-subtle">Пользователь</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-subtle text-xs">Регистрация</p>
                  <p className="text-ink text-xs mt-0.5">{timeAgo(user.created_at)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/users/${user.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs rounded-lg bg-panel text-subtle hover:text-accent transition-colors shrink-0"
                >
                  <ExternalLink size={12} />
                  Профиль
                </Link>
                {(effectiveIsOwner || !user.is_admin) && (
                  <button
                    onClick={() => patchUser(user.id, { is_banned: !user.is_banned })}
                    disabled={acting[user.id]}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs rounded-lg transition-colors disabled:opacity-50 ${
                      user.is_banned ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}
                  >
                    {acting[user.id] ? <Loader2 size={12} className="animate-spin" /> : user.is_banned ? <UserCheck size={12} /> : <UserX size={12} />}
                    {user.is_banned ? 'Разбанить' : 'Заблокировать'}
                  </button>
                )}
                {effectiveIsOwner && (
                  <button
                    onClick={() => patchUser(user.id, { is_admin: !user.is_admin })}
                    disabled={acting[user.id]}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs rounded-lg transition-colors disabled:opacity-50 ${
                      user.is_admin ? 'bg-accent-subtle text-accent' : 'bg-panel text-subtle'
                    }`}
                  >
                    {user.is_admin ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                    {user.is_admin ? 'Снять админа' : 'Сделать админом'}
                  </button>
                )}
                {effectiveIsOwner && user.is_admin && (
                  <button
                    onClick={() => patchUser(user.id, { is_owner: !user.is_owner })}
                    disabled={acting[user.id]}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs rounded-lg transition-colors disabled:opacity-50 ${
                      user.is_owner ? 'bg-warning/10 text-warning' : 'bg-panel text-subtle'
                    }`}
                  >
                    <Crown size={12} />
                    {user.is_owner ? 'Снять владельца' : 'Сделать владельцем'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-surface rounded-xl border border-line overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-panel border-b border-line">
              <tr>
                <th className="py-2 px-3 text-left text-subtle font-medium">Пользователь</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Email</th>
                <th className="py-2 px-3 text-left text-subtle font-medium">Рейтинги</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Баланс</th>
                <th className="py-2 px-3 text-left text-subtle font-medium hidden lg:table-cell">Регистрация</th>
                <th className="py-2 px-3 text-center text-subtle font-medium">Роль</th>
                <th className="py-2 px-3 text-right text-subtle font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
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
                            {(user.nickname ?? user.email ?? '?')[0]?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                      )}
                      <span className="text-ink font-medium truncate max-w-[140px] flex items-center gap-1.5">
                        {user.nickname ?? '—'}
                        {user.is_vip && <span title={vipTitle(user)}><VipBadge /></span>}
                      </span>
                    </div>
                    <span className="text-[11px] text-subtle">Ур. {user.level ?? 1} · {user.reputation ?? 0} rep</span>
                  </td>
                  <td className="py-2 px-3 text-subtle truncate max-w-[180px]">
                    {user.email ?? '—'}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-col gap-0.5">
                      <Rating label="З" v={user.rating_as_customer} count={user.reviews_count_customer} />
                      <Rating label="И" v={user.rating_as_executor} count={user.reviews_count_executor} />
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {(user.balance ?? 0).toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="py-2 px-3 text-subtle hidden lg:table-cell">
                    {timeAgo(user.created_at)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {effectiveIsOwner && user.is_owner && (
                        <span className="px-1.5 py-0.5 bg-warning/10 text-warning text-xs rounded-full font-medium">
                          ВЛАДЕЛЕЦ
                        </span>
                      )}
                      {user.is_admin && !(effectiveIsOwner && user.is_owner) && (
                        <span className="px-1.5 py-0.5 bg-accent-subtle text-accent text-xs rounded-full font-medium">
                          АДМИН
                        </span>
                      )}
                      {user.is_banned && (
                        <span className="px-1.5 py-0.5 bg-error/10 text-error text-xs rounded-full font-medium">
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
                      {/* Публичный профиль пользователя — в новой вкладке, чтобы
                          не терять страницу списка с фильтрами. */}
                      <Link
                        to={`/users/${user.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Открыть профиль"
                        className="p-1.5 rounded-lg text-subtle hover:text-accent hover:bg-panel transition-colors"
                      >
                        <ExternalLink size={14} />
                      </Link>
                      {(effectiveIsOwner || !user.is_admin) && (
                        <button
                          onClick={() => patchUser(user.id, { is_banned: !user.is_banned })}
                          disabled={acting[user.id]}
                          title={user.is_banned ? 'Разбанить' : 'Заблокировать'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            user.is_banned
                              ? 'text-success hover:bg-success/10'
                              : 'text-error hover:bg-error/10'
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
                      )}
                      {effectiveIsOwner && (
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
                      )}
                      {effectiveIsOwner && user.is_admin && (
                        <button
                          onClick={() => patchUser(user.id, { is_owner: !user.is_owner })}
                          disabled={acting[user.id]}
                          title={user.is_owner ? 'Снять права владельца' : 'Сделать владельцем'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            user.is_owner
                              ? 'text-warning hover:bg-warning/10'
                              : 'text-subtle hover:bg-panel'
                          }`}
                        >
                          <Crown size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-subtle">Страница {page} из {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => fetchUsers(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg border border-line hover:bg-panel disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} className="text-ink" />
              </button>
              <button onClick={() => fetchUsers(page + 1)} disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-line hover:bg-panel disabled:opacity-40 transition-colors">
                <ChevronRight size={16} className="text-ink" />
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}
