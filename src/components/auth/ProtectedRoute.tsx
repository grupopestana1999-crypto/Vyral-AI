import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth-store'
import { Loader2, Ban } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, subscription, role } = useAuthStore()
  const location = useLocation()

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

  // Bloqueio por reembolso/cancelamento — admin sempre passa
  const isAdmin = role === 'admin' || role === 'super_admin'
  const subStatus = (subscription?.status ?? '').toLowerCase()
  const isBlocked = !isAdmin && (subStatus === 'cancelled' || subStatus === 'refunded' || subStatus === 'expired')

  if (isBlocked && location.pathname !== '/comprar') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-500 px-4">
        <div className="max-w-md w-full bg-surface-300 border border-red-500/30 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto">
            <Ban size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Acesso suspenso</h2>
          <p className="text-sm text-white/70">
            Sua assinatura foi cancelada ou reembolsada. Pra continuar usando o Vyral AI, adquira um novo plano.
          </p>
          <a href="/comprar" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold hover:brightness-110">
            Reativar acesso
          </a>
          <button
            onClick={() => useAuthStore.getState().signOut()}
            className="block w-full text-xs text-white/40 hover:text-white cursor-pointer"
          >
            Sair da conta
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
