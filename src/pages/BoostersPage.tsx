import { Zap, Coins, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { TOOL_CREDITS, TOOL_LABELS } from '../types/credits'

const BOOSTERS = [
  { id: 'grok_video', path: '/booster/grok', desc: 'Transforme imagens em vídeos com IA', videoUrl: '' },
  { id: 'edit_image', path: '/booster/edit-image', desc: 'Substitua objetos em imagens com IA', videoUrl: '' },
  { id: 'prompt_generator', path: '/booster/prompt', desc: 'Gere prompts estruturados e otimizados', videoUrl: '' },
  { id: 'nano_banana_pro', path: '/booster/nano-banana', desc: 'Gere imagens via prompt de texto', videoUrl: '' },
  { id: 'nano_banana_2', path: '/booster/nano-banana-2', desc: 'Geração avançada com referência + contexto', videoUrl: '' },
  { id: 'veo_video', path: '/booster/veo', desc: 'Vídeos ultra-realistas com áudio nativo', videoUrl: '' },
  { id: 'motion_control', path: '/booster/motion', desc: 'Controle de movimento de personagens', videoUrl: '' },
  { id: 'human_engine', path: '/booster/human-engine', desc: 'Extração e replicação de movimentos', videoUrl: '' },
  { id: 'avatar_builder', path: '/booster/avatar', desc: 'Crie influencers virtuais ultra-realistas', videoUrl: '' },
  { id: 'kling_3', path: '/booster/kling', desc: 'Vídeos cinematográficos com áudio', videoUrl: '' },
  { id: 'skin_enhancer', path: '/booster/skin', desc: 'Aprimoramento de textura de pele', videoUrl: '' },
  { id: 'sora_remover', path: '/booster/sora', desc: 'Remoção de marca d\'água de vídeos Sora', videoUrl: '' },
]

export function BoostersPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Boosters</h1>
            <p className="text-sm text-white/50">Ferramentas premium de IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-600/20 border border-primary-500/30">
          <Coins size={16} className="text-neon" />
          <span className="text-sm font-semibold text-neon">{credits}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BOOSTERS.map(b => {
          const key = b.id as keyof typeof TOOL_CREDITS
          const cost = TOOL_CREDITS[key]
          const label = TOOL_LABELS[b.id] ?? b.id
          const isFree = cost === 0

          return (
            <button
              key={b.id}
              onClick={() => navigate(b.path)}
              className="bg-surface-300 border border-white/5 rounded-xl p-5 text-left hover:border-primary-500/30 transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600/30 to-accent-600/30 flex items-center justify-center">
                  <Zap size={18} className="text-primary-400" />
                </div>
                {isFree ? (
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">FREE</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400 text-[10px] font-bold">{cost} créditos</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{label}</h3>
              <p className="text-xs text-white/40 mb-3">{b.desc}</p>
              <div className="flex items-center gap-1 text-xs text-primary-400 group-hover:text-primary-300 transition-colors">
                <span>Usar</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
