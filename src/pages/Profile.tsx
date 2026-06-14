import { useState, useRef, ChangeEvent } from 'react'
import { User, Mail, Phone, AtSign, Users, MessageCircle, Edit3, Save, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import type { Profile as ProfileType } from '../contexts/AuthContext'

// ─── Phone mask ──────────────────────────────────────────────────────────────

function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const local = digits.startsWith('7') || digits.startsWith('8')
    ? digits.slice(1, 11)
    : digits.slice(0, 10)
  if (!local) return ''
  let r = '+7 ('
  r += local.slice(0, Math.min(3, local.length))
  if (local.length >= 3) r += ') ' + local.slice(3, Math.min(6, local.length))
  if (local.length >= 6) r += '-' + local.slice(6, Math.min(8, local.length))
  if (local.length >= 8) r += '-' + local.slice(8, 10)
  return r
}

function isValidPhone(phone: string): boolean {
  const d = phone.replace(/\D/g, '')
  return d.length === 11 && (d.startsWith('7') || d.startsWith('8'))
}

// ─── Avatar upload ────────────────────────────────────────────────────────────

async function uploadAvatar(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) return null
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

// ─── Avatar display ───────────────────────────────────────────────────────────

interface AvatarProps {
  profile: ProfileType
  preview?: string | null
  size?: 'sm' | 'lg'
}

function Avatar({ profile, preview, size = 'lg' }: AvatarProps) {
  const sz = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-base'
  const letter = (profile.nickname ?? profile.full_name ?? profile.email)?.[0]?.toUpperCase() ?? '?'
  const src = preview ?? profile.avatar_url

  return src ? (
    <img src={src} alt="" className={`${sz} rounded-full object-cover border-2 border-line shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-accent text-white font-semibold flex items-center justify-center border-2 border-accent/20 shrink-0`}>
      {letter}
    </div>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  full_name: string
  phone: string
  telegram_username: string
  university_group: string
}

const INPUT = 'w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing]           = useState(false)
  const [form, setForm]                 = useState<FormState>({ full_name: '', phone: '', telegram_username: '', university_group: '' })
  const [avatarFile, setAvatarFile]     = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  function startEditing() {
    setForm({
      full_name:         profile!.full_name         ?? '',
      phone:             profile!.phone             ?? '',
      telegram_username: profile!.telegram_username ?? '',
      university_group:  profile!.university_group  ?? '',
    })
    setAvatarFile(null)
    setAvatarPreview(null)
    setEditing(true)
  }

  function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleTelegramChange(value: string) {
    const v = value && !value.startsWith('@') ? '@' + value : value
    setForm(f => ({ ...f, telegram_username: v }))
  }

  function validate(): string | null {
    if (!form.full_name.trim()) return 'Введите имя'
    if (form.phone && !isValidPhone(form.phone)) return 'Некорректный формат телефона'
    if (form.telegram_username && !form.telegram_username.startsWith('@')) return 'Telegram должен начинаться с @'
    return null
  }

  async function handleSave() {
    if (!profile) return
    const err = validate()
    if (err) { toast(err, 'error'); return }

    setSaving(true)
    try {
      let avatar_url = profile.avatar_url

      if (avatarFile && user) {
        const url = await uploadAvatar(avatarFile, user.id)
        if (!url) { toast('Ошибка загрузки аватара', 'error'); return }
        avatar_url = url
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:         form.full_name.trim()         || null,
          phone:             form.phone                    || null,
          telegram_username: form.telegram_username        || null,
          university_group:  form.university_group.trim()  || null,
          avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error

      await refreshProfile()
      setEditing(false)
      toast('Профиль сохранён', 'success')
    } catch {
      toast('Ошибка при сохранении', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── View fields ──
  const VIEW_FIELDS = [
    { icon: AtSign,        label: 'Никнейм',   value: profile.nickname          },
    { icon: User,          label: 'Имя',        value: profile.full_name         },
    { icon: Mail,          label: 'Email',       value: profile.email             },
    { icon: Phone,         label: 'Телефон',     value: profile.phone             },
    { icon: MessageCircle, label: 'Telegram',    value: profile.telegram_username },
    { icon: Users,         label: 'Группа',      value: profile.university_group  },
  ]

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">Профиль</h1>
        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent-subtle transition-colors"
          >
            <Edit3 size={14} />
            Редактировать
          </button>
        )}
      </div>

      <div className="bg-surface border border-line rounded-xl overflow-hidden">

        {/* ── Шапка ── */}
        <div className="px-6 py-5 flex items-center gap-4 border-b border-line bg-canvas">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative group shrink-0"
                title="Загрузить фото"
              >
                <Avatar profile={profile} preview={avatarPreview} />
                <div className="absolute inset-0 rounded-full bg-ink/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-[10px] font-semibold leading-tight text-center px-1">Изменить</span>
                </div>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
              <div>
                <p className="text-sm font-medium text-ink">{profile.nickname ?? profile.full_name ?? 'Студент'}</p>
                <p className="text-xs text-subtle mt-0.5">Нажмите на фото для загрузки</p>
              </div>
            </>
          ) : (
            <>
              <Avatar profile={profile} />
              <div>
                <p className="text-lg font-semibold text-ink">
                  {profile.nickname ?? profile.full_name ?? 'Студент'}
                </p>
                <p className="text-sm text-subtle">{profile.email}</p>
                {profile.is_admin && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-accent-subtle text-accent text-xs font-medium rounded">
                    Администратор
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Баланс (только в режиме просмотра) ── */}
        {!editing && (
          <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-line">
            <div>
              <p className="text-xs text-subtle mb-0.5">Баланс</p>
              <p className="text-lg font-semibold text-ink">{(profile.balance ?? 0).toLocaleString('ru-RU')} ₸</p>
            </div>
            <div>
              <p className="text-xs text-subtle mb-0.5">ГОСТ-токены</p>
              <p className="text-lg font-semibold text-ink">{(profile.token_balance ?? 0).toLocaleString('ru-RU')}</p>
            </div>
          </div>
        )}

        {/* ── Режим просмотра ── */}
        {!editing && (
          <div className="divide-y divide-line">
            {VIEW_FIELDS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-6 py-3.5">
                <Icon size={15} className="text-subtle shrink-0" />
                <span className="text-sm text-subtle w-24 shrink-0">{label}</span>
                {value ? (
                  <span className="text-sm text-ink">{value}</span>
                ) : (
                  <span className="text-sm text-subtle italic">не указано</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Режим редактирования ── */}
        {editing && (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Имя <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Иван Иванов"
                className={INPUT}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className={`${INPUT} opacity-60 cursor-not-allowed`}
              />
              <p className="text-xs text-subtle mt-1">Email меняется через настройки аккаунта Supabase Auth</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Телефон</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: applyPhoneMask(e.target.value) }))}
                placeholder="+7 (___) ___-__-__"
                className={INPUT}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Telegram</label>
              <input
                type="text"
                value={form.telegram_username}
                onChange={e => handleTelegramChange(e.target.value)}
                placeholder="@username"
                className={INPUT}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Учебная группа</label>
              <input
                type="text"
                value={form.university_group}
                onChange={e => setForm(f => ({ ...f, university_group: e.target.value }))}
                placeholder="ИВТ-21-1"
                className={INPUT}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-line text-ink text-sm font-medium rounded-lg hover:bg-panel transition-colors"
              >
                <X size={14} />
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
