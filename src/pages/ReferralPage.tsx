import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Share2, Users, Coins } from 'lucide-react'
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
    window.open(`https://wa.me/?text=${encodeURIComponent(`Conheça o Vyral AI! Use meu link: ${referralCode.link}`)}`, '_blank')
  }

  const totalEarned = conversions.reduce((sum, c) => sum + c.credits_awarded, 0)
  const paidConversions = conversions.filter(c => c.event_type === 'paid').length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Gift size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Créditos Grátis</h1>
          <p className="text-sm text-white/50">Indique amigos e ganhe créditos</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary-600/20 to-accent-600/20 border border-primary-500/20 rounded-xl p-6 text-center">
        <Gift size={32} className="text-primary-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Ganhe {creditsPerReferral} créditos por indicação</h2>
        <p className="text-sm text-white/50">Quando seu indicado comprar qualquer plano, você recebe os créditos automaticamente</p>
      </div>

      {loading ? (
        <div className="h-32 bg-surface-300 rounded-xl animate-pulse" />
      ) : !referralCode ? (
        <div className="bg-surface-300 border border-white/5 rounded-xl p-6 text-center">
          <p className="text-sm text-white/50 mb-4">Gere seu link de indicação para começar</p>
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
          <p className="text-[10px] text-white/40">Convertidos</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
          <Coins size={18} className="text-neon mx-auto mb-2" />
          <p className="text-lg font-bold text-neon">{totalEarned}</p>
          <p className="text-[10px] text-white/40">Créditos ganhos</p>
        </div>
      </div>
    </div>
  )
}
