import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, Check, Eye, EyeOff, Upload, X } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { apiCall } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { ICONS } from '../Forum'
import TwoFactor from './TwoFactor'

// Прозрачные line-иконки lucide (та же карта ICONS, что рендерит форум) —
// имя ключа и есть icon_name, который уходит в БД.
const ICON_PRESETS = Object.keys(ICONS)

interface SiteSettings {
  site: Record<string, string>
  admin: Record<string, string>
}

interface ForumCategory {
  id: string
  name: string
  description: string | null
  icon_name: string | null
  icon_url: string | null
  sort_order: number
  is_active: boolean
}

interface CategoryForm {
  name: string
  description: string
  icon_name: string
  sort_order: string
}

const EMPTY_FORM: CategoryForm = { name: '', description: '', icon_name: '', sort_order: '0' }

interface MarketCategory {
  id: string
  name: string
  icon: string | null
  sort_order: number
}

interface MarketCategoryForm {
  name: string
  icon: string
  sort_order: string
}

const EMPTY_MARKET_FORM: MarketCategoryForm = { name: '', icon: '', sort_order: '0' }

interface AdminSettingKey {
  key: string
  label: string
  // 'text' — для настроек, которые не одно число (список процентов по уровням)
  type: 'number' | 'text'
  placeholder?: string
  hint?: string
}

const ADMIN_SETTING_GROUPS: { title: string; keys: AdminSettingKey[] }[] = [
  {
    title: 'Общее',
    keys: [
      { key: 'gost_token_price',    label: 'Цена ГОСТ-токена (₽)',          type: 'number' },
      { key: 'referral_bonus_pct',  label: 'Реферальный бонус (%)',          type: 'number' },
      { key: 'referral_max_count',  label: 'Макс. реф. бонусов (шт.)',       type: 'number' },
      { key: 'referral_min_amount', label: 'Мин. сумма для реф. бонуса (₽)', type: 'number' },
    ],
  },
  {
    title: 'Вывод средств',
    keys: [
      { key: 'withdrawal_commission_pct', label: 'Комиссия с вывода (%)', type: 'number' },
    ],
  },
  {
    title: 'VIP',
    keys: [
      { key: 'vip_price_month',         label: 'Цена VIP на месяц (₽)', type: 'number' },
      { key: 'vip_price_year',          label: 'Цена VIP на год (₽)', type: 'number' },
      { key: 'vip_duration_month_days', label: 'Длительность месячного VIP (дней)', type: 'number' },
      { key: 'vip_duration_year_days',  label: 'Длительность годового VIP (дней)', type: 'number' },
      { key: 'vip_token_discount_pct',  label: 'Скидка VIP на ГОСТ-токены (%)', type: 'number' },
      {
        key: 'vip_level_discounts',
        label: 'Скидка на подписку по уровню (%)',
        type: 'text',
        placeholder: '0,10,20,30,40,50,60,70,80,100',
        hint: 'Десять процентов через запятую — по одному на уровень 1…10. Пусто = правило по умолчанию (+10% за уровень, на 10-м бесплатно).',
      },
    ],
  },
  {
    title: 'Лимиты объявлений',
    keys: [
      { key: 'listing_limit_base', label: 'Лимит объявлений (без VIP)', type: 'number' },
      { key: 'listing_limit_vip',  label: 'Лимит объявлений (с VIP)', type: 'number' },
    ],
  },
]

const ADMIN_SETTING_KEYS = ADMIN_SETTING_GROUPS.flatMap(g => g.keys)

