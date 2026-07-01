import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="animate-spin text-subtle" />
    </div>
  )
  if (!profile?.is_admin) return <Navigate to="/" replace />
  return <>{children}</>
}
