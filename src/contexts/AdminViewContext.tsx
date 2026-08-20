import { createContext, useContext, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'admin_view_as_admin'

interface AdminViewContextValue {
  /** true у владельца в обычном режиме; false у рядового админа ИЛИ у
   * владельца, включившего «Смотреть как админ» (демо-режим, чистый UI-фильтр
   * — реальные вызовы API от владельца в этом режиме всё равно проходят). */
  effectiveIsOwner: boolean
  viewAsAdmin: boolean
  setViewAsAdmin: (v: boolean) => void
}

const AdminViewContext = createContext<AdminViewContextValue | null>(null)

export function AdminViewProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [viewAsAdmin, setViewAsAdminState] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === '1',
  )

  function setViewAsAdmin(v: boolean) {
    setViewAsAdminState(v)
    sessionStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  }

  const effectiveIsOwner = !!profile?.is_owner && !viewAsAdmin

  return (
    <AdminViewContext.Provider value={{ effectiveIsOwner, viewAsAdmin, setViewAsAdmin }}>
      {children}
    </AdminViewContext.Provider>
  )
}

export function useAdminView() {
  const ctx = useContext(AdminViewContext)
  if (!ctx) throw new Error('useAdminView must be used within AdminViewProvider')
  return ctx
}
