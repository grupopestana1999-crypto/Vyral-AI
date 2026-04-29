import { useNavigate } from 'react-router-dom'
import { Package, Video, UserCircle, ArrowLeft, ArrowRight, Radar } from 'lucide-react'

interface RadarOption {
  title: string
  description: string
  icon: typeof Package
  route: string
  gradient: string
}

const OPTIONS: RadarOption[] = [
  {
    title: 'Produtos Virais',
    description: 'Top produtos do TikTok Shop com revenue, vendas e categoria',
    icon: Package,
    route: '/viral-products',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    title: 'Vídeos Virais',
    description: 'Vídeos com maior performance + insights de hook, dor, CTA',
    icon: Video,
    route: '/viral-videos',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Criadores Virais',
    description: 'Top creators com seguidores, engajamento e revenue projetado',
    icon: UserCircle,
    route: '/viral-creators',
    gradient: 'from-blue-500 to-cyan-500',
  },
]

export function RadarTiktokPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <Radar size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Tik Tok Shop Radar</h1>
          <p className="text-sm text-white/50">Explore as 3 frentes de inteligência viral do TikTok Shop</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {OPTIONS.map(opt => {
          const Icon = opt.icon
          return (
            <button
              key={opt.title}
              onClick={() => navigate(opt.route)}
              className="group bg-surface-300 border border-white/5 rounded-xl p-5 hover:border-primary-500/40 transition-all cursor-pointer text-left"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center mb-3`}>
                <Icon size={24} className="text-white" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">{opt.title}</h3>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">{opt.description}</p>
              <div className="flex items-center gap-1 text-xs text-primary-400 font-semibold">
                Abrir <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
