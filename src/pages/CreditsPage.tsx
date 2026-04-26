import { Coins, Zap, Check, CreditCard } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { CREDIT_PACKAGES, CUSTOM_PACKAGE_RATE, PLANS } from '../types/credits'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { buildHotmartCheckoutUrl, type HotmartPlan } from '../lib/hotmart'
import { useState } from 'react'

function fmtCurrency(n: number) { return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

export function CreditsPage() {
  const { subscription, user } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0
  const total = subscription?.credits_total ?? 0
  const [customQty, setCustomQty] = useState(100)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  const customPrice = Math.ceil(customQty / CUSTOM_PACKAGE_RATE.credits) * CUSTOM_PACKAGE_RATE.price

  async function handlePurchase(packageId: string, _credits: number, price: number) {
    if (!user) return
    setPurchasing(packageId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': token,
        },
        body: JSON.stringify({ package_name: packageId, credits: _credits, amount_brl: price }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) {
        toast.error(data?.error || `Erro ${r.status}`)
        return
      }
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('Checkout não retornou URL válida')
      }
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setPurchasing(null)
    }
  }

  function handleUpgradePlan(planKey: string) {
    if (!(planKey in { starter: 1, creator: 1, pro: 1 })) return
    const url = buildHotmartCheckoutUrl(planKey as HotmartPlan)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Coins size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Comprar Créditos</h1>
          <p className="text-sm text-white/50">Recarregue seus créditos para continuar gerando</p>
        </div>
      </div>

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

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Upgrade de plano</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(PLANS).map(([key, plan]) => {
            const isCurrent = subscription?.plan_type === key
            return (
              <div key={key} className={`bg-surface-300 border rounded-xl p-5 text-center ${isCurrent ? 'border-primary-500' : 'border-white/5'}`}>
                <h4 className="text-sm font-semibold text-white mb-1">{plan.name}</h4>
                <p className="text-2xl font-bold text-white">{fmtCurrency(plan.price)}</p>
                <p className="text-xs text-white/40 mb-3">{plan.credits} créditos</p>
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-1 text-primary-400 text-sm"><Check size={14} /> Plano atual</div>
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
