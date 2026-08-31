import { useEffect, useState } from 'react'
import { apiCall } from '../lib/api'

const CUSTOM = '__custom__'

const CLS = {
  label: 'block text-slate-400 text-[0.82rem] mb-1.5',
  input: 'w-full bg-[#0f1923] border border-[#1e3a4a] rounded-lg py-[10px] px-3 text-slate-200 text-[0.95rem] box-border',
}

interface Props {
  value: string
  onChange: (v: string) => void
  className?: string
}

// Категория заказа/услуги — не FK, обычный текст (см. reshbirga docs/schema.md).
// "Своя категория" отправляет заказ/услугу сразу с введённым названием — оно
// уходит на модерацию (ИИ или админ) отдельно и не блокирует создание, см.
// backend/src/utils/marketCategories.js.
export default function CategorySelect({ value, onChange, className }: Props) {
  const [categories, setCategories] = useState<string[]>([])
  const [custom, setCustom] = useState(false)

  useEffect(() => {
    apiCall('GET', '/listings/categories')
      .then(data => setCategories(Array.isArray(data?.categories) ? data.categories.map((c: any) => typeof c === 'string' ? c : c.name) : []))
      .catch(() => {})
  }, [])

  // Если пришло начальное значение, которого нет в списке (редактирование
  // заказа с ещё не одобренной категорией) — сразу показываем поле ввода.
  useEffect(() => {
    if (value && categories.length && !categories.includes(value)) setCustom(true)
  }, [value, categories])

  if (!categories.length && !custom) return null

  return (
    <div className={className}>
      <label className={CLS.label}>Категория</label>
      {custom ? (
        <input
          className={CLS.input}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Название новой категории"
          maxLength={60}
          autoFocus
        />
      ) : (
        <select
          className={CLS.input}
          value={categories.includes(value) ? value : ''}
          onChange={e => {
            if (e.target.value === CUSTOM) { setCustom(true); onChange(''); return }
            onChange(e.target.value)
          }}
        >
          <option value="">Не выбрана</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
          <option value={CUSTOM}>+ Своя категория...</option>
        </select>
      )}
      {custom && (
        <div className="text-slate-500 text-[0.76rem] mt-1">
          Новая категория уходит на модерацию — заказ/услуга создастся с ней сразу.
        </div>
      )}
    </div>
  )
}
