import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

const INPUT = 'w-full px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors'

export default function ResetPassword() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [ready,     setReady]     = useState(false)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user lands here via the email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also check if already logged in (session from URL hash)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast('Минимальная длина пароля — 6 символов', 'error'); return }
    if (password !== confirm) { toast('Пароли не совпадают', 'error'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast(error.message ?? 'Ошибка смены пароля', 'error')
    } else {
      toast('Пароль изменён! Выполняем вход...', 'success')
      setTimeout(() => navigate('/'), 1500)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-sm bg-surface border border-line rounded-xl p-8 text-center">
          <p className="text-subtle text-sm">Ожидаем подтверждение ссылки...</p>
          <p className="text-xs text-subtle mt-2">Если вы перешли по ссылке из письма, страница обновится автоматически.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-line rounded-xl p-8">
          <h1 className="text-xl font-semibold text-ink mb-2">Новый пароль</h1>
          <p className="text-sm text-subtle mb-6">Введите новый пароль для вашего аккаунта</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Новый пароль</label>
              <input type="password" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className={INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Подтвердите пароль</label>
              <input type="password" required minLength={6} value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••" className={INPUT} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? 'Сохраняем...' : 'Сохранить пароль'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
