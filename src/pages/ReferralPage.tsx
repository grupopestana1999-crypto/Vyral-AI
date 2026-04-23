import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Share2, Users, Coins, Link2, CreditCard, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'
import { REFERRAL_CREDITS } from '../types/credits'
import { toast } from 'sonner'
import type { ReferralCode, ReferralConversion } from '../types/database'

export function ReferralPage() {
  const { user, subscription } = useAuthStore()
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null)
  const [conversions, setConversions] = useState<ReferralConversion[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const planType = subscription?.plan_type ?? 'starter'
  const creditsPerReferral = REFERRAL_CREDITS[planType] ?? 100

  useEffect(() => { load() }, [])

  async function load() {
    if (!user) return
    const { data: codes } = await supabase.from('referral_codes').select('*').eq('user_id', user.id).limit(1).maybeSingle()
    if (codes) {
      setReferralCode(codes)
      const { data: convs } = await supabase.from('referral_conversions').select('*').eq('referral_code_id', codes.id).order('created_at', { ascending: false })
      setConversions(convs ?? [])
    }
    setLoading(false)
  }

  async function generateCode() {
    if (!user) return
    const code = `VYRAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const link = `${window.location.origin}/auth?ref=${code}`
    const { data, error } = await supabase.from('referral_codes').insert({ user_id: user.id, code, link }).select().single()
    if (error) { toast.error('Erro ao gerar código'); return }
    setReferralCode(data)
    toast.success('Código de indicação gerado!')
  }

  function copyLink() {
    if (!referralCode) return
    navigator.clipboard.writeText(referralCode.link)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    if (!referralCode) return
    window.open(`https://wa.me/?text=${encodeURIComponent(`Conheça o Vyral AI, a plataforma de criação de conteúdo UGC com IA pra TikTok Shop! Use meu link: ${referralCode.link}`)}`, '_blank')
  }

  const totalEarned = conversions.reduce((sum, c) => sum + c.credits_awarded, 0)
  const paidConversions = conversions.filter(c => c.event_type === 'paid').length

  const PLANS_TABLE = [
    { name: 'Starter', price: 'R$ 147', credits: 100, color: 'text-amber-400' },
    { name: 'Creator', price: 'R$ 197', credits: 200, color: 'text-primary-400' },
    { name: 'Pro', price: 'R$ 297', credits: 300, color: 'text-neon' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Gift size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Créditos Grátis</h1>
          <p className="text-sm text-white/50">Indique amigos e ganhe créditos por cada conversão paga</p>
        </div>
      </div>

      {/* Card principal — ganhos do plano do usuário */}
      <div className="bg-gradient-to-br from-primary-600/20 to-accent-600/20 border border-primary-500/20 rounded-xl p-6 text-center">
        <Gift size={32} className="text-primary-400 mx-auto mb-3" />
        <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Seu plano atual: <span className="text-primary-400 font-semibold">{planType.charAt(0).toUpperCase() + planType.slice(1)}</span></p>
        <h2 className="text-2xl font-bold text-white mb-1">Ganhe <span className="text-neon">{creditsPerReferral} créditos</span> por indicação</h2>
        <p className="text-sm text-white/60">Quando seu indicado comprar qualquer plano e o pagamento for aprovado, você recebe os créditos automaticamente</p>
      </div>

      {/* Tabela de valores por plano */}
      <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-primary-400" /> Valor por plano do indicador
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {PLANS_TABLE.map(p => {
            const active = p.name.toLowerCase() === planType
            return (
              <div key={p.name} className={`text-center p-3 rounded-lg border ${active ? 'border-primary-500 bg-primary-600/10' : 'border-white/5 bg-surface-400'}`}>
                <p className="text-xs text-white/50">{p.name}</p>
                <p className="text-[10px] text-white/30">{p.price}</p>
                <p className={`text-xl font-bold mt-2 ${p.color}`}>+{p.credits}</p>
                <p className="text-[10px] text-white/40">créditos/indicação</p>
                {active && <span className="text-[9px] text-primary-400 font-bold uppercase">Seu plano</span>}
              </div>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="h-32 bg-surface-300 rounded-xl animate-pulse" />
      ) : !referralCode ? (
        <div className="bg-surface-300 border border-white/5 rounded-xl p-6 text-center">
          <Link2 size={24} className="text-white/30 mx-auto mb-3" />
          <p className="text-sm text-white/50 mb-4">Gere seu link único de indicação para começar</p>
          <button onClick={generateCode} className="px-6 py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all cursor-pointer">
            Gerar Link de Indicação
          </button>
        </div>
      ) : (
        <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-4">
          <p className="text-xs text-white/40 uppercase tracking-wide">Seu link de indicação</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-surface-400 rounded-lg px-4 py-3 text-sm text-white/80 font-mono truncate">
              {referralCode.link}
            </div>
            <button onClick={copyLink} className="px-4 py-3 rounded-lg bg-primary-600 text-white hover:brightness-110 transition-all cursor-pointer">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={shareWhatsApp} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600/20 text-green-400 text-sm font-medium hover:bg-green-600/30 transition-colors cursor-pointer">
              <Share2 size={16} /> WhatsApp
            </button>
            <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600/20 text-primary-400 text-sm font-medium hover:bg-primary-600/30 transition-colors cursor-pointer">
              <Copy size={16} /> Copiar Link
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
          <Users size={18} className="text-primary-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">{conversions.length}</p>
          <p className="text-[10px] text-white/40">Indicações</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
          <Check size={18} className="text-green-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">{paidConversions}</p>
          <p className="text-[10px] text-white/40">Convertidos (pagos)</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
          <Coins size={18} className="text-neon mx-auto mb-2" />
          <p className="text-lg font-bold text-neon">{totalEarned}</p>
          <p className="text-[10px] text-white/40">Créditos ganhos</p>
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard size={16} className="text-primary-400" /> Como funciona
        </h3>
        <div className="space-y-3">
          {[
            { n: 1, title: 'Você compartilha seu link', desc: 'Envie pra amigos, redes sociais, grupos, onde quiser.' },
            { n: 2, title: 'O amigo cadastra e compra um plano', desc: 'O link leva ele pro Vyral AI. Quando ele comprar um dos planos (Starter, Creator ou Pro) e o pagamento for aprovado pela Hotmart, a indicação é convertida.' },
            { n: 3, title: 'Seus créditos caem automaticamente', desc: `${creditsPerReferral} créditos são adicionados ao seu saldo em até 48h após a aprovação do pagamento. Sem limite de indicações.` },
          ].map(step => (
            <div key={step.n} className="flex gap-3">
              <div className="w-7 h-7 shrink-0 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">
                {step.n}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="text-xs text-white/50">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/30 mt-4 pt-3 border-t border-white/5">
          Indicações com suspeita de fraude (mesmo CPF, mesmo IP, padrões atípicos) podem ser invalidadas.
        </p>
      </div>
    </div>
  )
}
