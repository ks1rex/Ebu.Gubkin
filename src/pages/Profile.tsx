import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react'
import { Save, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { apiCall } from '../lib/api'
import type { Profile as ProfileType } from '../contexts/AuthContext'
import ProfileView, { PublicProfile } from '../components/ProfileView'
import Spinner from '../components/Spinner'
import VipName from '../components/VipBadge'

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
  bio: string
  skills: string[]
}

const INPUT = 'w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { profile, user, refreshProfile, isVip } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing]           = useState(false)
  const [form, setForm]                 = useState<FormState>({ full_name: '', phone: '', telegram_username: '', university_group: '', bio: '', skills: [] })
  const [skillInput, setSkillInput]     = useState('')
  const [avatarFile, setAvatarFile]     = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)

  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null)
  const [publicLoading, setPublicLoading]  = useState(true)

  function fetchPublic() {
    if (!user) return
    setPublicLoading(true)
    apiCall('GET', `/profile/${user.id}/public`)
      .then(setPublicProfile)
      .catch(() => {})
      .finally(() => setPublicLoading(false))
  }

  useEffect(fetchPublic, [user])

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
      bio:               profile!.bio               ?? '',
      skills:            profile!.skills             ?? [],
    })
    setSkillInput('')
    setAvatarFile(null)
    setAvatarPreview(null)
    setEditing(true)
  }

  function addSkill(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const s = skillInput.trim()
    if (!s || form.skills.includes(s)) { setSkillInput(''); return }
    setForm(f => ({ ...f, skills: [...f.skills, s] }))
    setSkillInput('')
  }

  function removeSkill(s: string) {
    setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))
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
    if (form.bio.length > 300) return 'О себе — не больше 300 символов'
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
          bio:               form.bio.trim()                || null,
          skills:            form.skills,
          avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error

      await refreshProfile()
      fetchPublic()
      setEditing(false)
      toast('Профиль сохранён', 'success')
    } catch {
      toast('Ошибка при сохранении', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    if (publicLoading) return <Spinner />
    if (!publicProfile) return <div className="text-error">Не удалось загрузить профиль</div>
    return <ProfileView profile={publicProfile} userId={profile.id} isOwner onEdit={startEditing} />
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">Редактирование профиля</h1>
      </div>

      <div className="bg-surface border border-line rounded-xl overflow-hidden">

        {/* ── Шапка ── */}
        <div className="px-6 py-5 flex items-center gap-4 border-b border-line bg-canvas">
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
            <p className="text-sm font-medium text-ink"><VipName name={profile.nickname ?? profile.full_name ?? 'Студент'} isVip={isVip} /></p>
            <p className="text-xs text-subtle mt-0.5">Нажмите на фото для загрузки</p>
          </div>
        </div>

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

            <div>
              <label className="block text-sm font-medium text-ink mb-1">О себе</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 300) }))}
                placeholder="Пара слов о себе..."
                rows={3}
                className={`${INPUT} resize-none`}
              />
              <p className="text-xs text-subtle mt-1">{form.bio.length}/300</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Навыки</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.skills.map(s => (
                  <span key={s} className="flex items-center gap-1 text-xs text-accent bg-accent-subtle rounded-lg px-2.5 py-1">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="hover:text-error transition-colors">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
                placeholder="Введите навык и нажмите Enter"
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
