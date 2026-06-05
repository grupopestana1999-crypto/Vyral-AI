import { Coins, Zap, Check, CreditCard, Image as ImageIcon, Film, Activity, Mic, FileText } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { CREDIT_PACKAGES, CUSTOM_PACKAGE_RATE, PLANS } from '../types/credits'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { buildHotmartCheckoutUrl, type HotmartPlan } from '../lib/hotmart'
import { useState } from 'react'

function fmtCurrency(n: number) { return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

// E64: cota diária por plano — mesmos números do backend (`app_settings.plan_quotas`).
const PLAN_QUOTAS: Record<string, { image: number; video: number; motion: number }> = {
  starter: { image: 50,  video: 15, motion: 10 },
  creator: { image: 100, video: 20, motion: 15 },
  pro:     { image: 150, video: 25, motion: 20 },
}

export function CreditsPage() {
  const { subscription, user, dailyQuota } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0
  const total = subscription?.credits_total ?? 0
  const isUnlimited = !!(dailyQuota?.unlimited ?? subscription?.unlimited_daily) // E53
  const [customQty, setCustomQty] = useState(100)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  const customPrice = Math.ceil(customQty / CUSTOM_PACKAGE_RATE.credits) * CUSTOM_PACKAGE_RATE.price

  async function handlePurchase(packageId: string, _credits: number, price: number) {
    if (!user) return
    setPurchasing(packageId)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { package_name: packageId, credits: _credits, amount_brl: price },
      })
      if (error) {
        toast.error('Erro ao iniciar checkout: ' + error.message)
        setPurchasing(null)
        return
      }
      const checkoutUrl = (data as { url?: string; error?: string } | null)?.url
      if ((data as { error?: string } | null)?.error) {
        toast.error((data as { error: string }).error)
        setPurchasing(null)
        return
      }
      if (!checkoutUrl) {
        toast.error('Checkout não retornou URL válida')
        setPurchasing(null)
        return
      }
      // Redireciona pra Stripe na mesma aba (window.open após await é bloqueado como popup)
      window.location.href = checkoutUrl
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
      setPurchasing(null)
    }
  }

  function handleUpgradePlan(planKey: string) {
    if (!(planKey in { starter: 1, creator: 1, pro: 1 })) return
    const url = buildHotmartCheckoutUrl(planKey as HotmartPlan)
    window.location.href = url
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Coins size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{isUnlimited ? 'Seu plano' : 'Comprar Créditos'}</h1>
          <p className="text-sm text-white/50">{isUnlimited ? 'Geração ilimitada com cota diária renovável' : 'Recarregue seus créditos para continuar gerando'}</p>
        </div>
      </div>

      {isUnlimited ? (
        // E53: modelo cota diária — mostra "Créditos ilimitados" + contadores de uso do dia
        <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide">Seu acesso</p>
              <p className="text-3xl font-bold text-neon">Créditos ilimitados</p>
              <p className="text-xs text-white/30">Cotas diárias renovam a cada 24h</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Plano</p>
              <p className="text-sm font-semibold text-primary-400 capitalize">{subscription?.plan_type ?? 'Nenhum'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Imagens', q: dailyQuota?.image },
              { label: 'Vídeos', q: dailyQuota?.video },
              { label: 'Imitar Movimento', q: dailyQuota?.motion },
            ].map(item => {
              const used = item.q?.used ?? 0
              const limit = item.q?.limit ?? 0
              const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
              const maxed = used >= limit && limit > 0
              return (
                <div key={item.label} className="bg-surface-400/50 rounded-lg p-3">
                  <p className="text-[11px] text-white/50 mb-1">{item.label}</p>
                  <p className={`text-lg font-bold ${maxed ? 'text-red-400' : 'text-white'}`}>{used}<span className="text-xs text-white/40"> / {limit} hoje</span></p>
                  <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
                    <div className={`h-full ${maxed ? 'bg-red-400' : 'bg-neon'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-white/40">Clonagem de voz e transcrição (ElevenLabs) são ilimitados. Quando uma cota diária zera, é só aguardar a renovação em 24h.</p>
        </div>
      ) : (
      <div className="bg-surface-300 border border-white/5 rounded-xl p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide">Saldo atual</p>
          <p className="text-3xl font-bold text-neon">{credits}</p>
          <p className="text-xs text-white/30">de {total} créditos totais</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Plano</p>
          <p className="text-sm font-semibold text-primary-400 capitalize">{subscription?.plan_type ?? 'Nenhum'}</p>
        </div>
      </div>
      )}

      {!isUnlimited && (<>
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Pacotes de créditos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CREDIT_PACKAGES.map(pkg => (
            <div key={pkg.id} className="bg-surface-300 border border-white/5 rounded-xl p-5 flex flex-col hover:border-primary-500/30 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-primary-400" />
                <h4 className="text-sm font-semibold text-white">{pkg.name}</h4>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{pkg.credits}</p>
              <p className="text-xs text-white/40 mb-4">créditos</p>
              <div className="mt-auto">
                <p className="text-lg font-bold text-neon mb-3">{fmtCurrency(pkg.price)}</p>
                <button
                  onClick={() => handlePurchase(pkg.id, pkg.credits, pkg.price)}
                  disabled={purchasing === pkg.id}
                  className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard size={14} />
                  {purchasing === pkg.id ? 'Processando...' : 'Comprar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-300 border border-white/5 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Pacote personalizado</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs text-white/50 mb-2 block">Quantidade de créditos</label>
            <input
              type="number"
              min={100}
              step={100}
              value={customQty}
              onChange={e => setCustomQty(Math.max(100, Number(e.target.value)))}
              className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
            <p className="text-[10px] text-white/30 mt-1">A cada 100 créditos = {fmtCurrency(CUSTOM_PACKAGE_RATE.price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">Total</p>
            <p className="text-xl font-bold text-neon">{fmtCurrency(customPrice)}</p>
          </div>
          <button
            onClick={() => handlePurchase('custom', customQty, customPrice)}
            disabled={purchasing === 'custom'}
            className="px-6 py-2.5 rounded-lg bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
          >
            {purchasing === 'custom' ? 'Processando...' : 'Comprar'}
          </button>
        </div>
      </div>
      </>)}

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Planos disponíveis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(PLANS).map(([key, plan]) => {
            const isCurrent = subscription?.plan_type === key
            const q = PLAN_QUOTAS[key] ?? PLAN_QUOTAS.starter
            return (
              <div key={key} className={`bg-surface-300 border rounded-xl p-5 flex flex-col ${isCurrent ? 'border-primary-500 ring-1 ring-primary-500/30' : 'border-white/5'}`}>
                <div className="text-center mb-4">
                  <h4 className="text-sm font-semibold text-white">{plan.name}</h4>
                  <p className="text-2xl font-bold text-white mt-1">{fmtCurrency(plan.price)}</p>
                </div>
                <ul className="space-y-2 text-xs text-white/70 mb-4 flex-1">
                  <li className="flex items-center gap-2"><ImageIcon size={13} className="text-primary-400 shrink-0" /> <strong className="text-white">{q.image}</strong> imagens/dia</li>
                  <li className="flex items-center gap-2"><Film size={13} className="text-primary-400 shrink-0" /> <strong className="text-white">{q.video}</strong> vídeos/dia</li>
                  <li className="flex items-center gap-2"><Activity size={13} className="text-primary-400 shrink-0" /> <strong className="text-white">{q.motion}</strong> imitar movimento/dia</li>
                  <li className="flex items-center gap-2 pt-1.5 border-t border-white/5 mt-2"><Mic size={11} className="text-white/40 shrink-0" /> Voz <span className="text-white/40">— ilimitado</span></li>
                  <li className="flex items-center gap-2"><FileText size={11} className="text-white/40 shrink-0" /> Transcrição <span className="text-white/40">— ilimitada</span></li>
                </ul>
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-1 py-2 text-primary-400 text-sm font-medium"><Check size={14} /> Seu plano</div>
                ) : (
                  <button
                    onClick={() => handleUpgradePlan(key)}
                    className="w-full py-2 rounded-lg bg-primary-600/20 text-primary-400 text-sm font-medium hover:bg-primary-600/30 transition-colors cursor-pointer"
                  >
                    Fazer upgrade
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
