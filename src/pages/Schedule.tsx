import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, User, MapPin, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiCall } from '../lib/api'
import { GlassCard, Chip } from '../components/glass'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Faculty { id: number; name: string }
interface Group { id: number; code: string }
interface Teacher { firstName?: string; lastName?: string; patronymic?: string }
interface Room { number?: string }
interface Lesson {
  type: string
  weekDayNumber: number
  timeChunks: number[]
  isCanceled?: boolean
  isMoved?: boolean
  course: { id: number; name: string }
  teachers?: Teacher[]
  rooms?: Room[]
  subgroup?: number
}
interface WeekInfo { type: 'lower' | 'upper'; number: number; days: { date: string; isStudyDay: boolean; weekDayNumber: number }[] }
interface LessonsResponse { week: WeekInfo; timeChunks: string[]; lessons: Lesson[] }
interface SavedGroup { groupId: number; facultyId: number; groupCode?: string; facultyName?: string; studyId?: number }

const STUDY_ID = 62
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const STORAGE_KEY = 'schedule_group'

// Render-хостинг бэкенда геоблокирован lk.gubkin.ru — эти запросы идут
// напрямую из браузера пользователя (обычно в РФ), а не через наш backend.
const GUBKIN_API = 'https://lk.gubkin.ru/schedule/api/api.php'

async function gubkinFetch(params: Record<string, string | number>): Promise<any> {
  const url = `${GUBKIN_API}?${new URLSearchParams(params as Record<string, string>)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`lk.gubkin.ru ${res.status}`)
  const body = await res.json()
  return body.rows
}

// ─── Date helpers ───────────────────────────────────────────────────────────

function mondayOf(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  const diff = day === 0 ? -6 : 1 - day
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function toApiDate(d: Date): string {
  return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`
}
function toShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}
function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}
function parseMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function slotRange(timeChunks: string[], idxs: number[]): [string, string] {
  const start = timeChunks[idxs[0]]?.split('-')[0] ?? '?'
  const end = timeChunks[idxs[idxs.length - 1]]?.split('-')[1] ?? '?'
  return [start, end]
}
function teacherName(t: Teacher): string {
  const initials = [t.firstName?.[0], t.patronymic?.[0]].filter(Boolean).map(c => `${c}.`).join('')
  return [t.lastName, initials].filter(Boolean).join(' ')
}

// ─── Type badge ─────────────────────────────────────────────────────────────

function typeBadgeClass(type: string): string {
  if (type.includes('Лекция')) return 'bg-blue-500/20 text-blue-400'
  if (type.includes('Практика')) return 'bg-green-500/20 text-green-400'
  if (type.includes('Лаборатор')) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-white/[.1] text-subtle'
}

// ─── Lesson card ────────────────────────────────────────────────────────────

