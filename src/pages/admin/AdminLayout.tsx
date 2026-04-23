import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Coins, Sparkles, FileText, Zap, Gift, Settings, ArrowLeft, Activity, Package, Video, UserCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'

const adminMenu = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Usuários', icon: Users },
  { path: '/admin/credits', label: 'Créditos', icon: Coins },
  { path: '/admin/generations', label: 'Gerações', icon: Sparkles },
  { path: '/admin/viral-products', label: 'Produtos Virais', icon: Package },
  { path: '/admin/viral-videos', label: 'Vídeos Virais', icon: Video },
  { path: '/admin/viral-creators', label: 'Criadores Virais', icon: UserCircle },
  { path: '/admin/templates', label: 'Templates', icon: FileText },
  { path: '/admin/boosters', label: 'Boosters', icon: Zap },
  { path: '/admin/referrals', label: 'Indicações', icon: Gift },
  { path: '/admin/logs', label: 'Logs', icon: Activity },
  { path: '/admin/settings', label: 'Configurações', icon: Settings },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useAuthStore()

  if (role !== 'admin' && role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Acesso negado</h2>
          <p className="text-white/40">Você não tem permissão para acessar esta área</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
          <p className="text-sm text-white/50">Gerencie a plataforma Vyral AI</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {adminMenu.map(item => {
          const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          )
        })}
      </div>

      <Outlet />
    </div>
  )
}
