import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function GostLayout() {
  const { profile } = useAuth()
  if (!profile?.is_admin) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 text-subtle">
        ГОСТ-калькулятор временно недоступен. В разработке.
      </div>
    )
  }
  return <Outlet />
}
