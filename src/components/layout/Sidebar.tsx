import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Video,
  Users,
  Sparkles,
  Zap,
  FileText,
  Calculator,
  Gift,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
import { useState } from 'react'
import logoImg from '../../assets/logo.png'

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/viral-products', label: 'Produtos Virais', icon: ShoppingBag },
  { path: '/viral-videos', label: 'Vídeos Virais', icon: Video },
  { path: '/viral-creators', label: 'Criadores Virais', icon: Users },
  { path: '/influencer', label: 'Studio IA', icon: Sparkles },
  { path: '/booster', label: 'Boosters', icon: Zap },
  { path: '/templates', label: 'Templates', icon: FileText },
  { path: '/calculator', label: 'Calculadora', icon: Calculator },
  { path: '/referral', label: 'Créditos Grátis', icon: Gift },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-surface-300 border-r border-white/5 flex flex-col z-40 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
        <img src={logoImg} alt="Vyral AI" className={`shrink-0 ${collapsed ? 'w-8 h-8' : 'h-10'} object-contain`} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-white/40 hover:text-white/80 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neon text-surface-500 font-semibold text-sm hover:brightness-110 transition-all cursor-pointer">
          <Download size={16} />
          {!collapsed && <span>Instalar</span>}
        </button>
        {!collapsed && (
          <p className="text-center text-xs text-white/20 mt-3">
            &copy; 2026 Vyral AI
          </p>
        )}
      </div>
    </aside>
  )
}
