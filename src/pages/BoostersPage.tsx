import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Coins, ArrowRight, Lock, X, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/auth-store'
import { BOOSTERS, type BoosterDef } from '../types/boosters'
import { LazyVideo } from '../components/LazyVideo'
import { canAccessBooster } from '../types/credits'

function routeFor(b: BoosterDef): string {
  if (b.tool === 'influencer_lab') return '/booster/influencer-lab'
  if (b.tool === 'studio_redirect') return '/influencer'
  return `/booster/${b.slug}`
}

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  creator: 'Creator',
  pro: 'Pro',
}

const PLAN_COLOR: Record<string, string> = {
  starter: 'bg-emerald-500/90 text-white',
  creator: 'bg-blue-500/90 text-white',
  pro: 'bg-purple-500/90 text-white',
}

export function BoostersPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0
  const userPlan = subscription?.plan_type ?? null

  const [upgradeModal, setUpgradeModal] = useState<BoosterDef | null>(null)

  function handleClick(b: BoosterDef) {
    if (b.locked) {
      toast('🔒 Em desenvolvimento', { description: b.emptyStateText ?? 'Em breve.' })
      return
    }
    if (b.minPlan && !canAccessBooster(userPlan, b.minPlan)) {
      setUpgradeModal(b)
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
        <span className="font-semibold text-neon">{BOOSTERS.length} ferramentas</span> · Plano atual: <span className="font-semibold text-neon uppercase">{userPlan ?? '—'}</span> · Créditos descontados conforme uso (ou por segundo, em vídeos).
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {BOOSTERS.map(b => {
          const locked = !!b.locked
          const planLocked = !!b.minPlan && !canAccessBooster(userPlan, b.minPlan)
          const overlay = locked || planLocked
          return (
            <button
              key={b.id}
              onClick={() => handleClick(b)}
              className={`group relative aspect-[4/5] bg-surface-300 border rounded-xl overflow-hidden text-left transition-all cursor-pointer ${
                overlay ? 'border-white/5 hover:border-white/10' : 'border-white/5 hover:border-primary-500/40'
              }`}
            >
              <div className="absolute inset-0">
                <LazyVideo src={b.videoUrl} className="w-full h-full object-cover" />
              </div>

              {overlay && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    {planLocked ? <Crown size={22} className="text-yellow-400" /> : <Lock size={24} className="text-white/70" />}
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

              <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 items-end">
                {locked ? (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/90 text-black text-[10px] font-bold">Em breve</span>
                ) : planLocked && b.minPlan ? (
                  <span className={`px-2 py-0.5 rounded-full ${PLAN_COLOR[b.minPlan]} text-[10px] font-bold uppercase`}>{PLAN_LABEL[b.minPlan]}+</span>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/90 text-white text-[10px] font-bold">Disponível</span>
                    {b.isFree || b.credits === 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold">FREE</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-primary-600/90 text-white text-[10px] font-bold backdrop-blur">{b.pricingHint ?? `${b.credits} cr`}</span>
                    )}
                  </>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 z-30">
                <h3 className="text-sm font-bold text-white mb-0.5 truncate">{b.title}</h3>
                <p className="text-[11px] text-white/70 line-clamp-2 mb-2">{b.description}</p>
                {!overlay && (
                  <div className="flex items-center gap-1 text-[11px] text-primary-300 font-semibold">
                    Usar <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
                {planLocked && b.minPlan && (
                  <div className="flex items-center gap-1 text-[11px] text-yellow-300 font-semibold">
                    Fazer upgrade <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {upgradeModal && (
        <UpgradeModal booster={upgradeModal} onClose={() => setUpgradeModal(null)} onUpgrade={() => { setUpgradeModal(null); navigate('/credits') }} />
      )}
    </div>
  )
}

function UpgradeModal({ booster, onClose, onUpgrade }: { booster: BoosterDef; onClose: () => void; onUpgrade: () => void }) {
  const requiredPlan = PLAN_LABEL[booster.minPlan ?? 'creator']
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface-300 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
              <Crown size={20} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{booster.title}</h2>
              <p className="text-xs text-white/50">Disponível no plano <span className="font-semibold text-yellow-300">{requiredPlan}</span> ou superior</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 cursor-pointer"><X size={16} className="text-white/60" /></button>
        </div>

        <p className="text-sm text-white/70 leading-relaxed">{booster.description}</p>

        <div className="bg-surface-400 border border-white/5 rounded-lg p-3 text-xs text-white/60">
          Pra desbloquear, faça upgrade pro plano <span className="font-semibold text-white">{requiredPlan}</span>. Você mantém todos os créditos atuais e ganha acesso aos boosters mais avançados.
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-surface-400 border border-white/10 text-white text-sm font-medium hover:bg-white/5 cursor-pointer">Agora não</button>
          <button onClick={onUpgrade} className="flex-1 py-2.5 rounded-lg bg-neon text-surface-500 text-sm font-bold hover:brightness-110 cursor-pointer flex items-center justify-center gap-1.5">
            <Crown size={14} /> Fazer Upgrade
          </button>
        </div>
      </div>
    </div>
  )
}