export default function AdminSettings() {
  const toast = useToast()
  const { profile } = useAuth()
  const effectiveIsOwner = !!profile?.is_owner

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
  const [uploadingIcon, setUploadingIcon] = useState<string | null>(null)

  const [marketCats, setMarketCats] = useState<MarketCategory[]>([])
  const [loadingMarketCats, setLoadingMarketCats] = useState(false)
  const [editingMarketCat, setEditingMarketCat] = useState<string | null>(null)
  const [marketEditForm, setMarketEditForm] = useState<MarketCategoryForm>(EMPTY_MARKET_FORM)
  const [showNewMarketCatForm, setShowNewMarketCatForm] = useState(false)
  const [newMarketCatForm, setNewMarketCatForm] = useState<MarketCategoryForm>(EMPTY_MARKET_FORM)
  const [marketCatActing, setMarketCatActing] = useState<Record<string, boolean>>({})

  async function fetchSettings() {
    setLoadingSettings(true)
    try {
      const data: SiteSettings = await apiCall('GET', '/admin/settings')
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
      const data = await apiCall('GET', '/admin/forum/categories')
      setCategories(Array.isArray(data) ? data : (data.data ?? []))
    } catch {
      toast('Не удалось загрузить категории', 'error')
    } finally {
      setLoadingCats(false)
    }
  }

  async function fetchMarketCategories() {
    setLoadingMarketCats(true)
    try {
      const data = await apiCall('GET', '/admin/market-categories')
      setMarketCats(Array.isArray(data) ? data : (data.data ?? []))
    } catch {
      toast('Не удалось загрузить категории биржи', 'error')
    } finally {
      setLoadingMarketCats(false)
    }
  }

  useEffect(() => {
    // Разделы 1-3 (реквизиты, платформенные параметры, категории форума)
    // owner-only на бэкенде — рядовому админу их даже не запрашиваем.
    if (!effectiveIsOwner) { setLoadingSettings(false); return }
    fetchSettings()
    fetchCategories()
    fetchMarketCategories()
  }, [effectiveIsOwner])

  async function saveDepositInstructions() {
    setSavingKey('deposit_instructions')
    try {
      await apiCall('PUT', '/admin/settings/deposit_instructions', { value: depositText })
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
      await apiCall('PUT', `/admin/admin-settings/${key}`, { value: adminValues[key] })
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
      await apiCall('POST', '/admin/forum/categories', {
        name: newCatForm.name,
        description: newCatForm.description || null,
        icon_name: newCatForm.icon_name || null,
        sort_order: parseInt(newCatForm.sort_order) || 0,
      })
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
      await apiCall('PATCH', `/admin/forum/categories/${id}`, {
        name: editForm.name,
        description: editForm.description || null,
        icon_name: editForm.icon_name || null,
        sort_order: parseInt(editForm.sort_order) || 0,
      })
      toast('Категория обновлена', 'success')
      setEditingCat(null)
      fetchCategories()
    } catch {
      toast('Ошибка при обновлении', 'error')
    } finally {
      setCatActing(a => ({ ...a, [id]: false }))
    }
  }

  // Скрытие вместо удаления: категория и её темы остаются в базе, но исчезают
  // из форума и из «горячих тем» на главной (фильтр is_active на бэкенде).
  async function toggleCategory(id: string, is_active: boolean) {
    setCatActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('PATCH', `/admin/forum/categories/${id}`, { is_active })
      toast(is_active ? 'Категория показана' : 'Категория скрыта', 'success')
      setCategories(c => c.map(x => x.id === id ? { ...x, is_active } : x))
    } catch {
      toast('Ошибка при обновлении', 'error')
    } finally {
      setCatActing(a => ({ ...a, [id]: false }))
    }
  }

  async function uploadCategoryIcon(id: string, file: File) {
    setUploadingIcon(id)
    try {
      const form = new FormData()
      form.append('file', file)
      const { icon_url } = await apiCall('POST', `/admin/forum/categories/${id}/icon`, form)
      setCategories(c => c.map(x => x.id === id ? { ...x, icon_url } : x))
      toast('Иконка загружена', 'success')
    } catch (e: any) {
      toast(e?.data?.error ?? 'Не удалось загрузить иконку', 'error')
    } finally {
      setUploadingIcon(null)
    }
  }

  async function removeCategoryIcon(id: string) {
    setUploadingIcon(id)
    try {
      await apiCall('PATCH', `/admin/forum/categories/${id}`, { icon_url: null })
      setCategories(c => c.map(x => x.id === id ? { ...x, icon_url: null } : x))
    } catch {
      toast('Не удалось убрать иконку', 'error')
    } finally {
      setUploadingIcon(null)
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Удалить категорию безвозвратно? Чтобы просто убрать её с форума, используйте «Скрыть».')) return
    setCatActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('DELETE', `/admin/forum/categories/${id}`)
      toast('Категория удалена', 'success')
      setCategories(c => c.filter(x => x.id !== id))
    } catch {
      toast('Ошибка при удалении', 'error')
    } finally {
      setCatActing(a => ({ ...a, [id]: false }))
    }
  }

  async function createMarketCategory() {
    setMarketCatActing(a => ({ ...a, new: true }))
    try {
      await apiCall('POST', '/admin/market-categories', {
        name: newMarketCatForm.name,
        icon: newMarketCatForm.icon || null,
        sort_order: parseInt(newMarketCatForm.sort_order) || 0,
      })
      toast('Категория создана', 'success')
      setNewMarketCatForm(EMPTY_MARKET_FORM)
      setShowNewMarketCatForm(false)
      fetchMarketCategories()
    } catch {
      toast('Ошибка при создании', 'error')
    } finally {
      setMarketCatActing(a => ({ ...a, new: false }))
    }
  }

  async function updateMarketCategory(id: string) {
    setMarketCatActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('PATCH', `/admin/market-categories/${id}`, {
        name: marketEditForm.name,
        icon: marketEditForm.icon || null,
        sort_order: parseInt(marketEditForm.sort_order) || 0,
      })
      toast('Категория обновлена', 'success')
      setEditingMarketCat(null)
      fetchMarketCategories()
    } catch {
      toast('Ошибка при обновлении', 'error')
    } finally {
      setMarketCatActing(a => ({ ...a, [id]: false }))
    }
  }

  async function deleteMarketCategory(id: string) {
    if (!confirm('Удалить категорию безвозвратно?')) return
    setMarketCatActing(a => ({ ...a, [id]: true }))
    try {
      await apiCall('DELETE', `/admin/market-categories/${id}`)
      toast('Категория удалена', 'success')
      setMarketCats(c => c.filter(x => x.id !== id))
    } catch {
      toast('Ошибка при удалении', 'error')
    } finally {
      setMarketCatActing(a => ({ ...a, [id]: false }))
    }
  }

  if (!effectiveIsOwner) {
    return (
      <div className="space-y-8 max-w-7xl">
        <h1 className="text-xl font-semibold text-ink">Настройки</h1>
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink border-b border-line pb-2">Безопасность</h2>
          <p className="text-sm text-subtle">Двухфакторная аутентификация для вашего аккаунта администратора</p>
          <TwoFactor />
        </section>
      </div>
    )
  }

  if (loadingSettings) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-subtle" /></div>
  }

  return (
    <div className="space-y-8 max-w-7xl">
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
      <section className="space-y-5">
        <h2 className="text-base font-semibold text-ink border-b border-line pb-2">Параметры платформы</h2>
        {ADMIN_SETTING_GROUPS.map(group => (
          <div key={group.title} className="space-y-3">
            <h3 className="text-sm font-medium text-subtle">{group.title}</h3>
            {group.keys.map(({ key, label, type, placeholder, hint }) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-subtle w-56 shrink-0">{label}</label>
                  <input
                    type={type}
                    value={adminValues[key] ?? ''}
                    placeholder={placeholder}
                    onChange={e => setAdminValues(v => ({ ...v, [key]: e.target.value }))}
                    className={`${type === 'text' ? 'w-72 font-mono' : 'w-32'} border border-line rounded-lg px-3 py-1.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent`}
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
                {hint && <p className="text-xs text-subtle pl-[15rem]">{hint}</p>}
              </div>
            ))}
          </div>
        ))}
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
              <div key={cat.id} className={`bg-surface rounded-xl border border-line p-4 ${cat.is_active === false ? 'opacity-60' : ''}`}>
                {editingCat === cat.id ? (
                  <div className="space-y-3">
                    <CategoryFormFields form={editForm} onChange={setEditForm} />
                    <div>
                      <label className="block text-xs text-subtle mb-1">Своя картинка (вместо иконки)</label>
                      <div className="flex items-center gap-2">
                        {cat.icon_url ? (
                          <img src={cat.icon_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-line" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg border border-line flex items-center justify-center">
                            {(() => { const Icon = ICONS[editForm.icon_name] ?? ICONS.MessagesSquare; return <Icon size={16} /> })()}
                          </div>
                        )}
                        <IconUploadButton
                          uploading={uploadingIcon === cat.id}
                          onFile={file => uploadCategoryIcon(cat.id, file)}
                        />
                        {cat.icon_url && (
                          <button
                            onClick={() => removeCategoryIcon(cat.id)}
                            disabled={uploadingIcon === cat.id}
                            title="Убрать картинку, вернуться к эмодзи"
                            className="p-1.5 rounded-lg hover:bg-error/10 text-subtle hover:text-error transition-colors disabled:opacity-50"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
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
                      <div className="font-medium text-ink text-sm flex items-center gap-2 flex-wrap">
                        {cat.icon_url ? (
                          <img src={cat.icon_url} alt="" className="w-5 h-5 rounded object-cover" />
                        ) : (() => { const Icon = ICONS[cat.icon_name ?? '']; return Icon ? <Icon size={15} className="text-subtle" /> : null })()}
                        {cat.name}
                        <span className="text-xs text-subtle">#{cat.sort_order}</span>
                        {cat.is_active === false && (
                          <span className="px-1.5 py-0.5 bg-panel text-subtle text-xs rounded-full font-medium border border-line">
                            Скрыта
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-subtle mt-0.5">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleCategory(cat.id, cat.is_active === false)}
                        disabled={catActing[cat.id]}
                        title={cat.is_active === false ? 'Показать на форуме' : 'Скрыть с форума (без удаления)'}
                        className="p-1.5 rounded-lg hover:bg-panel text-subtle hover:text-ink transition-colors disabled:opacity-50"
                      >
                        {catActing[cat.id]
                          ? <Loader2 size={14} className="animate-spin" />
                          : cat.is_active === false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
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
                        className="p-1.5 rounded-lg hover:bg-error/10 text-subtle hover:text-error transition-colors disabled:opacity-50"
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

      {/* Section 3b: Market categories (order/listing filters) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-base font-semibold text-ink">Категории биржи</h2>
          <button
            onClick={() => { setShowNewMarketCatForm(v => !v); setNewMarketCatForm(EMPTY_MARKET_FORM) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-panel text-ink transition-colors"
          >
            <Plus size={13} />
            Добавить
          </button>
        </div>
        <p className="text-sm text-subtle">Фильтры заказов и объявлений на бирже (Учёба, Другое и т.д.)</p>

        {showNewMarketCatForm && (
          <div className="bg-panel rounded-xl border border-line p-4 space-y-3">
            <h3 className="text-sm font-medium text-ink">Новая категория</h3>
            <MarketCategoryFormFields form={newMarketCatForm} onChange={setNewMarketCatForm} />
            <div className="flex gap-2">
              <button
                onClick={createMarketCategory}
                disabled={marketCatActing['new'] || !newMarketCatForm.name.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {marketCatActing['new'] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Создать
              </button>
              <button
                onClick={() => setShowNewMarketCatForm(false)}
                className="px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-surface text-ink transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {loadingMarketCats ? (
          <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-subtle" /></div>
        ) : (
          <div className="space-y-2">
            {marketCats.map(cat => (
              <div key={cat.id} className="bg-surface rounded-xl border border-line p-4">
                {editingMarketCat === cat.id ? (
                  <div className="space-y-3">
                    <MarketCategoryFormFields form={marketEditForm} onChange={setMarketEditForm} />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMarketCategory(cat.id)}
                        disabled={marketCatActing[cat.id] || !marketEditForm.name.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      >
                        {marketCatActing[cat.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Сохранить
                      </button>
                      <button
                        onClick={() => setEditingMarketCat(null)}
                        className="px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-panel text-ink transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-ink text-sm flex items-center gap-2 flex-wrap">
                      {(() => { const Icon = ICONS[cat.icon ?? '']; return Icon ? <Icon size={15} className="text-subtle" /> : null })()}
                      {cat.name}
                      <span className="text-xs text-subtle">#{cat.sort_order}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingMarketCat(cat.id)
                          setMarketEditForm({ name: cat.name, icon: cat.icon ?? '', sort_order: String(cat.sort_order) })
                        }}
                        className="p-1.5 rounded-lg hover:bg-panel text-subtle hover:text-ink transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteMarketCategory(cat.id)}
                        disabled={marketCatActing[cat.id]}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-subtle hover:text-error transition-colors disabled:opacity-50"
                      >
                        {marketCatActing[cat.id] ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {marketCats.length === 0 && (
              <p className="text-sm text-subtle text-center py-6">Категорий нет</p>
            )}
          </div>
        )}
      </section>

      {/* Section 4: Security / 2FA */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink border-b border-line pb-2">Безопасность</h2>
        <p className="text-sm text-subtle">Двухфакторная аутентификация для вашего аккаунта администратора</p>
        <TwoFactor />
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
        <label className="block text-xs text-subtle mb-1">Порядок сортировки</label>
        <input
          type="number"
          value={form.sort_order}
          onChange={e => onChange({ ...form, sort_order: e.target.value })}
          className="w-full border border-line rounded-lg px-3 py-1.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent"
          placeholder="0"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-subtle mb-1">Иконка</label>
        <div className="flex flex-wrap gap-1">
          {ICON_PRESETS.map(name => {
            const Icon = ICONS[name]
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => onChange({ ...form, icon_name: name })}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                  form.icon_name === name ? 'border-accent bg-accent/15 text-accent' : 'border-line hover:bg-panel text-subtle'
                }`}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MarketCategoryFormFields({
  form,
  onChange,
}: {
  form: MarketCategoryForm
  onChange: (f: MarketCategoryForm) => void
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
      <div className="col-span-2">
        <label className="block text-xs text-subtle mb-1">Иконка</label>
        <div className="flex flex-wrap gap-1">
          {ICON_PRESETS.map(name => {
            const Icon = ICONS[name]
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => onChange({ ...form, icon: name })}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                  form.icon === name ? 'border-accent bg-accent/15 text-accent' : 'border-line hover:bg-panel text-subtle'
                }`}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function IconUploadButton({ uploading, onFile }: { uploading: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-line rounded-lg hover:bg-panel text-ink transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        Загрузить картинку
      </button>
    </>
  )
}
