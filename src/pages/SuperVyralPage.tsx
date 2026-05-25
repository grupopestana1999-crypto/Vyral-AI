import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, ArrowRight, Wand2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { toast } from 'sonner'
import { SUPER_VYRAL_WORKFLOWS, LAB_PRELOAD_KEY, type SuperVyralWorkflow } from '../lib/superVyralWorkflows'

// E54: Super Vyral = galeria de workflows prontos. Escolher um carrega o arranjo de nodes
// no Influencer Lab (via sessionStorage), pronto pra rodar. Substitui o step-runner antigo.
export function SuperVyralPage() {
  const navigate = useNavigate()
  const { subscription, dailyQuota } = useAuthStore()
  const isUnlimited = !!(dailyQuota?.unlimited ?? subscription?.unlimited_daily)

  function useWorkflow(wf: SuperVyralWorkflow) {
    try {
      const built = wf.build()
      sessionStorage.setItem(LAB_PRELOAD_KEY, JSON.stringify(built))
      toast.success(`"${wf.title}" carregando no Lab…`)
      navigate('/booster/influencer-lab')
    } catch {
      toast.error('Não consegui carregar o workflow. Tente de novo.')
    }
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Super Vyral</h1>
            <p className="text-sm text-white/50">Workflows prontos pra produção em massa. Escolha um, ele abre montado no Lab — você só sobe sua imagem e gera cada etapa.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SUPER_VYRAL_WORKFLOWS.map(wf => (
          <button
            key={wf.id}
            onClick={() => useWorkflow(wf)}
            className="group bg-surface-300 border border-white/5 rounded-xl p-5 hover:border-violet-500/40 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{wf.emoji}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">{wf.title}</h3>
                <p className="text-[11px] text-violet-300/80 font-medium">{wf.chain}</p>
              </div>
            </div>
            <p className="text-xs text-white/60 mb-4 leading-relaxed">{wf.description}</p>
            <div className="flex items-center gap-1 text-[11px] text-violet-400 font-semibold">
              <Wand2 size={12} /> Usar no Lab <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      <div className="bg-surface-300 border border-white/5 rounded-xl p-5 text-sm text-white/70">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Como funciona</p>
        <ol className="space-y-2 list-decimal list-inside text-[13px]">
          <li>Escolha um workflow acima — ele abre montado no Influencer Lab</li>
          <li>Suba sua imagem no node "Imagem" (ela alimenta todas as etapas conectadas)</li>
          <li>Clique em gerar em cada node pra produzir as variações em massa</li>
          <li>Baixe os resultados direto de cada node</li>
        </ol>
        <div className="bg-surface-400/50 border border-white/5 rounded-lg p-3 text-[12px] mt-3">
          <p className="text-white/60 leading-relaxed">
            <span className="text-amber-300 font-medium">Dica:</span> dá pra editar o workflow no Lab — adicionar mais etapas, trocar conexões, ou apagar nodes. O que você escolher aqui é só o ponto de partida.
            {isUnlimited && ' Seu plano é ilimitado: respeite só a cota diária por tipo.'}
          </p>
        </div>
      </div>
    </div>
  )
}
