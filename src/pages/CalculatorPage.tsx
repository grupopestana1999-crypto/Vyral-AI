import { useState } from 'react'
import { Calculator, TrendingUp, DollarSign, Users, BarChart3 } from 'lucide-react'

function fmtCurrency(n: number) { return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

export function CalculatorPage() {
  const [accounts, setAccounts] = useState(1)
  const [postsPerDay, setPostsPerDay] = useState(3)
  const [avgViews, setAvgViews] = useState(5000)
  const [conversionRate, setConversionRate] = useState(1)
  const [avgTicket, setAvgTicket] = useState(50)
  const [commissionRate, setCommissionRate] = useState(10)

  const dailySales = accounts * postsPerDay * (avgViews * (conversionRate / 100))
  const dailyRevenue = dailySales * avgTicket * (commissionRate / 100)
  const monthlyRevenue = dailyRevenue * 30

  const scenarios = [
    { label: 'Conservador', multiplier: 0.5, color: 'text-yellow-400' },
    { label: 'Moderado', multiplier: 1, color: 'text-primary-400' },
    { label: 'Otimista', multiplier: 2, color: 'text-green-400' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Calculadora de Escalabilidade</h1>
          <p className="text-sm text-white/50">Simule sua receita potencial</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><BarChart3 size={16} className="text-primary-400" /> Parâmetros</h3>

          {[
            { label: 'Número de contas', value: accounts, set: setAccounts, min: 1, max: 50, icon: <Users size={14} /> },
            { label: 'Postagens por dia', value: postsPerDay, set: setPostsPerDay, min: 1, max: 20, icon: <TrendingUp size={14} /> },
            { label: 'Média de views por post', value: avgViews, set: setAvgViews, min: 100, max: 100000, step: 500, icon: <BarChart3 size={14} /> },
            { label: 'Taxa de conversão (%)', value: conversionRate, set: setConversionRate, min: 0.1, max: 10, step: 0.1, icon: <TrendingUp size={14} /> },
            { label: 'Ticket médio (R$)', value: avgTicket, set: setAvgTicket, min: 10, max: 500, step: 5, icon: <DollarSign size={14} /> },
            { label: 'Comissão (%)', value: commissionRate, set: setCommissionRate, min: 1, max: 50, icon: <DollarSign size={14} /> },
          ].map(input => (
            <div key={input.label}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-white/50 flex items-center gap-1.5">{input.icon} {input.label}</label>
                <span className="text-sm font-semibold text-primary-400">{typeof input.value === 'number' && input.value % 1 !== 0 ? input.value.toFixed(1) : input.value}</span>
              </div>
              <input
                type="range"
                min={input.min}
                max={input.max}
                step={input.step ?? 1}
                value={input.value}
                onChange={e => input.set(Number(e.target.value))}
                className="w-full accent-primary-500"
              />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary-600/20 to-accent-600/20 border border-primary-500/20 rounded-xl p-6 text-center">
            <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Receita Mensal Estimada</p>
            <p className="text-3xl font-bold text-neon">{fmtCurrency(monthlyRevenue)}</p>
            <p className="text-xs text-white/40 mt-1">{fmtCurrency(dailyRevenue)}/dia</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {scenarios.map(s => (
              <div key={s.label} className="bg-surface-300 border border-white/5 rounded-xl p-4 text-center">
                <p className="text-[10px] text-white/40 uppercase mb-1">{s.label}</p>
                <p className={`text-sm font-bold ${s.color}`}>{fmtCurrency(monthlyRevenue * s.multiplier)}</p>
                <p className="text-[10px] text-white/30">/mês</p>
              </div>
            ))}
          </div>

          <div className="bg-surface-300 border border-white/5 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-white/60">Detalhamento diário</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/40">Total de posts/dia</span><span className="text-white">{accounts * postsPerDay}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Alcance total/dia</span><span className="text-white">{(accounts * postsPerDay * avgViews).toLocaleString('pt-BR')} views</span></div>
              <div className="flex justify-between"><span className="text-white/40">Vendas estimadas/dia</span><span className="text-white">{dailySales.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Comissão/dia</span><span className="text-neon font-semibold">{fmtCurrency(dailyRevenue)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
