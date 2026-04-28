import { useState, useEffect, useCallback } from 'react'
import { Users, Coins, Sparkles, TrendingUp, Activity, Gift, DollarSign, Server, Trophy, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function fmt(n: number) { return (n ?? 0).toLocaleString('pt-BR') }
function fmtBRL(n: number) { return `R$ ${(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtUSD(n: number) { return `US$ ${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d }

interface DashboardData {
  total_users: number
  active_now: number
  generations: { period: number }
  revenue: { period: number; total: number }
  cost_apis: { period: number }
  credits_consumed: { period: number }
  referrals_paid: number
  top_boosters: { tool_name: string; uses: number }[]
  period: { from: string; to: string }
}

const PRESETS: { label: string; from: () => Date; to: () => Date }[] = [
  { label: 'Hoje', from: () => new Date(), to: () => new Date() },
  { label: '7 dias', from: () => daysAgo(6), to: () => new Date() },
  { label: '30 dias', from: () => daysAgo(29), to: () => new Date() },
  { label: 'Mês atual', from: () => { const d = new Date(); d.setDate(1); return d }, to: () => new Date() },
  { label: 'Total', from: () => new Date('2025-01-01'), to: () => new Date() },
]

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => isoDate(daysAgo(29)))
  const [to, setTo] = useState(() => isoDate(new Date()))
  const [preset, setPreset] = useState('30 dias')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: res, error } = await supabase.rpc('admin_dashboard_v2', { p_from: from, p_to: to })
    if (error) console.error(error)
    setData(res as DashboardData | null)
    setLoading(false)
  }, [from, to])

  useEffect(() => { load() }, [load])

  function applyPreset(p: typeof PRESETS[number]) {
    setPreset(p.label)
    setFrom(isoDate(p.from()))
    setTo(isoDate(p.to()))
  }

  return (
    <div className="space-y-5">
      {/* Filtro de período */}
      <div className="bg-surface-300 border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-primary-400" />
          <p className="text-xs font-medium text-white/60">Período de análise</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                preset === p.label ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white border border-white/10'
              }`}>{p.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="text-white/40">De:</label>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset('') }}
            className="px-2 py-1 bg-surface-400 border border-white/10 rounded text-white focus:outline-none focus:border-primary-500" />
          <label className="text-white/40">Até:</label>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset('') }}
            className="px-2 py-1 bg-surface-400 border border-white/10 rounded text-white focus:outline-none focus:border-primary-500" />
        </div>
      </div>

      {/* Linha 1: principais (sempre time-real, ignoram período) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card icon={Users} label="Total de Usuários" value={fmt(data?.total_users ?? 0)} color="text-blue-400" loading={loading} />
        <Card icon={Activity} label="Online Agora (15min)" value={fmt(data?.active_now ?? 0)} color="text-green-400" loading={loading} />
        <Card icon={Sparkles} label="Gerações no período" value={fmt(data?.generations?.period ?? 0)} color="text-purple-400" loading={loading} />
      </div>

      {/* Linha 2: receita + custo (período) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MultiCard title="Receita de Planos" icon={DollarSign} color="text-neon" loading={loading}
          items={[
            { label: 'Período', value: fmtBRL(data?.revenue?.period ?? 0) },
            { label: 'Total geral', value: fmtBRL(data?.revenue?.total ?? 0) },
          ]} />
        <Card icon={Server} label="Custo APIs (Kie + Gemini est.) — período" value={fmtUSD(data?.cost_apis?.period ?? 0)} color="text-orange-400" loading={loading} />
      </div>

      {/* Linha 3: créditos + referrals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card icon={Coins} label="Créditos consumidos no período" value={fmt(data?.credits_consumed?.period ?? 0)} color="text-neon" loading={loading} />
        <Card icon={Gift} label="Referrals Pagos (total)" value={fmt(data?.referrals_paid ?? 0)} color="text-pink-400" loading={loading} />
      </div>

      {/* Top boosters */}
      <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-yellow-400" />
          <h3 className="text-sm font-semibold text-white">Top 3 Boosters do período</h3>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-surface-400 rounded animate-pulse" />)}</div>
        ) : !data?.top_boosters?.length ? (
          <p className="text-xs text-white/40">Sem dados de uso no período selecionado.</p>
        ) : (
          <ol className="space-y-2">
            {data.top_boosters.map((b, i) => (
              <li key={b.tool_name} className="flex items-center justify-between bg-surface-400 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-700/20 text-orange-400'}`}>{i + 1}</span>
                  <span className="text-sm text-white">{b.tool_name}</span>
                </div>
                <span className="text-sm font-semibold text-neon">{fmt(b.uses)} usos</span>
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
        <div className="grid grid-cols-2 gap-2">{items.map(i => <div key={i.label} className="h-12 bg-surface-400 rounded animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
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
