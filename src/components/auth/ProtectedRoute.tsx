import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth-store'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-500">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
