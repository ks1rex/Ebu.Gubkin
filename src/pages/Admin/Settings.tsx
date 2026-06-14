import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const API = import.meta.env.VITE_BACKEND_URL as string

interface SiteSettings {
  site: Record<string, string>
  admin: Record<string, string>
}

interface ForumCategory {
  id: string
  name: string
  description: string | null
  icon_name: string | null
  sort_order: number
}

interface CategoryForm {
  name: string
  description: string
  icon_name: string
  sort_order: string
}

const EMPTY_FORM: CategoryForm = { name: '', description: '', icon_name: '', sort_order: '0' }

const ADMIN_SETTING_KEYS = [
  { key: 'gost_token_price',       label: 'Цена ГОСТ-токена (₽)',          type: 'number' },
  { key: 'deposit_commission_pct', label: 'Комиссия с пополнения (%)',      type: 'number' },
  { key: 'referral_bonus_pct',     label: 'Реферальный бонус (%)',          type: 'number' },
  { key: 'referral_max_count',     label: 'Макс. реф. бонусов (шт.)',       type: 'number' },
  { key: 'referral_min_amount',    label: 'Мин. сумма для реф. бонуса (₽)', type: 'number' },
] as const

export default function AdminSettings() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.access_token

  const [loadingSettings, setLoadingSettings] = useState(true)
  const [depositText, setDepositText] = useState('')
  const [adminValues, setAdminValues] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CategoryForm>(EMPTY_FORM)
  const [showNewCatForm, setShowNewCatForm] = useState(false)
  const [newCatForm, setNewCatForm] = useState<CategoryForm>(EMPTY_FORM)
  const [catActing, setCatActing] = useState<Record<string, boolean>>({})

  async function fetchSettings() {
    setLoadingSettings(true)
    try {
      const res = await fetch(`${API}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data: SiteSettings = await res.json()
      setDepositText(data.site?.deposit_instructions ?? data.site?.payment_requisites ?? '')
      const vals: Record<string, string> = {}
      ADMIN_SETTING_KEYS.forEach(({ key }) => {
        vals[key] = data.admin?.[key] ?? ''
      })
      setAdminValues(vals)
    } catch {
      toast('Не удалось загрузить настройки', 'error')
    } finally {
      setLoadingSettings(false)
    }
  }

  async function fetchCategories() {
    setLoadingCats(true)
    try {
      const res = await fetch(`${API}/admin/forum/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : (data.data ?? []))
    } catch {
      toast('Не удалось загрузить категории', 'error')
    } finally {
      setLoadingCats(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchCategories()
  }, [])

  async function saveDepositInstructions() {
    setSavingKey('deposit_instructions')
    try {
      const res = await fetch(`${API}/admin/settings/deposit_instructions`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: depositText }),
      })
      if (!res.ok) throw new Error()
      toast('Реквизиты сохранены', 'success')
    } catch {
      toast('Ошибка при сохранении', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  async function saveAdminSetting(key: string) {
    setSavingKey(key)
    try {
      const res = await fetch(`${API}/admin/admin-settings/${key}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: adminValues[key] }),
      })
      if (!res.ok) throw new Error()
      toast('Настройка сохранена', 'success')
    } catch {
      toast('Ошибка при сохранении', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  async function createCategory() {
    setCatActing(a => ({ ...a, new: true }))
    try {
      const res = await fetch(`${API}/admin/forum/categories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCatForm.name,
          description: newCatForm.description || null,
          icon_name: newCatForm.icon_name || null,
          sort_order: parseInt(newCatForm.sort_order) || 0,
        }),
      })
      if (!res.ok) throw new Error()
      toast('Категория создана', 'success')
      setNewCatForm(EMPTY_FORM)
      setShowNewCatForm(false)
      fetchCategories()
    } catch {
      toast('Ошибка при создании', 'error')
    } finally {
      setCatActing(a => ({ ...a, new: false }))
    }
  }

  async function updateCategory(id: string) {
    setCatActing(a => ({ ...a, [id]: true }))
    try {
      const res = await fetch(`${API}/admin/forum/categories/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          icon_name: editForm.icon_name || null,
          sort_order: parseInt(editForm.sort_order) || 0,
        }),
      })
      if (!res.ok) throw new Error()
      toast('Категория обновлена', 'success')
      setEditingCat(null)
      fetchCategories()
    } catch {
      toast('Ошибка при обновлении', 'error')
    } finally {
      setCatActing(a => ({ ...a, [id]: false }))
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Удалить категорию?')) return
    setCatActing(a => ({ ...a, [id]: true }))
    try {
      const res = await fetch(`${API}/admin/forum/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast('Категория удалена', 'success')
      setCategories(c => c.filter(x => x.id !== id))
    } catch {
      toast('Ошибка при удалении', 'error')
    } finally {
      setCatActing(a => ({ ...a, [id]: false }))
    }
  }

  if (loadingSettings) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-ink">Настройки</h1>

      {/* Section 1: Payment requisites */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink border-b border-line pb-2">Реквизиты оплаты</h2>
        <p className="text-sm text-subtle">Инструкции для пользователей при пополнении кошелька</p>
        <textarea
          value={depositText}
          onChange={e => setDepositText(e.target.value)}
          rows={5}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink bg-canvas focus:outline-none focus:border-accent resize-none"
          placeholder="Введите реквизиты или инструкции..."
        />
        <button
          onClick={saveDepositInstructions}
          disabled={savingKey === 'deposit_instructions'}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {savingKey === 'deposit_instructions' && <Loader2 size={14} className="animate-spin" />}
          Сохранить реквизиты
        </button>
      </section>

      {/* Section 2: Platform parameters */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink border-b border-line pb-2">Параметры платформы</h2>
        <div className="space-y-3">
          {ADMIN_SETTING_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-sm text-subtle w-48 shrink-0">{label}</label>
              <input
                type="number"
                value={adminValues[key] ?? ''}
                onChange={e => setAdminValues(v => ({ ...v, [key]: e.target.value }))}
                className="w-32 border border-line rounded-lg px-3 py-1.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => saveAdminSetting(key)}
                disabled={savingKey === key}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {savingKey === key ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Сохранить
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Forum categories */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-base font-semibold text-ink">Категории форума</h2>
          <button
            onClick={() => { setShowNewCatForm(v => !v); setNewCatForm(EMPTY_FORM) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-panel text-ink transition-colors"
          >
            <Plus size={13} />
            Добавить
          </button>
        </div>

        {showNewCatForm && (
          <div className="bg-panel rounded-xl border border-line p-4 space-y-3">
            <h3 className="text-sm font-medium text-ink">Новая категория</h3>
            <CategoryFormFields form={newCatForm} onChange={setNewCatForm} />
            <div className="flex gap-2">
              <button
                onClick={createCategory}
                disabled={catActing['new'] || !newCatForm.name.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {catActing['new'] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Создать
              </button>
              <button
                onClick={() => setShowNewCatForm(false)}
                className="px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-surface text-ink transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {loadingCats ? (
          <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-subtle" /></div>
        ) : (
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="bg-surface rounded-xl border border-line p-4">
                {editingCat === cat.id ? (
                  <div className="space-y-3">
                    <CategoryFormFields form={editForm} onChange={setEditForm} />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateCategory(cat.id)}
                        disabled={catActing[cat.id] || !editForm.name.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      >
                        {catActing[cat.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Сохранить
                      </button>
                      <button
                        onClick={() => setEditingCat(null)}
                        className="px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-panel text-ink transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-ink text-sm flex items-center gap-2">
                        {cat.icon_name && <span className="text-subtle">[{cat.icon_name}]</span>}
                        {cat.name}
                        <span className="text-xs text-subtle">#{cat.sort_order}</span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-subtle mt-0.5">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingCat(cat.id)
                          setEditForm({
                            name: cat.name,
                            description: cat.description ?? '',
                            icon_name: cat.icon_name ?? '',
                            sort_order: String(cat.sort_order),
                          })
                        }}
                        className="p-1.5 rounded-lg hover:bg-panel text-subtle hover:text-ink transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        disabled={catActing[cat.id]}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-subtle hover:text-error transition-colors disabled:opacity-50"
                      >
                        {catActing[cat.id] ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-subtle text-center py-6">Категорий нет</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function CategoryFormFields({
  form,
  onChange,
}: {
  form: { name: string; description: string; icon_name: string; sort_order: string }
  onChange: (f: { name: string; description: string; icon_name: string; sort_order: string }) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2">
        <label className="block text-xs text-subtle mb-1">Название *</label>
        <input
          type="text"
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-1.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          placeholder="Название категории"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-subtle mb-1">Описание</label>
        <input
          type="text"
          value={form.description}
          onChange={e => onChange({ ...form, description: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-1.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          placeholder="Краткое описание"
        />
      </div>
      <div>
        <label className="block text-xs text-subtle mb-1">Иконка (Lucide)</label>
        <input
          type="text"
          value={form.icon_name}
          onChange={e => onChange({ ...form, icon_name: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-1.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          placeholder="BookOpen"
        />
      </div>
      <div>
        <label className="block text-xs text-subtle mb-1">Порядок сортировки</label>
        <input
          type="number"
          value={form.sort_order}
          onChange={e => onChange({ ...form, sort_order: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-1.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          placeholder="0"
        />
      </div>
    </div>
  )
}
