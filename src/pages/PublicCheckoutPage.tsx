import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Check, Sparkles, Zap, Crown } from 'lucide-react'
import logoImg from '../assets/logo.png'
import { HOTMART_OFFERS, type HotmartPlan } from '../lib/hotmart'

const REF_PATTERN = /^VYRAL-[A-Z0-9]{6}$/

const PLANS: { id: HotmartPlan; label: string; tagline: string; icon: React.ReactNode; color: string; bg: string; popular?: boolean; benefits: string[] }[] = [
  {
    id: 'starter',
    label: 'Starter',
    tagline: 'Comece do zero',
    icon: <Sparkles size={20} className="text-amber-400" />,
    color: 'border-amber-500/30',
    bg: 'from-amber-500/5 to-amber-500/0',
    benefits: ['300 créditos', 'Studio IA + Boosters', 'Suporte por email', 'Acesso vitalício'],
  },
  {
    id: 'creator',
    label: 'Creator',
    tagline: 'Mais escolhido',
    icon: <Zap size={20} className="text-primary-400" />,
    color: 'border-primary-500/40',
    bg: 'from-primary-600/10 to-accent-600/5',
    popular: true,
    benefits: ['600 créditos', 'Tudo do Starter', 'Templates ilimitados', 'Suporte prioritário'],
  },
  {
    id: 'pro',
    label: 'Pro',
    tagline: 'Pra escalar pesado',
    icon: <Crown size={20} className="text-neon" />,
    color: 'border-neon/40',
    bg: 'from-neon/5 to-emerald-500/0',
    benefits: ['1500 créditos', 'Tudo do Creator', 'Múltiplas contas', 'Suporte 1-a-1'],
  },
]

export function PublicCheckoutPage() {
  const [params] = useSearchParams()
  const [referralCode, setReferralCode] = useState<string | null>(null)

  useEffect(() => {
    const ref = params.get('ref')
    if (ref && REF_PATTERN.test(ref)) {
      setReferralCode(ref)
      try { localStorage.setItem('vyral_ref', ref) } catch { /* ignore */ }
    }
  }, [params])

  function checkoutUrl(plan: HotmartPlan): string {
    const base = HOTMART_OFFERS[plan].url
    const sep = base.includes('?') ? '&' : '?'
    return referralCode ? `${base}${sep}sck=${encodeURIComponent(referralCode)}` : base
  }

  return (
    <div className="min-h-dvh bg-surface-500 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block">
            <img src={logoImg} alt="Vyral AI" className="h-14 mx-auto mb-3" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Crie conteúdo viral pra TikTok Shop com IA</h1>
          <p className="text-white/60 mt-2 max-w-2xl mx-auto">
            Influencers virtuais, vídeos UGC ultra-realistas e produtos virais minerados. Escolha seu plano e comece agora.
          </p>
          {referralCode && (
            <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-primary-600/10 border border-primary-500/30 text-xs text-primary-300">
              <Sparkles size={12} />
              <span>Indicado pelo código <span className="font-bold">{referralCode}</span></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {PLANS.map(plan => {
            const offer = HOTMART_OFFERS[plan.id]
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 ${plan.color} bg-gradient-to-b ${plan.bg} bg-surface-300 p-6 flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wide">
                    Mais popular
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  {plan.icon}
                  <h3 className="text-lg font-bold text-white">{plan.label}</h3>
                </div>
                <p className="text-xs text-white/50 mb-4">{plan.tagline}</p>

                <div className="mb-5">
                  <p className="text-3xl font-bold text-white">R$ {offer.price}</p>
                  <p className="text-[11px] text-white/40">pagamento único</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.benefits.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-white/80">
                      <Check size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={checkoutUrl(plan.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full py-3 rounded-xl text-center font-bold text-sm transition-all cursor-pointer ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:brightness-110'
                      : 'bg-surface-400 text-white border border-white/10 hover:bg-surface-200'
                  }`}
                >
                  Comprar {plan.label}
                </a>
                <p className="text-[10px] text-center text-white/30 mt-2">Pagamento seguro via Hotmart</p>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-8 space-y-2">
          <p className="text-xs text-white/40">7 dias de garantia incondicional · Cancele quando quiser</p>
          <p className="text-xs text-white/30">
            Já tem conta? <Link to="/auth" className="text-primary-400 hover:underline">Faça login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
