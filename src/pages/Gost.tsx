import { useState, useEffect, useRef, ChangeEvent, FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Coins, Key, Upload, CheckCircle2, Loader2, AlertCircle,
  FileText, Download, RotateCcw, ChevronDown, MessageSquare, Infinity,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import BuyTokensModal from '../components/Gost/BuyTokensModal'

const API  = import.meta.env.VITE_BACKEND_URL as string
const GOST = import.meta.env.VITE_GOST_URL    as string

type Mode    = 'universal' | 'fixed_template' | 'custom_template'
type SubMode = 'format_only' | 'minimal_edit' | 'chat'

type Phase =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'computing'
  | 'generating'
  | 'done'
  | 'error'

interface ProjectResult { docxUrl: string; pdfUrl?: string }
interface TemplateInfo  { id: string; title: string; discipline: string }

interface RecentProject {
  id: string
  title: string
  status: string
  generation_mode: string
  created_at: string
  output_docx_path: string | null
  output_pdf_path:  string | null
}

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'uploading',   label: 'Загрузка файлов' },
  { phase: 'extracting',  label: 'Извлечение структуры' },
  { phase: 'computing',   label: 'Расчёт' },
  { phase: 'generating',  label: 'Генерация документа' },
]

function stepIndex(p: Phase) { return STEPS.findIndex(s => s.phase === p) }

// ── Token panel ───────────────────────────────────────────────────────────────

