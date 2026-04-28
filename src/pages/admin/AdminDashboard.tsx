import { useState, useEffect } from 'react'
import { Users, Coins, Sparkles, TrendingUp, Activity, Gift, DollarSign, Server, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function fmt(n: number) { return (n ?? 0).toLocaleString('pt-BR') }
function fmtBRL(n: number) { return `R$ ${(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtUSD(n: number) { return `US$ ${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

interface DashboardData {
  total_users: number
  active_now: number
  generations_today: number
  revenue: { today: number; month: number; total: number }
  cost_apis: { today: number; month: number }
  credits_consumed: { today: number; month: number }
  referrals_paid: number
  top_boosters: { tool_name: string; count: number }[]
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: res, error } = await supabase.rpc('admin_dashboard_v2')
    if (error) console.error(error)
    setData(res as DashboardData | null)
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      {/* Linha 1: principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card icon={Users} label="Total de Usuários" value={fmt(data?.total_users ?? 0)} color="text-blue-400" loading={loading} />
        <Card icon={Activity} label="Online Agora (15min)" value={fmt(data?.active_now ?? 0)} color="text-green-400" loading={loading} />
        <Card icon={Sparkles} label="Gerações Hoje" value={fmt(data?.generations_today ?? 0)} color="text-purple-400" loading={loading} />
      </div>

      {/* Linha 2: receita + custo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MultiCard title="Receita de Planos" icon={DollarSign} color="text-neon" loading={loading}
          items={[
            { label: 'Hoje', value: fmtBRL(data?.revenue?.today ?? 0) },
            { label: 'Mês', value: fmtBRL(data?.revenue?.month ?? 0) },
            { label: 'Total', value: fmtBRL(data?.revenue?.total ?? 0) },
          ]} />
        <MultiCard title="Custo APIs (Kie + Gemini est.)" icon={Server} color="text-orange-400" loading={loading}
          items={[
            { label: 'Hoje', value: fmtUSD(data?.cost_apis?.today ?? 0) },
            { label: 'Mês', value: fmtUSD(data?.cost_apis?.month ?? 0) },
          ]} />
      </div>

      {/* Linha 3: créditos + referrals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MultiCard title="Créditos Consumidos" icon={Coins} color="text-neon" loading={loading}
          items={[
            { label: 'Hoje', value: fmt(data?.credits_consumed?.today ?? 0) },
            { label: 'Mês', value: fmt(data?.credits_consumed?.month ?? 0) },
          ]} />
        <Card icon={Gift} label="Referrals Pagos" value={fmt(data?.referrals_paid ?? 0)} color="text-pink-400" loading={loading} />
      </div>

      {/* Linha 4: top boosters */}
      <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-yellow-400" />
          <h3 className="text-sm font-semibold text-white">Top 3 Boosters do mês</h3>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-surface-400 rounded animate-pulse" />)}</div>
        ) : !data?.top_boosters?.length ? (
          <p className="text-xs text-white/40">Sem dados ainda neste mês.</p>
        ) : (
          <ol className="space-y-2">
            {data.top_boosters.map((b, i) => (
              <li key={b.tool_name} className="flex items-center justify-between bg-surface-400 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-700/20 text-orange-400'}`}>{i + 1}</span>
                  <span className="text-sm text-white">{b.tool_name}</span>
                </div>
                <span className="text-sm font-semibold text-neon">{fmt(b.count)} usos</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function Card({ icon: Icon, label, value, color, loading }: { icon: typeof Users; label: string; value: string; color: string; loading: boolean }) {
  return (
    <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${color}`}><Icon size={20} /></div>
        <p className="text-sm text-white/50">{label}</p>
      </div>
      {loading ? <div className="h-8 bg-surface-400 rounded animate-pulse" /> : <p className={`text-2xl font-bold ${color}`}>{value}</p>}
    </div>
  )
}

function MultiCard({ title, icon: Icon, color, loading, items }: { title: string; icon: typeof TrendingUp; color: string; loading: boolean; items: { label: string; value: string }[] }) {
  return (
    <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${color}`}><Icon size={20} /></div>
        <p className="text-sm text-white/50">{title}</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-3 gap-2">{items.map(i => <div key={i.label} className="h-12 bg-surface-400 rounded animate-pulse" />)}</div>
      ) : (
        <div className={`grid gap-2 ${items.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {items.map(i => (
            <div key={i.label} className="bg-surface-400 rounded-lg p-2 text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-wide">{i.label}</p>
              <p className={`text-sm font-bold ${color} mt-0.5`}>{i.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