function LessonCard({ lesson, timeChunks, dayDate }: { lesson: Lesson; timeChunks: string[]; dayDate: Date }) {
  const [start, end] = slotRange(timeChunks, lesson.timeChunks)
  const teachers = (lesson.teachers ?? []).map(teacherName).filter(Boolean).join(', ')
  const room = (lesson.rooms ?? []).map(r => r.number).filter(Boolean).join(', ')

  const today = isSameDay(dayDate, new Date())
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const startMin = parseMinutes(start)
  const endMin = parseMinutes(end)
  const isCurrent = today && nowMin >= startMin && nowMin < endMin
  const isUpcoming = today && nowMin < startMin

  let borderClass = 'border-line'
  if (lesson.isCanceled) borderClass = 'border-error'
  else if (lesson.isMoved) borderClass = 'border-gold'
  else if (isCurrent) borderClass = 'border-mint'

  return (
    <GlassCard className={`relative rounded-[16px] px-3.5 py-3 border ${borderClass} ${lesson.isCanceled ? 'opacity-50' : ''}`}>
      <div className="text-xs font-semibold text-lav mb-1">{start} – {end}</div>
      <div className="text-sm font-bold text-ink leading-snug mb-1.5">{lesson.course?.name}</div>
      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${typeBadgeClass(lesson.type)}`}>{lesson.type}</span>
        {!!lesson.subgroup && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[.1] text-subtle">П/г {lesson.subgroup}</span>
        )}
        {lesson.isCanceled && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-error/20 text-error">Отменена</span>}
        {lesson.isMoved && !lesson.isCanceled && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold/20 text-gold">Перенесена</span>}
      </div>
      {teachers && (
        <div className="flex items-center gap-1.5 text-xs text-subtle mb-0.5"><User size={12} /> {teachers}</div>
      )}
      {room && (
        <div className="flex items-center gap-1.5 text-xs text-subtle"><MapPin size={12} /> Ауд. {room}</div>
      )}
      {isCurrent && <div className="mt-1.5 text-[11px] font-semibold text-mint">Идёт сейчас</div>}
      {isUpcoming && startMin - nowMin <= 60 && (
        <div className="mt-1.5 text-[11px] font-semibold text-lav">Осталось {startMin - nowMin} мин</div>
      )}
    </GlassCard>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ScheduleSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-28 rounded-[16px] bg-white/[.06]" />
      ))}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Schedule() {
  const { user } = useAuth()

  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [facultyId, setFacultyId] = useState<number | ''>('')
  const [groupId, setGroupId] = useState<number | ''>('')
  const [restored, setRestored] = useState(false)

  const [monday, setMonday] = useState(() => mondayOf(new Date()))
  const [data, setData] = useState<LessonsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState(0)

  // load faculties once
  useEffect(() => {
    gubkinFetch({ act: 'list', method: 'getFaculties' })
      .then(rows => setFaculties(Array.isArray(rows) ? rows : []))
      .catch(() => setFaculties([]))
  }, [])

  // restore saved selection
  useEffect(() => {
    async function restore() {
      let saved: SavedGroup | null = null
      if (user) {
        try {
          const r = await apiCall('GET', '/schedule/saved-group')
          if (r?.groupId && r?.facultyId) saved = r
        } catch { /* ignore */ }
      }
      if (!saved) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) saved = JSON.parse(raw)
        } catch { /* ignore */ }
      }
      if (saved?.facultyId) setFacultyId(saved.facultyId)
      if (saved?.groupId) setGroupId(saved.groupId)
      setRestored(true)
    }
    restore()
  }, [user])

  // load groups when faculty changes
  useEffect(() => {
    if (!facultyId) { setGroups([]); return }
    gubkinFetch({ act: 'list', method: 'getFacultyGroups', facultyId })
      .then(rows => setGroups(Array.isArray(rows) ? [...rows].sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '')) : []))
      .catch(() => setGroups([]))
  }, [facultyId])

  // persist selection
  useEffect(() => {
    if (!restored || !facultyId || !groupId) return
    const faculty = faculties.find(f => f.id === facultyId)
    const group = groups.find(g => g.id === groupId)
    const payload: SavedGroup = { groupId: groupId as number, facultyId: facultyId as number, groupCode: group?.code, facultyName: faculty?.name, studyId: STUDY_ID }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    if (user) apiCall('POST', '/schedule/save-group', { groupId, facultyId, studyId: STUDY_ID }).catch(() => {})
  }, [restored, groupId, facultyId, faculties, groups, user])

  // load lessons for the visible week
  const loadLessons = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    setError(null)
    try {
      const date = toApiDate(monday)
      const rows = await gubkinFetch({ act: 'schedule', date, groupId, studyId: STUDY_ID })
      const moscow = rows.organizations?.[0]
      setData({
        week: rows.week?.weekRussia,
        timeChunks: moscow?.lessonsTimeChunks ?? [],
        lessons: moscow?.lessons ?? [],
      })
    } catch {
      setError('Не удалось загрузить расписание. Сервер университета временно недоступен.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [groupId, monday])

  useEffect(() => { loadLessons() }, [loadLessons])

  const weekDates = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(monday, i)), [monday])

  // pick today's tab by default when viewing the current week
  useEffect(() => {
    const idx = weekDates.findIndex(d => isSameDay(d, new Date()))
    setActiveDay(idx >= 0 ? idx : 0)
  }, [monday]) // eslint-disable-line react-hooks/exhaustive-deps

  const timeChunks = data?.timeChunks ?? []
  const lessons = data?.lessons ?? []

  const rowStarts = useMemo(() => {
    const s = new Set<number>()
    lessons.forEach(l => s.add(l.timeChunks[0]))
    return Array.from(s).sort((a, b) => a - b)
  }, [lessons])

  function lessonsFor(day: number, rowStart?: number): Lesson[] {
    return lessons
      .filter(l => l.weekDayNumber === day && (rowStart === undefined || l.timeChunks[0] === rowStart))
      .sort((a, b) => a.timeChunks[0] - b.timeChunks[0])
  }

  const weekTypeLabel = data?.week?.type === 'lower' ? 'Нижняя неделя' : data?.week?.type === 'upper' ? 'Верхняя неделя' : ''

  function goWeek(delta: number) { setMonday(m => addDays(m, delta * 7)) }
  function goToday() { setMonday(mondayOf(new Date())) }

  const hasGroup = !!groupId

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-4 flex items-center gap-2.5">
        <CalendarDays size={22} className="text-lav" /> Расписание
      </h1>

      {/* Faculty / group pickers */}
      <GlassCard className="rounded-[18px] px-4 py-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={facultyId}
          onChange={e => { setFacultyId(e.target.value ? Number(e.target.value) : ''); setGroupId('') }}
          className="w-full px-3 py-2.5 text-sm border border-line rounded-lg bg-canvas text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
        >
          <option value="">Выберите факультет</option>
          {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select
          value={groupId}
          onChange={e => setGroupId(e.target.value ? Number(e.target.value) : '')}
          disabled={!facultyId}
          className="w-full px-3 py-2.5 text-sm border border-line rounded-lg bg-canvas text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors disabled:opacity-50"
        >
          <option value="">Выберите группу</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.code}</option>)}
        </select>
      </GlassCard>

      {!hasGroup && (
        <GlassCard className="rounded-[22px] px-8 py-16 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-lav/20 flex items-center justify-center">
            <CalendarDays size={34} className="text-lav" />
          </div>
          <div className="text-lg font-bold text-ink">Выберите группу</div>
          <p className="text-sm text-subtle max-w-[320px]">Укажите факультет и группу, чтобы увидеть расписание</p>
        </GlassCard>
      )}

      {hasGroup && (
        <>
          {/* Week nav */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button onClick={() => goWeek(-1)} className="w-9 h-9 rounded-full flex items-center justify-center text-subtle hover:text-ink hover:bg-white/[.08] transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <div className="text-sm font-semibold text-ink">{toShort(weekDates[0])} — {toShort(weekDates[5])}</div>
              {weekTypeLabel && <div className="text-xs text-lav">{weekTypeLabel}</div>}
            </div>
            <button onClick={() => goWeek(1)} className="w-9 h-9 rounded-full flex items-center justify-center text-subtle hover:text-ink hover:bg-white/[.08] transition-colors">
              <ChevronRight size={18} />
            </button>
            <Chip onClick={goToday}>Сегодня</Chip>
          </div>

          {loading && <ScheduleSkeleton />}

          {!loading && error && (
            <GlassCard className="rounded-[18px] px-6 py-10 flex flex-col items-center gap-2 text-center">
              <AlertCircle size={26} className="text-error" />
              <p className="text-sm text-subtle">{error}</p>
            </GlassCard>
          )}

          {!loading && !error && data && lessons.length === 0 && (
            <GlassCard className="rounded-[18px] px-6 py-10 text-center text-sm text-subtle">
              На этой неделе занятий нет 🎓
            </GlassCard>
          )}

          {!loading && !error && data && lessons.length > 0 && (
            <>
              {/* Desktop grid */}
              <div className="hidden lg:block overflow-x-auto">
                <div className="grid" style={{ gridTemplateColumns: `90px repeat(6, minmax(160px, 1fr))` }}>
                  <div />
                  {weekDates.map((d, i) => {
                    const studyDay = data.week?.days?.find(wd => wd.weekDayNumber === i)?.isStudyDay ?? true
                    return (
                      <div key={i} className={`text-center pb-2 font-semibold text-sm ${studyDay ? 'text-ink' : 'text-subtle2'}`}>
                        {DAY_LABELS[i]}
                        <div className="text-xs font-normal text-subtle">{toShort(d)}</div>
                      </div>
                    )
                  })}
                  {rowStarts.map(rowStart => (
                    <div key={rowStart} className="contents">
                      <div className="text-xs text-subtle pt-2 pr-2 text-right">{timeChunks[rowStart]?.split('-')[0]}</div>
                      {DAY_LABELS.map((_, day) => (
                        <div key={day} className="p-1.5 flex flex-col gap-1.5">
                          {lessonsFor(day, rowStart).map((l, i) => (
                            <LessonCard key={i} lesson={l} timeChunks={timeChunks} dayDate={weekDates[day]} />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile day tabs */}
              <div className="lg:hidden">
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
                  {weekDates.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveDay(i)}
                      className={`shrink-0 px-3.5 py-2 rounded-[13px] text-sm font-medium transition-colors ${
                        activeDay === i
                          ? 'text-[#1a1140] font-semibold bg-gradient-to-br from-lav to-[#ddd6fe]'
                          : 'text-lav bg-white/[.07] border border-white/[.12]'
                      } ${isSameDay(d, new Date()) ? 'ring-1 ring-mint' : ''}`}
                    >
                      {DAY_LABELS[i]} {d.getDate()}
                    </button>
                  ))}
                </div>
                {lessonsFor(activeDay).length === 0 ? (
                  <GlassCard className="rounded-[18px] px-6 py-10 text-center text-sm text-subtle">Пар нет</GlassCard>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {lessonsFor(activeDay).map((l, i) => (
                      <LessonCard key={i} lesson={l} timeChunks={timeChunks} dayDate={weekDates[activeDay]} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
