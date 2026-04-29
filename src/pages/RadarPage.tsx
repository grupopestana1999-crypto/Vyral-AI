import { useNavigate } from 'react-router-dom'
import { Radar, Target, ArrowRight } from 'lucide-react'

export function RadarPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <Radar size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Radar de Oportunidades</h1>
          <p className="text-sm text-white/50">Inteligência viral do TikTok Shop + oportunidades de freela personalizadas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/radar/tiktok')}
          className="group bg-surface-300 border border-white/5 rounded-xl p-6 hover:border-cyan-500/40 transition-all cursor-pointer text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4">
            <Radar size={24} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Tik Tok Shop Radar</h3>
          <p className="text-sm text-white/50 mb-4 leading-relaxed">Explore Produtos Virais, Vídeos Virais e Criadores Virais com dados em tempo real do TikTok Shop.</p>
          <div className="flex items-center gap-1 text-sm text-cyan-400 font-semibold">
            Abrir <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => navigate('/radar/tarefas')}
          className="group bg-surface-300 border border-white/5 rounded-xl p-6 hover:border-purple-500/40 transition-all cursor-pointer text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
            <Target size={24} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Radar de Tarefas Vyral</h3>
          <p className="text-sm text-white/50 mb-4 leading-relaxed">Receba oportunidades de freela personalizadas pra seu nível, tempo e objetivo. Atualizado em tempo real.</p>
          <div className="flex items-center gap-1 text-sm text-purple-400 font-semibold">
            Abrir <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  )
}
