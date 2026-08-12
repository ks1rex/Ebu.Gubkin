import { useEffect, useState } from 'react'
import {
  Loader2, FileText, ChevronDown, ChevronUp, Trash2, Plus, Save, X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Modal from '../../components/Modal'

const GOST = import.meta.env.VITE_GOST_URL as string

interface InputDatum { id: string; symbol: string; value: number | string; unit: string; description: string }
interface TableDef { id: string; name: string; x_label: string; y_label: string; x: number[]; y: number[]; interpolation: string }
interface Step { id: string; result_symbol: string; description: string; formula: string; unit: string; rounding: number; explanation: string; depends_on: string[] }
interface Section { id: string; title: string; level: 1 | 2; intro_text: string; steps: Step[] }

interface TemplateSpec {
  title: string
  discipline: string
  work_type: string
  intro_text_template: string
  conclusion_text_template: string
  conclusion_instructions: string
  references: string[]
  input_data: InputDatum[]
  tables: TableDef[]
  sections: Section[]
}

interface TemplateListItem {
  id: string
  title: string
  has_override: boolean
}

const TABS = [
  { key: 'main',       label: 'Основное' },
  { key: 'inputs',     label: 'Исходные данные' },
  { key: 'tables',     label: 'Таблицы' },
  { key: 'sections',   label: 'Разделы' },
  { key: 'references', label: 'Литература' },
] as const
type Tab = typeof TABS[number]['key']

const INPUT = 'w-full px-3 py-2 text-sm border border-line rounded-lg bg-canvas text-ink focus:outline-none focus:border-accent transition-colors'
const LABEL = 'block text-xs font-medium text-subtle mb-1'
const CARD = 'bg-panel rounded-lg border border-line p-3 space-y-2'
const ICON_BTN = 'p-1.5 rounded text-subtle hover:text-ink hover:bg-canvas disabled:opacity-30 transition-colors'

// ── Имена переменных ──────────────────────────────────────────────────────────
// Разрешены латиница, кириллица, греческие буквы (ξ), цифры и «_» — то же, что
// принимает расчётный движок (backend/app/calc_engine.py::_check_name).
const LETTER = 'A-Za-zА-Яа-яЁё\\u0370-\\u03FF_'
const NAME_CHAR = `[${LETTER}0-9]`
const NAME_RE = new RegExp(`^[${LETTER}]${NAME_CHAR}*$`)

// Встроенные функции/константы asteval — не переменные спецификации
const BUILTINS = new Set([
  'sqrt', 'exp', 'log', 'log10', 'log2', 'sin', 'cos', 'tan', 'asin', 'acos',
  'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'degrees', 'radians',
  'ceil', 'floor', 'abs', 'round', 'min', 'max', 'sum', 'pow',
  'pi', 'e', 'inf', 'True', 'False', 'None', 'interp',
])

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Имена переменных, использованные в формуле (строки в кавычках — id таблиц — пропускаем). */
function namesInFormula(formula: string): string[] {
  const noStrings = formula.replace(/'[^']*'|"[^"]*"/g, ' ')
  const found = noStrings.match(new RegExp(`[${LETTER}]${NAME_CHAR}*`, 'g')) ?? []
  return found.filter(n => !BUILTINS.has(n))
}

/** Переименование переменной во всех формулах, пояснениях и шаблонах текста. */
function renameVar(spec: TemplateSpec, oldId: string, newId: string): TemplateSpec {
  const re = new RegExp(`(?<!${NAME_CHAR})${escapeRe(oldId)}(?!${NAME_CHAR})`, 'g')
  const rw = (t: string) => (t ? t.replace(re, newId) : t)
  return {
    ...spec,
    intro_text_template: rw(spec.intro_text_template),
    conclusion_text_template: rw(spec.conclusion_text_template),
    sections: spec.sections.map(sec => ({
      ...sec,
      steps: sec.steps.map(st => ({
        ...st,
        formula: rw(st.formula),
        explanation: rw(st.explanation ?? ''),
        depends_on: (st.depends_on ?? []).map(d => (d === oldId ? newId : d)),
      })),
    })),
  }
}

/** Переименование id таблицы — она вызывается в формулах как interp('id', x). */
function renameTable(spec: TemplateSpec, oldId: string, newId: string): TemplateSpec {
  const re = new RegExp(`(['"])${escapeRe(oldId)}\\1`, 'g')
  return {
    ...spec,
    sections: spec.sections.map(sec => ({
      ...sec,
      steps: sec.steps.map(st => ({ ...st, formula: st.formula.replace(re, `'${newId}'`) })),
    })),
  }
}

function allVarIds(spec: TemplateSpec): string[] {
  return [
    ...spec.input_data.map(d => d.id),
    ...spec.sections.flatMap(sec => sec.steps.map(st => st.id)),
  ]
}

function freeId(taken: string[], prefix: string): string {
  let n = 1
  while (taken.includes(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}

function validateSpec(spec: TemplateSpec): { errors: Set<string>; messages: string[] } {
  const errors = new Set<string>()
  const messages: string[] = []
  if (!spec.title.trim()) { errors.add('title'); messages.push('Не заполнено название шаблона') }

  const seen = new Set<string>()
  const known = new Set<string>()
  for (const id of allVarIds(spec)) {
    if (!NAME_RE.test(id)) {
      errors.add(`name-${id}`)
      messages.push(`Недопустимое имя переменной «${id}»: разрешены буквы (русские или латинские), цифры и «_», имя не может начинаться с цифры и содержать пробелы, точки, запятые`)
    } else if (BUILTINS.has(id)) {
      errors.add(`name-${id}`)
      messages.push(`Имя «${id}» занято встроенной функцией — переименуйте переменную`)
    }
    if (seen.has(id)) {
      errors.add(`name-${id}`)
      messages.push(`Переменная «${id}» объявлена дважды`)
    }
    seen.add(id)
    known.add(id)
  }

  const tableIds = new Set(spec.tables.map(t => t.id))
  spec.sections.forEach(sec => sec.steps.forEach(st => {
    if (!st.formula.trim()) {
      errors.add(`step-formula-${st.id}`)
      messages.push(`Шаг «${st.id}»: пустая формула`)
      return
    }
    for (const name of namesInFormula(st.formula)) {
      if (!known.has(name)) {
        errors.add(`step-formula-${st.id}`)
        messages.push(`Шаг «${st.id}»: в формуле неизвестная переменная «${name}» — проверьте раскладку (русская «К» и латинская «K» выглядят одинаково) и что такая переменная объявлена выше`)
      }
    }
    for (const m of st.formula.matchAll(/interp\(\s*['"]([^'"]+)['"]/g)) {
      if (!tableIds.has(m[1])) {
        errors.add(`step-formula-${st.id}`)
        messages.push(`Шаг «${st.id}»: таблица «${m[1]}» не найдена во вкладке «Таблицы»`)
      }
    }
  }))

  spec.tables.forEach(t => {
    if (t.x.length !== t.y.length || t.x.some(Number.isNaN) || t.y.some(Number.isNaN)) {
      errors.add(`table-${t.id}`)
      messages.push(`Таблица «${t.id}»: X и Y должны содержать одинаковое количество чисел`)
    }
  })

  return { errors, messages }
}

function parseNumberList(s: string): number[] {
  return s.split(',').map(v => v.trim()).filter(v => v !== '').map(Number)
}

function parseValue(v: string): number | string {
  const n = Number(v.replace(',', '.'))
  return v.trim() !== '' && Number.isFinite(n) ? n : v
}

// ── Поля ──────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, mono, error, hint }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean; error?: boolean; hint?: string
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${INPUT} ${mono ? 'font-mono' : ''} ${error ? 'border-error' : ''}`}
      />
      {hint && <p className="text-xs text-subtle mt-1">{hint}</p>}
    </div>
  )
}

function TextAreaField({ label, value, onChange, rows = 3, hint }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className={INPUT} />
      {hint && <p className="text-xs text-subtle mt-1">{hint}</p>}
    </div>
  )
}

/**
 * Имя переменной. Правится локально и применяется по потере фокуса / Enter —
 * иначе каждое нажатие клавиши переписывало бы формулы промежуточным именем.
 */
function IdField({ label, value, onCommit, error, hint }: {
  label: string; value: string; onCommit: (v: string) => void; error?: boolean; hint?: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { setDraft(value) }, [value])
  const commit = () => {
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    else setDraft(value)
  }
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className={`${INPUT} font-mono ${error ? 'border-error' : ''}`}
      />
      {hint && <p className="text-xs text-subtle mt-1">{hint}</p>}
    </div>
  )
}

export default function AdminGostTemplates() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [list, setList] = useState<TemplateListItem[]>([])
  const [listLoading, setListLoading] = useState(true)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hasOverride, setHasOverride] = useState(false)
  const [loadedSpec, setLoadedSpec] = useState<TemplateSpec | null>(null)
  const [spec, setSpec] = useState<TemplateSpec | null>(null)
  const [tableTexts, setTableTexts] = useState<Record<string, { x: string; y: string }>>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [tab, setTab] = useState<Tab>('main')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [confirmReset, setConfirmReset] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<string[]>([])

  const dirty = !!spec && !!loadedSpec && JSON.stringify(spec) !== JSON.stringify(loadedSpec)

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    if (!token || !GOST) { setListLoading(false); return }
    fetch(`${GOST}/admin/templates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => toast('Не удалось загрузить список шаблонов', 'error'))
      .finally(() => setListLoading(false))
  }, [token])

  function buildTableTexts(s: TemplateSpec) {
    const texts: Record<string, { x: string; y: string }> = {}
    s.tables.forEach(t => { texts[t.id] = { x: t.x.join(', '), y: t.y.join(', ') } })
    return texts
  }

  /** Заполняем поля, которых может не быть в старых спецификациях. */
  function normalize(s: TemplateSpec): TemplateSpec {
    return {
      ...s,
      references: s.references ?? [],
      input_data: (s.input_data ?? []).map(d => ({ ...d, symbol: d.symbol ?? d.id })),
      tables: s.tables ?? [],
      sections: (s.sections ?? []).map(sec => ({
        ...sec,
        steps: (sec.steps ?? []).map(st => ({
          ...st,
          rounding: st.rounding ?? 3,
          explanation: st.explanation ?? '',
          depends_on: st.depends_on ?? [],
          result_symbol: st.result_symbol ?? st.id,
        })),
      })),
    }
  }

  function loadTemplate(id: string) {
    if (!token) return
    setDetailLoading(true)
    setSelectedId(id)
    fetch(`${GOST}/admin/templates/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const s = normalize((data.spec ?? data) as TemplateSpec)
        setHasOverride(data.source === 'override')   // GET /{id} отдаёт source, не has_override
        setLoadedSpec(s)
        setSpec(s)
        setTableTexts(buildTableTexts(s))
        setTab('main')
        setErrors(new Set())
        setMessages([])
      })
      .catch(() => toast('Не удалось загрузить шаблон', 'error'))
      .finally(() => setDetailLoading(false))
  }

  function selectTemplate(id: string) {
    if (id === selectedId) return
    if (dirty) { setPendingId(id); return }
    loadTemplate(id)
  }

  function update(patch: Partial<TemplateSpec>) {
    setSpec(s => s ? { ...s, ...patch } : s)
  }

  async function save() {
    if (!spec || !selectedId || !token) return
    const { errors: errs, messages: msgs } = validateSpec(spec)
    setErrors(errs)
    setMessages(msgs)
    if (errs.size > 0) { toast('Шаблон не сохранён: проверьте ошибки выше', 'error'); return }

    setSaving(true)
    try {
      const res = await fetch(`${GOST}/admin/templates/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: spec.title, spec }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail?.error ?? data?.error ?? '')
      toast('Шаблон сохранён', 'success')
      setMessages([])
      setLoadedSpec(spec)
      setHasOverride(true)
      setList(l => l.map(t => t.id === selectedId ? { ...t, has_override: true } : t))
    } catch (e) {
      const msg = (e as Error).message || 'Не удалось сохранить шаблон'
      setMessages([msg])
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  function cancelEdits() {
    if (!loadedSpec) return
    setSpec(loadedSpec)
    setTableTexts(buildTableTexts(loadedSpec))
    setErrors(new Set())
    setMessages([])
  }

  async function resetToOriginal() {
    if (!selectedId || !token) return
    setResetting(true)
    try {
      const res = await fetch(`${GOST}/admin/templates/${selectedId}/override`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast('Сброшено к оригиналу', 'success')
      setList(l => l.map(t => t.id === selectedId ? { ...t, has_override: false } : t))
      setConfirmReset(false)
      loadTemplate(selectedId)
    } catch {
      toast('Не удалось сбросить шаблон', 'error')
    } finally {
      setResetting(false)
    }
  }

  function toggleSection(id: string) {
    setOpenSections(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Переменные: переименование с подстановкой во все формулы ────────────────

  function renameVarId(oldId: string, newId: string) {
    if (!spec) return
    if (!NAME_RE.test(newId)) {
      toast('Имя переменной: только буквы (можно русские), цифры и «_», без пробелов и точек', 'error')
      return
    }
    if (allVarIds(spec).includes(newId)) {
      toast(`Переменная «${newId}» уже существует`, 'error')
      return
    }
    const renamed = renameVar(spec, oldId, newId)
    setSpec({
      ...renamed,
      input_data: renamed.input_data.map(d => d.id === oldId ? { ...d, id: newId, symbol: newId } : d),
      sections: renamed.sections.map(sec => ({
        ...sec,
        steps: sec.steps.map(st => st.id === oldId ? { ...st, id: newId, result_symbol: newId } : st),
      })),
    })
  }

  /** Сколько формул ссылается на переменную — предупреждение перед удалением. */
  function usageCount(id: string): number {
    if (!spec) return 0
    return spec.sections.reduce(
      (n, sec) => n + sec.steps.filter(st => st.id !== id && namesInFormula(st.formula).includes(id)).length,
      0,
    )
  }

  // ── Исходные данные ─────────────────────────────────────────────────────────

  function updateInputDatum(id: string, patch: Partial<InputDatum>) {
    update({ input_data: spec!.input_data.map(d => d.id === id ? { ...d, ...patch } : d) })
  }

  function addInputDatum() {
    const id = freeId(allVarIds(spec!), 'x')
    update({ input_data: [...spec!.input_data, { id, symbol: id, value: 0, unit: '', description: '' }] })
  }

  function removeInputDatum(id: string) {
    const used = usageCount(id)
    update({ input_data: spec!.input_data.filter(d => d.id !== id) })
    if (used) toast(`Переменная «${id}» удалена, но используется в ${used} формуле(ах) — поправьте их`, 'error')
  }

  // ── Таблицы ─────────────────────────────────────────────────────────────────

  function updateTable(id: string, patch: Partial<TableDef>) {
    update({ tables: spec!.tables.map(t => t.id === id ? { ...t, ...patch } : t) })
  }

  function renameTableId(oldId: string, newId: string) {
    if (!spec) return
    if (!NAME_RE.test(newId)) { toast('Имя таблицы: буквы, цифры и «_»', 'error'); return }
    if (spec.tables.some(t => t.id === newId)) { toast(`Таблица «${newId}» уже существует`, 'error'); return }
    const renamed = renameTable(spec, oldId, newId)
    setSpec({ ...renamed, tables: renamed.tables.map(t => t.id === oldId ? { ...t, id: newId } : t) })
    setTableTexts(prev => {
      const next = { ...prev, [newId]: prev[oldId] ?? { x: '', y: '' } }
      delete next[oldId]
      return next
    })
  }

  function updateTableNumbers(id: string, axis: 'x' | 'y', text: string) {
    setTableTexts(prev => ({ ...prev, [id]: { ...prev[id], [axis]: text } }))
    updateTable(id, { [axis]: parseNumberList(text) } as Partial<TableDef>)
  }

  function addTable() {
    const id = freeId(spec!.tables.map(t => t.id), 'tab')
    update({ tables: [...spec!.tables, { id, name: '', x_label: '', y_label: '', x: [], y: [], interpolation: 'linear' }] })
    setTableTexts(prev => ({ ...prev, [id]: { x: '', y: '' } }))
  }

  function removeTable(id: string) {
    update({ tables: spec!.tables.filter(t => t.id !== id) })
  }

  // ── Разделы и шаги ──────────────────────────────────────────────────────────

  function updateSection(id: string, patch: Partial<Section>) {
    update({ sections: spec!.sections.map(sec => sec.id === id ? { ...sec, ...patch } : sec) })
  }

  function addSection() {
    const id = `sec_${Date.now().toString(36)}`
    update({ sections: [...spec!.sections, { id, title: 'Новый раздел', level: 1, intro_text: '', steps: [] }] })
    setOpenSections(s => new Set(s).add(id))
  }

  function removeSection(id: string) {
    update({ sections: spec!.sections.filter(sec => sec.id !== id) })
  }

  function moveSection(index: number, dir: -1 | 1) {
    const sections = [...spec!.sections]
    const target = index + dir
    if (target < 0 || target >= sections.length) return
    ;[sections[index], sections[target]] = [sections[target], sections[index]]
    update({ sections })
  }

  function updateStep(sectionId: string, stepId: string, patch: Partial<Step>) {
    update({
      sections: spec!.sections.map(sec => sec.id !== sectionId ? sec : {
        ...sec,
        steps: sec.steps.map(st => st.id === stepId ? { ...st, ...patch } : st),
      }),
    })
  }

  function addStep(sectionId: string) {
    const id = freeId(allVarIds(spec!), 'y')
    const step: Step = {
      id, result_symbol: id, description: '', formula: '', unit: '',
      rounding: 3, explanation: '', depends_on: [],
    }
    const sec = spec!.sections.find(s => s.id === sectionId)!
    updateSection(sectionId, { steps: [...sec.steps, step] })
  }

  function removeStep(sectionId: string, stepId: string) {
    const used = usageCount(stepId)
    const sec = spec!.sections.find(s => s.id === sectionId)!
    updateSection(sectionId, { steps: sec.steps.filter(st => st.id !== stepId) })
    if (used) toast(`Формула «${stepId}» удалена, но используется в ${used} других формулах — поправьте их`, 'error')
  }

  function moveStep(sectionId: string, index: number, dir: -1 | 1) {
    const sec = spec!.sections.find(s => s.id === sectionId)!
    const steps = [...sec.steps]
    const target = index + dir
    if (target < 0 || target >= steps.length) return
    ;[steps[index], steps[target]] = [steps[target], steps[index]]
    updateSection(sectionId, { steps })
  }

  // ── Литература ──────────────────────────────────────────────────────────────

  function updateReference(i: number, value: string) {
    const refs = [...spec!.references]
    refs[i] = value
    update({ references: refs })
  }

  function removeReference(i: number) {
    update({ references: spec!.references.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">ГОСТ-шаблоны</h1>

      {!GOST ? (
        <div className="text-sm text-subtle">VITE_GOST_URL не настроен</div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-start">
          {/* Left panel */}
          <div className="w-full md:w-64 shrink-0 bg-surface rounded-xl border border-line overflow-hidden">
            {listLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-panel animate-pulse" />)}
              </div>
            ) : list.length === 0 ? (
              <div className="p-4 text-sm text-subtle">Шаблонов нет</div>
            ) : (
              <div className="divide-y divide-line max-h-60 md:max-h-none overflow-y-auto">
                {list.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t.id)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                      selectedId === t.id ? 'bg-accent-subtle text-accent font-medium' : 'text-ink hover:bg-panel'
                    }`}
                  >
                    <span className="truncate">{t.title}</span>
                    <span className={`shrink-0 w-2 h-2 rounded-full ${t.has_override ? 'bg-success' : 'bg-line'}`}
                      title={t.has_override ? 'Изменён' : 'Оригинал'} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0 bg-surface rounded-xl border border-line">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center py-24 text-subtle gap-3">
                <FileText size={32} />
                <span className="text-sm">Выберите шаблон для редактирования</span>
              </div>
            ) : detailLoading || !spec ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-subtle" />
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Tabs */}
                <div className="flex gap-1 px-4 pt-3 border-b border-line overflow-x-auto">
                  {TABS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`px-3 py-2 text-sm rounded-t-lg whitespace-nowrap transition-colors ${
                        tab === t.key ? 'text-accent border-b-2 border-accent font-medium' : 'text-subtle hover:text-ink'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {messages.length > 0 && (
                  <div className="mx-4 mt-3 rounded-lg border border-error/40 bg-error/10 p-3 space-y-1">
                    {messages.map((m, i) => <p key={i} className="text-xs text-error">{m}</p>)}
                  </div>
                )}

                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {tab === 'main' && (
                    <div className="space-y-3 max-w-xl">
                      <Field label="Название" value={spec.title} onChange={v => update({ title: v })} error={errors.has('title')} />
                      <Field label="Дисциплина" value={spec.discipline} onChange={v => update({ discipline: v })} />
                      <Field label="Тип работы" value={spec.work_type} onChange={v => update({ work_type: v })} />
                      <TextAreaField label="Введение" value={spec.intro_text_template} onChange={v => update({ intro_text_template: v })} rows={4} hint="Подстановка значений: {{ Qсут }} — имя переменной как в формулах" />
                      <TextAreaField label="Заключение" value={spec.conclusion_text_template} onChange={v => update({ conclusion_text_template: v })} rows={4} />
                      <TextAreaField label="Инструкции к заключению" value={spec.conclusion_instructions} onChange={v => update({ conclusion_instructions: v })} rows={3} />
                    </div>
                  )}

                  {tab === 'inputs' && (
                    <div className="space-y-2">
                      <p className="text-xs text-subtle">
                        Обозначение — это одновременно имя в формулах и то, что печатается в документе.
                        Можно писать по-русски: Qсут, Кмакс. При переименовании формулы обновляются автоматически.
                      </p>
                      {spec.input_data.map(d => (
                        <div key={d.id} className={CARD}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            <IdField label="Обозначение" value={d.id}
                              onCommit={v => renameVarId(d.id, v)} error={errors.has(`name-${d.id}`)} />
                            <Field label="Значение" value={String(d.value)} onChange={v => updateInputDatum(d.id, { value: parseValue(v) })} />
                            <Field label="Единица" value={d.unit} onChange={v => updateInputDatum(d.id, { unit: v })} />
                            <Field label="Описание" value={d.description} onChange={v => updateInputDatum(d.id, { description: v })} />
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => removeInputDatum(d.id)}
                              className="flex items-center gap-1 text-xs text-subtle hover:text-error transition-colors">
                              <Trash2 size={13} /> Удалить
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={addInputDatum} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
                        <Plus size={14} /> Добавить исходные данные
                      </button>
                    </div>
                  )}

                  {tab === 'tables' && (
                    <div className="space-y-2">
                      <p className="text-xs text-subtle">В формулах таблица вызывается как interp('имя_таблицы', x)</p>
                      {spec.tables.map(t => (
                        <div key={t.id} className={`${CARD} ${errors.has(`table-${t.id}`) ? 'border-error' : ''}`}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <IdField label="Имя таблицы" value={t.id} onCommit={v => renameTableId(t.id, v)} />
                            <Field label="Название" value={t.name} onChange={v => updateTable(t.id, { name: v })} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Field label="Подпись X" value={t.x_label} onChange={v => updateTable(t.id, { x_label: v })} />
                            <Field label="Подпись Y" value={t.y_label} onChange={v => updateTable(t.id, { y_label: v })} />
                            <div>
                              <label className={LABEL}>Тип интерполяции</label>
                              <select value={t.interpolation} onChange={e => updateTable(t.id, { interpolation: e.target.value })} className={INPUT}>
                                <option value="linear">linear</option>
                                <option value="nearest">nearest</option>
                                <option value="cubic">cubic</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <TextAreaField label="Значения X" value={tableTexts[t.id]?.x ?? ''} onChange={v => updateTableNumbers(t.id, 'x', v)} rows={2} />
                            <TextAreaField label="Значения Y" value={tableTexts[t.id]?.y ?? ''} onChange={v => updateTableNumbers(t.id, 'y', v)} rows={2} />
                          </div>
                          {errors.has(`table-${t.id}`) && (
                            <p className="text-xs text-error">X и Y должны содержать одинаковое число чисел</p>
                          )}
                          <div className="flex justify-end">
                            <button onClick={() => removeTable(t.id)}
                              className="flex items-center gap-1 text-xs text-subtle hover:text-error transition-colors">
                              <Trash2 size={13} /> Удалить таблицу
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={addTable} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
                        <Plus size={14} /> Добавить таблицу
                      </button>
                    </div>
                  )}

                  {tab === 'sections' && (
                    <div className="space-y-2">
                      {spec.sections.map((sec, si) => {
                        const open = openSections.has(sec.id)
                        return (
                          <div key={sec.id} className="rounded-lg border border-line overflow-hidden">
                            <div className="flex items-center gap-1 px-2 py-1.5 bg-panel">
                              <button onClick={() => toggleSection(sec.id)} className="flex-1 flex items-center justify-between gap-2 px-1 py-1 text-left">
                                <span className="text-sm text-ink flex items-center gap-2">
                                  <span className="text-xs font-mono text-subtle px-1.5 py-0.5 rounded bg-canvas">
                                    {sec.level === 1 ? 'H1' : 'H2'}
                                  </span>
                                  {sec.title || '(без названия)'}
                                  <span className="text-xs text-subtle">· {sec.steps.length} формул</span>
                                </span>
                                {open ? <ChevronUp size={16} className="text-subtle" /> : <ChevronDown size={16} className="text-subtle" />}
                              </button>
                              <button onClick={() => moveSection(si, -1)} disabled={si === 0} className={ICON_BTN} title="Выше">
                                <ChevronUp size={14} />
                              </button>
                              <button onClick={() => moveSection(si, 1)} disabled={si === spec.sections.length - 1} className={ICON_BTN} title="Ниже">
                                <ChevronDown size={14} />
                              </button>
                              <button onClick={() => removeSection(sec.id)} className={`${ICON_BTN} hover:text-error`} title="Удалить раздел">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            {open && (
                              <div className="p-3 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <Field label="Название" value={sec.title} onChange={v => updateSection(sec.id, { title: v })} />
                                  <div>
                                    <label className={LABEL}>Уровень</label>
                                    <select
                                      value={sec.level}
                                      onChange={e => updateSection(sec.id, { level: Number(e.target.value) as 1 | 2 })}
                                      className={INPUT}
                                    >
                                      <option value={1}>1 (Глава)</option>
                                      <option value={2}>2 (Подраздел)</option>
                                    </select>
                                  </div>
                                </div>
                                <TextAreaField label="Вводный текст" value={sec.intro_text} onChange={v => updateSection(sec.id, { intro_text: v })} rows={3} />

                                <div className="space-y-2">
                                  <span className="text-xs font-medium text-subtle uppercase">Формулы</span>
                                  {sec.steps.map((st, i) => (
                                    <div key={st.id} className={CARD}>
                                      <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => moveStep(sec.id, i, -1)} disabled={i === 0} className={ICON_BTN} title="Выше">
                                          <ChevronUp size={14} />
                                        </button>
                                        <button onClick={() => moveStep(sec.id, i, 1)} disabled={i === sec.steps.length - 1} className={ICON_BTN} title="Ниже">
                                          <ChevronDown size={14} />
                                        </button>
                                        <button onClick={() => removeStep(sec.id, st.id)} className={`${ICON_BTN} hover:text-error`} title="Удалить формулу">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <IdField label="Обозначение результата" value={st.id}
                                          onCommit={v => renameVarId(st.id, v)} error={errors.has(`name-${st.id}`)} />
                                        <Field label="Единица" value={st.unit} onChange={v => updateStep(sec.id, st.id, { unit: v })} />
                                        <div>
                                          <label className={LABEL}>Знаков после запятой</label>
                                          <input type="number" min={0} max={10} value={st.rounding}
                                            onChange={e => updateStep(sec.id, st.id, { rounding: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
                                            className={INPUT} />
                                        </div>
                                      </div>
                                      <TextAreaField label="Описание" value={st.description} onChange={v => updateStep(sec.id, st.id, { description: v })} rows={2} />
                                      <Field label="Формула" value={st.formula} mono
                                        onChange={v => updateStep(sec.id, st.id, { formula: v })}
                                        error={errors.has(`step-formula-${st.id}`)}
                                        hint="Пишется в документ как есть. Имена переменных — из «Исходных данных» и формул выше, можно по-русски: Qсут / 24" />
                                      <TextAreaField label="Пояснение («где …»)" value={st.explanation} onChange={v => updateStep(sec.id, st.id, { explanation: v })} rows={2} />
                                    </div>
                                  ))}
                                  <button onClick={() => addStep(sec.id)} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
                                    <Plus size={14} /> Добавить формулу
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <button onClick={addSection} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
                        <Plus size={14} /> Добавить раздел
                      </button>
                    </div>
                  )}

                  {tab === 'references' && (
                    <div className="space-y-2 max-w-xl">
                      {spec.references.map((ref, i) => (
                        <div key={i} className="flex gap-2">
                          <input value={ref} onChange={e => updateReference(i, e.target.value)} className={INPUT} />
                          <button onClick={() => removeReference(i)} className="p-2 rounded-lg text-subtle hover:text-error hover:bg-panel transition-colors shrink-0">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => update({ references: [...spec.references, ''] })}
                        className="flex items-center gap-1.5 text-sm text-accent hover:underline"
                      >
                        <Plus size={14} /> Добавить источник
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-line">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={save}
                      disabled={!dirty || saving}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Сохранить изменения
                    </button>
                    <button
                      onClick={cancelEdits}
                      disabled={!dirty}
                      className="px-4 py-2 text-sm border border-line text-ink rounded-lg hover:bg-panel transition-colors disabled:opacity-50"
                    >
                      Отменить
                    </button>
                  </div>
                  {hasOverride && (
                    <button
                      onClick={() => setConfirmReset(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-error border border-error/40 rounded-lg hover:bg-error/10 transition-colors"
                    >
                      <Trash2 size={14} /> Сбросить к оригиналу
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Сбросить шаблон?">
        <p className="text-sm text-ink mb-4">
          Вы уверены? Все изменения удалятся и шаблон вернётся к исходной версии из файла.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmReset(false)} className="px-4 py-2 text-sm border border-line text-ink rounded-lg hover:bg-panel transition-colors">
            Отмена
          </button>
          <button onClick={resetToOriginal} disabled={resetting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-error text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50">
            {resetting && <Loader2 size={14} className="animate-spin" />}
            Сбросить
          </button>
        </div>
      </Modal>

      <Modal open={!!pendingId} onClose={() => setPendingId(null)} title="Несохранённые изменения">
        <p className="text-sm text-ink mb-4">
          В текущем шаблоне есть несохранённые изменения. Переключиться без сохранения?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setPendingId(null)} className="px-4 py-2 text-sm border border-line text-ink rounded-lg hover:bg-panel transition-colors">
            Остаться
          </button>
          <button
            onClick={() => { const id = pendingId!; setPendingId(null); loadTemplate(id) }}
            className="px-4 py-2 text-sm bg-error text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Переключиться
          </button>
        </div>
      </Modal>
    </div>
  )
}