function TokenPanel({
  tokenBalance, walletBalance, tokenPrice, unlimited, loading, token,
  onCodeActivated, onTokensBought,
}: {
  tokenBalance: number; walletBalance: number; tokenPrice: number
  unlimited: boolean; loading: boolean; token: string | null
  onCodeActivated: (b: number) => void
  onTokensBought:  (tb: number, wb: number) => void
}) {
  const showToast        = useToast()
  const [code,       setCode]       = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [showBuy,    setShowBuy]    = useState(false)
  const [showCode,   setShowCode]   = useState(false)

  async function activateCode(e: FormEvent) {
    e.preventDefault()
    if (!code.trim() || !token) return
    setCodeLoading(true)
    try {
      const res  = await fetch(`${API}/gost/activate-key`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Неверный код', 'error'); return }
      showToast('Код активирован!', 'success')
      onCodeActivated(data.token_balance ?? tokenBalance)
      setCode('')
      setShowCode(false)
    } catch {
      showToast('Не удалось активировать код', 'error')
    } finally {
      setCodeLoading(false)
    }
  }

  return (
    <div
      className="border border-line border-l-4 border-l-purple-500 rounded-2xl p-5"
      style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(255,255,255,0.03) 100%)' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            {unlimited ? <Infinity size={20} className="text-purple-400" /> : <Coins size={20} className="text-purple-400" />}
          </div>
          <div>
            {loading ? (
              <div className="h-5 w-24 bg-panel rounded animate-pulse" />
            ) : unlimited ? (
              <span className="text-lg font-bold text-accent">Безлимит</span>
            ) : (
              <span className="text-lg font-bold text-ink">{tokenBalance} токенов</span>
            )}
            <p className="text-xs text-subtle mt-0.5">ГОСТ-баланс · {tokenPrice} ₽/токен</p>
          </div>
        </div>

        {token && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowCode(v => !v); setShowBuy(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-line rounded-lg text-ink hover:bg-panel transition-colors">
              <Key size={14} />
              Активировать код
              <ChevronDown size={12} className={`transition-transform ${showCode ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={() => { setShowBuy(true); setShowCode(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
              <Coins size={14} />
              Купить токены
            </button>
          </div>
        )}
      </div>

      {showCode && (
        <form onSubmit={activateCode} className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Введите код активации…"
            className="flex-1 px-3 py-2 text-sm border border-line rounded-lg bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
          <button type="submit" disabled={!code.trim() || codeLoading}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
            {codeLoading ? <Loader2 size={14} className="animate-spin" /> : 'Применить'}
          </button>
        </form>
      )}

      {showBuy && token && (
        <BuyTokensModal
          walletBalance={walletBalance}
          tokenPrice={tokenPrice}
          token={token}
          onClose={() => setShowBuy(false)}
          onSuccess={(tb, wb) => { onTokensBought(tb, wb); setShowBuy(false) }}
        />
      )}
    </div>
  )
}

// ── Upload form ───────────────────────────────────────────────────────────────

function FileDropZone({ label, accept, file, onChange, optional }: {
  label: string; accept: string; file: File | null
  onChange: (f: File | null) => void; optional?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {optional && <span className="ml-1 text-xs text-subtle font-normal">(необязательно)</span>}
      </label>
      <div
        onClick={() => ref.current?.click()}
        className="border-2 border-dashed border-line rounded-xl px-4 py-5 text-center cursor-pointer hover:border-accent/50 hover:bg-accent-subtle/30 transition-colors group"
      >
        <Upload size={20} className="mx-auto text-subtle group-hover:text-accent transition-colors mb-1.5" />
        {file ? (
          <p className="text-sm text-ink truncate">{file.name}</p>
        ) : (
          <p className="text-sm text-subtle">Нажмите, чтобы выбрать файл</p>
        )}
        <p className="text-xs text-subtle mt-0.5">{accept.replace(/application\//g, '').toUpperCase()}</p>
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.files?.[0] ?? null)} />
      </div>
      {file && (
        <button onClick={() => onChange(null)} className="text-xs text-error mt-1 hover:underline">
          Убрать файл
        </button>
      )}
    </div>
  )
}

function UploadForm({ token, onStart }: {
  token: string
  onStart: (phase: Phase, projectId?: string, result?: ProjectResult, mode?: string) => void
}) {
  const showToast = useToast()
  const navigate  = useNavigate()
  const [mode,        setMode]        = useState<Mode>('universal')
  const [subMode,     setSubMode]     = useState<SubMode>('format_only')
  const [templates,   setTemplates]   = useState<TemplateInfo[]>([])
  const [templateId,  setTemplateId]  = useState('')
  const [taskFile,    setTaskFile]    = useState<File | null>(null)
  const [tplFile,     setTplFile]     = useState<File | null>(null)
  const [methFile,    setMethFile]    = useState<File | null>(null)
  const [varFile,     setVarFile]     = useState<File | null>(null)
  const [meta,        setMeta]        = useState({ university: '', student_name: '', group: '', supervisor: '', city_year: '' })

  useEffect(() => {
    if (mode !== 'fixed_template' || !GOST) return
    fetch(`${GOST}/templates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTemplates(data) })
      .catch(() => {})
  }, [mode, token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (mode === 'universal' && !taskFile) { showToast('Загрузите файл задания (PDF)', 'error'); return }
    if (mode === 'fixed_template' && (!taskFile || !templateId)) { showToast('Загрузите PDF задания и выберите шаблон', 'error'); return }
    if (mode === 'custom_template') {
      if (subMode !== 'chat' && !tplFile) { showToast('Загрузите файл шаблона (.docx)', 'error'); return }
      if (subMode === 'minimal_edit' && !taskFile) { showToast('Для этого режима нужен файл задания', 'error'); return }
    }
    if (!GOST) { showToast('ГОСТ-сервис не настроен (VITE_GOST_URL)', 'error'); return }

    onStart('uploading')

    // Build FormData
    const form = new FormData()
    form.append('generation_mode', mode)
    if (taskFile) form.append('task', taskFile)
    if (tplFile)  form.append('template', tplFile)
    if (methFile) form.append('methodology', methFile)
    if (varFile)  form.append('variant_data', varFile)
    if (mode === 'fixed_template' && templateId) form.append('template_id', templateId)
    if (mode === 'custom_template') form.append('sub_mode', subMode)

    try {
      const upRes  = await fetch(`${GOST}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const upData = await upRes.json()
      if (!upRes.ok) { showToast(upData.error ?? 'Ошибка загрузки файлов', 'error'); onStart('error'); return }
      const projectId: string = upData.project_id

      // chat sub-mode: navigate straight to chat, no extraction
      if (mode === 'custom_template' && subMode === 'chat') {
        navigate(`/gost/chat/${projectId}`)
        return
      }

      // custom_template: extract returns final URLs directly
      if (mode === 'custom_template') {
        onStart('extracting', projectId)
        const exRes  = await fetch(`${GOST}/extract?project_id=${projectId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
        const exData = await exRes.json()
        if (!exRes.ok) {
          const msg = exData.error ?? 'Ошибка обработки'
          if (exRes.status === 402) showToast('Недостаточно ГОСТ-токенов', 'error')
          else showToast(msg, 'error')
          onStart('error', projectId); return
        }
        onStart('done', projectId, { docxUrl: exData.docx_url, pdfUrl: exData.pdf_url ?? undefined }, mode)
        return
      }

      // universal / fixed_template: full pipeline
      onStart('extracting', projectId)
      const exRes  = await fetch(`${GOST}/extract?project_id=${projectId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const exData = await exRes.json()
      if (!exRes.ok) {
        if (exRes.status === 402) showToast('Недостаточно ГОСТ-токенов', 'error')
        else showToast(exData.error ?? 'Ошибка извлечения', 'error')
        onStart('error', projectId); return
      }

      onStart('computing', projectId)
      const coRes  = await fetch(`${GOST}/compute?project_id=${projectId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const coData = await coRes.json()
      if (!coRes.ok) { showToast(coData.error ?? 'Ошибка расчёта', 'error'); onStart('error', projectId); return }

      onStart('generating', projectId)
      const genRes  = await fetch(`${GOST}/generate?project_id=${projectId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ meta }),
      })
      const genData = await genRes.json()
      if (!genRes.ok) { showToast(genData.error ?? 'Ошибка генерации', 'error'); onStart('error', projectId); return }

      onStart('done', projectId, { docxUrl: genData.docx_url, pdfUrl: genData.pdf_url ?? undefined }, mode)
    } catch {
      showToast('Сетевая ошибка при обработке', 'error')
      onStart('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-2xl p-6 space-y-5">
      <h2 className="font-semibold text-ink">Новый проект</h2>

      {/* Mode selector */}
      <div>
        <label className="block text-sm font-medium text-ink mb-2">Режим генерации</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([ ['universal', 'Универсальный'], ['fixed_template', 'По шаблону'], ['custom_template', 'Мой файл'] ] as const).map(([m, lbl]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap ${
                mode === m
                  ? 'bg-accent text-white border-accent'
                  : 'bg-canvas border-line text-ink hover:border-accent/50 hover:bg-accent-subtle/20'
              }`}>
              {lbl}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-subtle">
          {mode === 'universal'       && 'Загрузите PDF с заданием — AI сам построит расчёт и сформирует документ по ГОСТ'}
          {mode === 'fixed_template'  && 'Выберите готовый шаблон расчёта — AI подставит ваш вариант'}
          {mode === 'custom_template' && 'Загрузите свой .docx — AI приведёт его к ГОСТ или доработает по заданию'}
        </p>
      </div>

      {/* Sub-mode for custom_template */}
      {mode === 'custom_template' && (
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Что сделать с файлом</label>
          <div className="grid grid-cols-2 gap-2">
            {([ ['format_only', 'Только форматирование'], ['minimal_edit', 'Переработать по заданию'], ['chat', 'Через чат'] ] as const).map(([s, lbl]) => (
              <button key={s} type="button" onClick={() => setSubMode(s)}
                className={`px-3 py-2 text-sm rounded-xl border transition-colors ${
                  subMode === s
                    ? 'bg-accent text-white border-accent'
                    : 'bg-canvas border-line text-ink hover:border-accent/50'
                }`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template selector for fixed_template */}
      {mode === 'fixed_template' && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Шаблон расчёта</label>
          <div className="relative">
            <select value={templateId} onChange={e => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 pr-8 text-sm border border-line rounded-lg bg-canvas text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors">
              <option value="">— Выберите шаблон —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.title}{t.discipline ? ` (${t.discipline})` : ''}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          </div>
          {templates.length === 0 && (
            <p className="text-xs text-subtle mt-1">Загрузка шаблонов…</p>
          )}
        </div>
      )}

      {/* File inputs */}
      <div className="space-y-3">
        {mode === 'custom_template' ? (
          <>
            <FileDropZone
              label={subMode === 'chat' ? 'Образец работы' : 'Шаблон документа (.docx)'}
              accept={subMode === 'chat'
                ? '.docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              }
              file={tplFile}
              onChange={setTplFile}
              optional={subMode === 'chat'}
            />
            {subMode === 'minimal_edit' && (
              <FileDropZone label="Новое задание (PDF)" accept="application/pdf,.pdf" file={taskFile} onChange={setTaskFile} />
            )}
            {subMode === 'chat' && (
              <>
                <FileDropZone label="Задание / вариант" accept="application/pdf,.pdf,.txt,text/plain" file={taskFile} onChange={setTaskFile} optional />
                <p className="text-xs text-center" style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', marginTop: 4 }}>
                  После создания откроется чат для интерактивного редактирования
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <FileDropZone
              label="Файл задания (PDF)"
              accept="application/pdf,.pdf"
              file={taskFile}
              onChange={setTaskFile}
            />
            {mode === 'universal' && (
              <>
                <FileDropZone label="Методичка (PDF)" accept="application/pdf,.pdf" file={methFile} onChange={setMethFile} optional />
                <FileDropZone label="Исходные данные по варианту (PDF или TXT)" accept="application/pdf,.pdf,.txt,text/plain" file={varFile} onChange={setVarFile} optional />
              </>
            )}
          </>
        )}
      </div>

      {/* Meta fields (only for full pipeline) */}
      {mode !== 'custom_template' && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-subtle hover:text-ink transition-colors select-none flex items-center gap-1">
            <ChevronDown size={13} className="group-open:rotate-180 transition-transform" />
            Данные титульного листа (необязательно)
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {([ ['university', 'Университет'], ['student_name', 'ФИО студента'], ['group', 'Группа'], ['supervisor', 'Преподаватель'], ['city_year', 'Город, год'] ] as const).map(([k, lbl]) => (
              <input key={k} placeholder={lbl}
                value={meta[k]} onChange={e => setMeta(prev => ({ ...prev, [k]: e.target.value }))}
                className="px-3 py-2 text-sm border border-line rounded-lg bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors col-span-1 last:col-span-2" />
            ))}
          </div>
        </details>
      )}

      <button type="submit"
        className="w-full py-2.5 bg-accent text-white font-medium text-sm rounded-xl hover:bg-accent-hover transition-colors">
        Создать работу
      </button>
    </form>
  )
}

// ── Progress view ─────────────────────────────────────────────────────────────

function ProgressView({ phase }: { phase: Phase }) {
  const current = stepIndex(phase)
  return (
    <div className="bg-surface border border-line rounded-2xl p-6">
      <h2 className="font-semibold text-ink mb-5">Обработка…</h2>
      <div className="space-y-3">
        {STEPS.map((s, i) => {
          const done    = i < current
          const active  = i === current
          return (
            <div key={s.phase} className="flex items-center gap-3">
              {done ? (
                <CheckCircle2 size={18} className="text-success shrink-0" />
              ) : active ? (
                <Loader2 size={18} className="text-accent shrink-0 animate-spin" />
              ) : (
                <div className="w-[18px] h-[18px] rounded-full border-2 border-line shrink-0" />
              )}
              <span className={`text-sm ${done ? 'text-subtle line-through' : active ? 'text-ink font-medium' : 'text-subtle'}`}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Result view ───────────────────────────────────────────────────────────────

function ResultView({ result, onReset, projectId, mode }: { result: ProjectResult; onReset: () => void; projectId?: string; mode?: string }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={20} className="text-success" />
        <h2 className="font-semibold text-ink">Документ готов!</h2>
      </div>
      <div className="flex flex-wrap gap-3 mb-5">
        <a href={result.docxUrl} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors">
          <Download size={15} />
          Скачать DOCX
        </a>
        {result.pdfUrl && (
          <a href={result.pdfUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-line text-ink text-sm rounded-xl hover:bg-panel transition-colors">
            <Download size={15} />
            Скачать PDF
          </a>
        )}
        {mode === 'custom_template' && projectId && (
          <Link to={`/gost/chat/${projectId}`}
            className="flex items-center gap-2 px-4 py-2.5 border border-accent/60 text-accent text-sm font-medium rounded-xl hover:bg-accent/10 transition-colors">
            <MessageSquare size={15} />
            Редактировать в чате
          </Link>
        )}
      </div>
      <button onClick={onReset}
        className="flex items-center gap-1.5 text-sm text-subtle hover:text-ink transition-colors">
        <RotateCcw size={14} />
        Создать новый проект
      </button>
    </div>
  )
}

// ── Recent projects ───────────────────────────────────────────────────────────

function RecentProjects({ userId, fallback }: { userId: string; fallback?: ReactNode }) {
  const [projects, setProjects] = useState<RecentProject[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, title, status, generation_mode, created_at, output_docx_path, output_pdf_path')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setProjects((data as RecentProject[]) ?? []))
      .then(() => setLoading(false), () => setLoading(false))
  }, [userId])

  async function getDownloadUrl(path: string, bucket: 'outputs'): Promise<string> {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
    return data?.signedUrl ?? ''
  }

  if (loading) return null
  if (projects.length === 0) return fallback ?? null

  const STATUS_LABEL: Record<string, string> = {
    uploaded: 'Загружен', extracted: 'Спецификация', computed: 'Рассчитан', done: 'Готов',
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink mb-3">Последние проекты</h2>
      <div className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
        {projects.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText size={14} className="text-subtle shrink-0" />
                <span className="text-sm font-medium text-ink truncate">{p.title || 'Без названия'}</span>
              </div>
              <p className="text-xs text-subtle mt-0.5">{new Date(p.created_at).toLocaleDateString('ru-RU')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'done' ? 'bg-success/10 text-success' : 'bg-panel text-subtle'}`}>
                {STATUS_LABEL[p.status] ?? p.status}
              </span>
              {p.output_docx_path && (
                <button onClick={async () => {
                  const url = await getDownloadUrl(p.output_docx_path!, 'outputs')
                  if (url) window.open(url, '_blank')
                }} className="p-1.5 rounded-lg text-subtle hover:text-accent hover:bg-accent-subtle transition-colors" title="Скачать DOCX">
                  <Download size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mode hints (shown in the sidebar when there's no project history yet) ──────

const MODE_HINTS = [
  { title: 'Универсальный', desc: 'Загрузите PDF с заданием — AI сам построит расчёт и сформирует документ по ГОСТ' },
  { title: 'По шаблону',    desc: 'Выберите готовый шаблон расчёта — AI подставит ваш вариант' },
  { title: 'Мой файл',      desc: 'Загрузите свой .docx — AI приведёт его к ГОСТ или доработает по заданию' },
] as const

function ModeHints() {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink mb-3">Режимы генерации</h2>
      <div className="space-y-3">
        {MODE_HINTS.map(h => (
          <div key={h.title} className="bg-surface border border-line rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-ink mb-1">{h.title}</h3>
            <p className="text-xs text-subtle leading-relaxed">{h.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Gost() {
  const { session, profile, user } = useAuth()
  const token = session?.access_token ?? null

  const [tokenBalance,  setTokenBalance]  = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [tokenPrice,    setTokenPrice]    = useState(10)
  const [unlimited,     setUnlimited]     = useState(false)
  const [balLoading,    setBalLoading]    = useState(true)

  const [phase,     setPhase]     = useState<Phase>('idle')
  const [result,    setResult]    = useState<ProjectResult | null>(null)
  const [projectId, setProjectId] = useState<string | undefined>()
  const [genMode,   setGenMode]   = useState<string | undefined>()

  useEffect(() => {
    if (!token) { setBalLoading(false); return }
    setBalLoading(true)
    fetch(`${API}/gost/token-balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setTokenBalance(d.token_balance ?? 0)
        setUnlimited(d.unlimited_access ?? false)
        setTokenPrice(d.token_price ?? 10)
      })
      .catch(() => {})
      .finally(() => setBalLoading(false))
    // wallet balance from profile
    if (profile) setWalletBalance(profile.balance ?? 0)
  }, [token, profile])

  function handleStart(p: Phase, pid?: string, res?: ProjectResult, m?: string) {
    setPhase(p)
    if (pid) setProjectId(pid)
    if (res) setResult(res)
    if (m)   setGenMode(m)
  }

  function reset() { setPhase('idle'); setResult(null); setProjectId(undefined); setGenMode(undefined) }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">ГОСТ-калькулятор</h1>
        <p className="text-sm text-subtle mt-0.5">Автоматическая генерация расчётных работ по ГОСТ</p>
      </div>

      {!token && (
        <div className="bg-panel border border-line rounded-2xl px-5 py-4 mb-6 flex items-center gap-3 text-sm text-subtle">
          <AlertCircle size={16} className="shrink-0 text-accent" />
          <span>Войдите, чтобы использовать ГОСТ-калькулятор и видеть баланс токенов</span>
        </div>
      )}

      {token && (
        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6 lg:items-start">
          {/* Левая колонка — новый проект */}
          <div>
            {phase === 'idle' && (
              <UploadForm token={token} onStart={handleStart} />
            )}
            {(phase === 'uploading' || phase === 'extracting' || phase === 'computing' || phase === 'generating') && (
              <ProgressView phase={phase} />
            )}
            {phase === 'done' && result && (
              <ResultView result={result} onReset={reset} projectId={projectId} mode={genMode} />
            )}
            {phase === 'error' && (
              <div className="bg-surface border border-line rounded-2xl p-6 flex items-start gap-3">
                <AlertCircle size={18} className="text-error shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-ink text-sm">Произошла ошибка</p>
                  <p className="text-xs text-subtle mt-0.5">Проверьте токены и корректность файла, затем попробуйте снова</p>
                  <button onClick={reset}
                    className="mt-3 flex items-center gap-1.5 text-sm text-accent hover:underline">
                    <RotateCcw size={13} />
                    Попробовать снова
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Правая колонка — токены + история / подсказки */}
          <div className="mt-6 lg:mt-0 space-y-6">
            <TokenPanel
              tokenBalance={tokenBalance}
              walletBalance={walletBalance}
              tokenPrice={tokenPrice}
              unlimited={unlimited}
              loading={balLoading}
              token={token}
              onCodeActivated={b => setTokenBalance(b)}
              onTokensBought={(tb, wb) => { setTokenBalance(tb); setWalletBalance(wb) }}
            />
            {user && <RecentProjects userId={user.id} fallback={<ModeHints />} />}
          </div>
        </div>
      )}
    </div>
  )
}
