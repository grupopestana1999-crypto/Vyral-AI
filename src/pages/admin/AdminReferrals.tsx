import { useState, useEffect } from 'react'
import { Gift, Users, Coins, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ConversionRow { event_type: string; credits_awarded: number; created_at: string }
interface ReferralRow {
  id: string
  code: string
  link: string
  user_id: string
  created_at: string
  conversions: ConversionRow[]
}

function fmt(n: number) { return n.toLocaleString('pt-BR') }

export function AdminReferrals() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('referral_codes')
        .select('*, referral_conversions(event_type, credits_awarded, created_at)')
        .order('created_at', { ascending: false })
      if (error) console.error('referrals load', error)
      setReferrals((data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        code: r.code as string,
        link: r.link as string,
        user_id: r.user_id as string,
        created_at: r.created_at as string,
        conversions: (r.referral_conversions ?? []) as ConversionRow[],
      })))
      setLoading(false)
    }
    load()
  }, [])

  const totalConversions = referrals.reduce((sum, r) => sum + r.conversions.filter(c => c.event_type === 'paid').length, 0)
  const totalClicks = referrals.reduce((sum, r) => sum + r.conversions.filter(c => c.event_type === 'click').length, 0)
  const totalCredits = referrals.reduce((sum, r) => sum + r.conversions.reduce((s, c) => s + c.credits_awarded, 0), 0)

  const filtered = referrals.filter(r => !search || r.code.toLowerCase().includes(search.toLowerCase()) || r.user_id.includes(search))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
          <Gift size={18} className="text-primary-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">{referrals.length}</p>
          <p className="text-[10px] text-white/40">Códigos gerados</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
          <Users size={18} className="text-blue-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">{totalClicks}</p>
          <p className="text-[10px] text-white/40">Cliques</p>
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

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input type="text" placeholder="Buscar código ou user_id..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum código encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const paid = r.conversions.filter(c => c.event_type === 'paid').length
            const credits = r.conversions.reduce((s, c) => s + c.credits_awarded, 0)
            return (
              <div key={r.id} className="bg-surface-300 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-primary-400">{r.code}</p>
                    <p className="text-xs text-white/30 mt-0.5 font-mono truncate">user: {r.user_id.slice(0, 8)}… · {new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">{paid} pagas / {r.conversions.length} totais</p>
                    <p className="text-xs text-neon">{credits} créditos</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
