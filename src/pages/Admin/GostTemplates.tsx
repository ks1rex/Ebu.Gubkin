import { useEffect, useState } from 'react'
import {
  Loader2, FileText, ChevronDown, ChevronUp, Trash2, Plus, Save, X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Modal from '../../components/Modal'

const GOST = import.meta.env.VITE_GOST_URL as string

interface InputDatum { id: string; symbol: string; value: number; unit: string; description: string }
interface TableDef { id: string; name: string; x_label: string; y_label: string; x: number[]; y: number[]; interpolation: string }
interface Step { id: string; result_symbol: string; description: string; formula: string; unit: string; depends_on: string[] }
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

function Field({ label, value, onChange, mono, error }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean; error?: boolean
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${INPUT} ${mono ? 'font-mono' : ''} ${error ? 'border-error' : ''}`}
      />
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

function validateSpec(spec: TemplateSpec): { ok: boolean; errors: Set<string> } {
  const errors = new Set<string>()
  if (!spec.title.trim()) errors.add('title')
  spec.sections.forEach(sec => sec.steps.forEach(st => {
    if (!st.formula.trim()) errors.add(`step-formula-${st.id}`)
    if (!st.result_symbol.trim()) errors.add(`step-symbol-${st.id}`)
  }))
  spec.tables.forEach(t => {
    if (t.x.length !== t.y.length || t.x.some(Number.isNaN) || t.y.some(Number.isNaN)) {
      errors.add(`table-${t.id}`)
    }
  })
  return { ok: errors.size === 0, errors }
}

function parseNumberList(s: string): number[] {
  return s.split(',').map(v => v.trim()).filter(v => v !== '').map(Number)
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

  function loadTemplate(id: string) {
    if (!token) return
    setDetailLoading(true)
    setSelectedId(id)
    fetch(`${GOST}/admin/templates/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const s: TemplateSpec = data.spec ?? data
        setHasOverride(!!data.has_override)
        setLoadedSpec(s)
        setSpec(s)
        setTableTexts(buildTableTexts(s))
        setTab('main')
        setErrors(new Set())
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
    const { ok, errors: errs } = validateSpec(spec)
    setErrors(errs)
    if (!ok) { toast('Проверьте поля, отмеченные красным', 'error'); return }

    setSaving(true)
    try {
      const res = await fetch(`${GOST}/admin/templates/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: spec.title, spec }),
      })
      if (!res.ok) throw new Error()
      toast('Шаблон сохранён', 'success')
      setLoadedSpec(spec)
      setHasOverride(true)
      setList(l => l.map(t => t.id === selectedId ? { ...t, has_override: true } : t))
    } catch {
      toast('Не удалось сохранить шаблон', 'error')
    } finally {
      setSaving(false)
    }
  }

  function cancelEdits() {
    if (!loadedSpec) return
    setSpec(loadedSpec)
    setTableTexts(buildTableTexts(loadedSpec))
    setErrors(new Set())
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

  function updateSection(id: string, patch: Partial<Section>) {
    update({ sections: spec!.sections.map(sec => sec.id === id ? { ...sec, ...patch } : sec) })
  }

  function updateStep(sectionId: string, stepId: string, patch: Partial<Step>) {
    update({
      sections: spec!.sections.map(sec => sec.id !== sectionId ? sec : {
        ...sec,
        steps: sec.steps.map(st => st.id === stepId ? { ...st, ...patch } : st),
      }),
    })
  }

  function moveStep(sectionId: string, index: number, dir: -1 | 1) {
    const sec = spec!.sections.find(s => s.id === sectionId)!
    const steps = [...sec.steps]
    const target = index + dir
    if (target < 0 || target >= steps.length) return
    ;[steps[index], steps[target]] = [steps[target], steps[index]]
    updateSection(sectionId, { steps })
  }

  function updateInputDatum(id: string, patch: Partial<InputDatum>) {
    update({ input_data: spec!.input_data.map(d => d.id === id ? { ...d, ...patch } : d) })
  }

  function updateTable(id: string, patch: Partial<TableDef>) {
    update({ tables: spec!.tables.map(t => t.id === id ? { ...t, ...patch } : t) })
  }

  function updateTableNumbers(id: string, axis: 'x' | 'y', text: string) {
    setTableTexts(prev => ({ ...prev, [id]: { ...prev[id], [axis]: text } }))
    updateTable(id, { [axis]: parseNumberList(text) } as Partial<TableDef>)
  }

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
        <div className="flex gap-4 items-start">
          {/* Left panel */}
          <div className="w-64 shrink-0 bg-surface rounded-xl border border-line overflow-hidden">
            {listLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-panel animate-pulse" />)}
              </div>
            ) : list.length === 0 ? (
              <div className="p-4 text-sm text-subtle">Шаблонов нет</div>
            ) : (
              <div className="divide-y divide-line">
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

                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {tab === 'main' && (
                    <div className="space-y-3 max-w-xl">
                      <Field label="Название" value={spec.title} onChange={v => update({ title: v })} error={errors.has('title')} />
                      <Field label="Дисциплина" value={spec.discipline} onChange={v => update({ discipline: v })} />
                      <Field label="Тип работы" value={spec.work_type} onChange={v => update({ work_type: v })} />
                      <TextAreaField label="Введение" value={spec.intro_text_template} onChange={v => update({ intro_text_template: v })} rows={4} hint="Поддерживает Jinja2: {{ переменная }}" />
                      <TextAreaField label="Заключение" value={spec.conclusion_text_template} onChange={v => update({ conclusion_text_template: v })} rows={4} />
                      <TextAreaField label="Инструкции к заключению" value={spec.conclusion_instructions} onChange={v => update({ conclusion_instructions: v })} rows={3} />
                    </div>
                  )}

                  {tab === 'inputs' && (
                    <div className="space-y-2">
                      {spec.input_data.map(d => (
                        <div key={d.id} className={CARD}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-subtle">{d.id}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <Field label="Обозначение" value={d.symbol} onChange={v => updateInputDatum(d.id, { symbol: v })} />
                            <Field label="Значение" value={String(d.value)} onChange={v => updateInputDatum(d.id, { value: Number(v) || 0 })} />
                            <Field label="Единица" value={d.unit} onChange={v => updateInputDatum(d.id, { unit: v })} />
                            <Field label="Описание" value={d.description} onChange={v => updateInputDatum(d.id, { description: v })} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'tables' && (
                    <div className="space-y-2">
                      {spec.tables.map(t => (
                        <div key={t.id} className={`${CARD} ${errors.has(`table-${t.id}`) ? 'border-error' : ''}`}>
                          <span className="text-xs font-mono text-subtle">{t.id}</span>
                          <div className="grid grid-cols-3 gap-2">
                            <Field label="Название" value={t.name} onChange={v => updateTable(t.id, { name: v })} />
                            <Field label="Подпись X" value={t.x_label} onChange={v => updateTable(t.id, { x_label: v })} />
                            <Field label="Подпись Y" value={t.y_label} onChange={v => updateTable(t.id, { y_label: v })} />
                          </div>
                          <div>
                            <label className={LABEL}>Тип интерполяции</label>
                            <select value={t.interpolation} onChange={e => updateTable(t.id, { interpolation: e.target.value })} className={INPUT}>
                              <option value="linear">linear</option>
                              <option value="nearest">nearest</option>
                              <option value="cubic">cubic</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <TextAreaField label="Значения X" value={tableTexts[t.id]?.x ?? ''} onChange={v => updateTableNumbers(t.id, 'x', v)} rows={2} />
                            <TextAreaField label="Значения Y" value={tableTexts[t.id]?.y ?? ''} onChange={v => updateTableNumbers(t.id, 'y', v)} rows={2} />
                          </div>
                          {errors.has(`table-${t.id}`) && (
                            <p className="text-xs text-error">X и Y должны содержать одинаковое число чисел</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'sections' && (
                    <div className="space-y-2">
                      {spec.sections.map(sec => {
                        const open = openSections.has(sec.id)
                        return (
                          <div key={sec.id} className="rounded-lg border border-line overflow-hidden">
                            <button
                              onClick={() => toggleSection(sec.id)}
                              className="w-full flex items-center justify-between px-3 py-2.5 bg-panel text-left"
                            >
                              <span className="text-sm text-ink flex items-center gap-2">
                                <span className="text-xs font-mono text-subtle px-1.5 py-0.5 rounded bg-canvas">
                                  {sec.level === 1 ? 'H1' : 'H2'}
                                </span>
                                {sec.title || '(без названия)'}
                              </span>
                              {open ? <ChevronUp size={16} className="text-subtle" /> : <ChevronDown size={16} className="text-subtle" />}
                            </button>
                            {open && (
                              <div className="p-3 space-y-3">
                                <div className="grid grid-cols-3 gap-2">
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
                                  <span className="text-xs font-medium text-subtle uppercase">Шаги расчёта</span>
                                  {sec.steps.map((st, i) => (
                                    <div key={st.id} className={CARD}>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono text-subtle">{st.id}</span>
                                        <div className="flex gap-1">
                                          <button onClick={() => moveStep(sec.id, i, -1)} disabled={i === 0}
                                            className="p-1 rounded text-subtle hover:text-ink hover:bg-canvas disabled:opacity-30 transition-colors">
                                            <ChevronUp size={14} />
                                          </button>
                                          <button onClick={() => moveStep(sec.id, i, 1)} disabled={i === sec.steps.length - 1}
                                            className="p-1 rounded text-subtle hover:text-ink hover:bg-canvas disabled:opacity-30 transition-colors">
                                            <ChevronDown size={14} />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Field label="Обозначение результата" value={st.result_symbol}
                                          onChange={v => updateStep(sec.id, st.id, { result_symbol: v })}
                                          error={errors.has(`step-symbol-${st.id}`)} />
                                        <Field label="Единица" value={st.unit} onChange={v => updateStep(sec.id, st.id, { unit: v })} />
                                      </div>
                                      <TextAreaField label="Описание" value={st.description} onChange={v => updateStep(sec.id, st.id, { description: v })} rows={2} />
                                      <Field label="Формула" value={st.formula} mono
                                        onChange={v => updateStep(sec.id, st.id, { formula: v })}
                                        error={errors.has(`step-formula-${st.id}`)} />
                                      <p className="text-xs text-subtle -mt-1">Python/asteval: q_h = q_day / 24</p>
                                      {st.depends_on.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                          {st.depends_on.map(d => (
                                            <span key={d} className="px-1.5 py-0.5 rounded text-xs font-mono bg-canvas text-subtle">{d}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-line">
                  <div className="flex gap-2">
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
