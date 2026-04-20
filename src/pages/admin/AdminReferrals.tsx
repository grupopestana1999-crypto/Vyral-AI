import { useState, useEffect } from 'react'
import { Gift, Users, Coins } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ReferralRow {
  id: string
  code: string
  link: string
  created_at: string
  conversions: { event_type: string; credits_awarded: number; created_at: string }[]
}

function fmt(n: number) { return n.toLocaleString('pt-BR') }

export function AdminReferrals() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('referral_codes').select('*, referral_conversions(*)').order('created_at', { ascending: false })
      setReferrals((data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        code: r.code as string,
        link: r.link as string,
        created_at: r.created_at as string,
        conversions: (r.referral_conversions ?? []) as ReferralRow['conversions'],
      })))
      setLoading(false)
    }
    load()
  }, [])

  const totalConversions = referrals.reduce((sum, r) => sum + r.conversions.filter(c => c.event_type === 'paid').length, 0)
  const totalCredits = referrals.reduce((sum, r) => sum + r.conversions.reduce((s, c) => s + c.credits_awarded, 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
          <Gift size={18} className="text-primary-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">{referrals.length}</p>
          <p className="text-[10px] text-white/40">Códigos gerados</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
          <Users size={18} className="text-green-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">{totalConversions}</p>
          <p className="text-[10px] text-white/40">Conversões pagas</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
          <Coins size={18} className="text-neon mx-auto mb-2" />
          <p className="text-lg font-bold text-neon">{fmt(totalCredits)}</p>
          <p className="text-[10px] text-white/40">Créditos concedidos</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : referrals.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum código de indicação gerado</p>
      ) : (
        <div className="space-y-2">
          {referrals.map(r => (
            <div key={r.id} className="bg-surface-300 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono text-primary-400">{r.code}</p>
                  <p className="text-xs text-white/30 mt-0.5">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white">{r.conversions.length} indicações</p>
                  <p className="text-xs text-neon">{r.conversions.reduce((s, c) => s + c.credits_awarded, 0)} créditos</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
