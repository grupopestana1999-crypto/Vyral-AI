import { useState, useEffect } from 'react'
import { Users, Coins, Sparkles, TrendingUp, Clock, Gift } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtCurrency(n: number) { return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

interface Stats {
  total_users: number
  active_subscriptions: number
  total_generations_today: number
  total_revenue: number
  pending_videos: number
  total_referrals: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('get_admin_dashboard_stats')
      if (data) setStats(data as Stats)
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total de Usuários', value: stats?.total_users ?? 0, icon: Users, color: 'text-blue-400', format: fmt },
    { label: 'Assinaturas Ativas', value: stats?.active_subscriptions ?? 0, icon: TrendingUp, color: 'text-green-400', format: fmt },
    { label: 'Gerações Hoje', value: stats?.total_generations_today ?? 0, icon: Sparkles, color: 'text-purple-400', format: fmt },
    { label: 'Receita Total', value: stats?.total_revenue ?? 0, icon: Coins, color: 'text-neon', format: fmtCurrency },
    { label: 'Vídeos Pendentes', value: stats?.pending_videos ?? 0, icon: Clock, color: 'text-orange-400', format: fmt },
    { label: 'Referrals Pagos', value: stats?.total_referrals ?? 0, icon: Gift, color: 'text-pink-400', format: fmt },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-surface-300 border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${card.color}`}>
                <Icon size={20} />
              </div>
              <p className="text-sm text-white/50">{card.label}</p>
            </div>
            {loading ? (
              <div className="h-8 bg-surface-400 rounded animate-pulse" />
            ) : (
              <p className={`text-2xl font-bold ${card.color}`}>{card.format(card.value)}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
