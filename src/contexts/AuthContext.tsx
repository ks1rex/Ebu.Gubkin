import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  email: string
  nickname: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  telegram_username: string | null
  university_group: string | null
  balance: number
  token_balance: number
  is_admin: boolean
  referral_code: string | null
  referral_earnings: number | null
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, nickname: string, refCode?: string | null) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select(`
      id, email, nickname, full_name, avatar_url,
      phone, telegram_username, university_group,
      balance, token_balance, is_admin,
      referral_code, referral_earnings
    `)
    .eq('id', userId)
    .single()
  return data ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null)
  const [user, setUser]         = useState<User | null>(null)
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).then(setProfile).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).then(setProfile)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, nickname: string, refCode?: string | null) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // nickname и ref_code передаются в метаданных — триггер handle_new_user
        // читает их при создании профиля (ref_code → referred_by).
        data: { nickname, ...(refCode ? { ref_code: refCode } : {}) },
      },
    })
    if (error) return { error }

    // Профиль создаётся автоматически триггером handle_new_user на auth.users.
    // Триггер также устанавливает nickname из raw_user_meta_data.
    // См. reshbirga/supabase/migrations-ebu/008_handle_new_user.sql

    return { error: null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) setProfile(await loadProfile(user.id))
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
