import { Coins, LogOut, Shield } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const { user, subscription, role, signOut } = useAuthStore()
  const navigate = useNavigate()

  const credits = subscription?.credits_remaining ?? 0

  return (
    <header className="h-14 border-b border-white/5 bg-surface-300/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div />

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/credits')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-600/20 border border-primary-500/30 hover:bg-primary-600/30 transition-colors cursor-pointer"
        >
          <Coins size={16} className="text-neon" />
          <span className="text-sm font-semibold text-neon">{credits}</span>
          <span className="text-xs text-white/40">créditos</span>
        </button>

        {role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-lg text-white/40 hover:text-primary-400 hover:bg-white/5 transition-colors cursor-pointer"
            title="Painel Admin"
          >
            <Shield size={18} />
          </button>
        )}

        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <div className="text-right">
            <p className="text-sm text-white/80 leading-tight">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-primary-400 capitalize">
              {subscription?.plan_type ?? 'Sem plano'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
