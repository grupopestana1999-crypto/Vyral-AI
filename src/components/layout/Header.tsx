import { Coins, LogOut, Shield } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const { user, subscription, role, signOut } = useAuthStore()
  const navigate = useNavigate()

  const credits = subscription?.credits_remaining ?? 0

  return (
    <header className="h-14 border-b border-white/5 bg-surface-300/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 min-w-0">
      <div />

      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={() => navigate('/credits')}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-primary-600/20 border border-primary-500/30 hover:bg-primary-600/30 transition-colors cursor-pointer flex-shrink-0"
        >
          <Coins size={16} className="text-neon" />
          <span className="text-sm font-semibold text-neon">{credits}</span>
          <span className="text-xs text-white/40 hidden sm:inline">créditos</span>
        </button>

        {role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-lg text-white/40 hover:text-primary-400 hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
            title="Painel Admin"
          >
            <Shield size={18} />
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3 sm:pl-3 sm:border-l border-white/10 min-w-0">
          <div className="text-right hidden sm:block min-w-0">
            <p className="text-sm text-white/80 leading-tight truncate max-w-[160px]">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-primary-400 capitalize">
              {subscription?.plan_type ?? 'Sem plano'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
