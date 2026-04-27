import { useNavigate } from 'react-router-dom'
import { Zap, Coins, ArrowRight, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/auth-store'
import { BOOSTERS, type BoosterDef } from '../types/boosters'
import { LazyVideo } from '../components/LazyVideo'

function routeFor(b: BoosterDef): string {
  if (b.tool === 'influencer_lab') return '/booster/influencer-lab'
  if (b.tool === 'studio_redirect') return '/influencer'
  return `/booster/${b.slug}`
}

export function BoostersPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  function handleClick(b: BoosterDef) {
    if (b.locked) {
      toast('🔒 Disponível em breve', { description: 'Essa ferramenta está em polimento final. Chega nas próximas semanas.' })
      return
    }
    navigate(routeFor(b))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
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

      <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600/10 to-accent-600/10 border border-primary-500/20 text-xs text-white/80">
        <span className="font-semibold text-neon">{BOOSTERS.length} ferramentas</span> disponíveis — todas integradas via Kie.ai com créditos descontados conforme uso.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {BOOSTERS.map(b => {
          const locked = !!b.locked
          return (
            <button
              key={b.id}
              onClick={() => handleClick(b)}
              className={`group relative aspect-[4/5] bg-surface-300 border rounded-xl overflow-hidden text-left transition-all cursor-pointer ${
                locked ? 'border-white/5 hover:border-white/10' : 'border-white/5 hover:border-primary-500/40'
              }`}
            >
              <div className="absolute inset-0">
                <LazyVideo src={b.videoUrl} className="w-full h-full object-cover" />
              </div>

              {/* Overlay de lock (escuro + blur) */}
              {locked && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <Lock size={24} className="text-white/70" />
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

              {/* Badge canto superior direito */}
              <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 items-end">
                {locked ? (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/90 text-black text-[10px] font-bold">Em breve</span>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/90 text-white text-[10px] font-bold">Disponível agora</span>
                    {b.isFree || b.credits === 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold">FREE</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-primary-600/90 text-white text-[10px] font-bold backdrop-blur">{b.credits} cr</span>
                    )}
                  </>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 z-30">
                <h3 className="text-sm font-bold text-white mb-0.5 truncate">{b.title}</h3>
                <p className="text-[11px] text-white/70 line-clamp-2 mb-2">{b.description}</p>
                {!locked && (
                  <div className="flex items-center gap-1 text-[11px] text-primary-300 font-semibold">
                    Usar <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
