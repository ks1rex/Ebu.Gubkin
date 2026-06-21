import { ReactNode } from 'react'
import { AuthContext, Profile } from '../src/contexts/AuthContext'
import type { User, Session } from '@supabase/supabase-js'

const FAKE_PROFILE: Profile = {
  id: 'preview-user',
  email: 'student@gubkin.ru',
  nickname: 'student42',
  full_name: 'Иван Студентов',
  avatar_url: null,
  phone: null,
  telegram_username: null,
  university_group: 'ХТ-21-1',
  balance: 1500,
  token_balance: 30,
  is_admin: true,
  referral_code: 'ab12cd34',
  referral_earnings: 0,
  referral_registered_count: 0,
  referral_qualifying_deposits_count: 0,
}

const FAKE_USER = { id: 'preview-user', email: FAKE_PROFILE.email } as User
const FAKE_SESSION = { user: FAKE_USER, access_token: 'preview-token' } as Session

// Preview-only fake AuthProvider — supplies a static context value directly
// (no real AuthProvider, no Supabase calls) so auth-coupled components can
// render in a design preview without hitting production.
export function PreviewAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        session: FAKE_SESSION,
        user: FAKE_USER,
        profile: FAKE_PROFILE,
        loading: false,
        signUp: async () => ({ error: null }),
        signIn: async () => ({ error: null }),
        signOut: async () => {},
        refreshProfile: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
