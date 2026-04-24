import { useState } from 'react'
import { Calculator, TrendingUp, DollarSign, Users, BarChart3, Lightbulb, Target, Zap, Info } from 'lucide-react'

function fmtCurrency(n: number) {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface Profile {
  id: 'conservador' | 'moderado' | 'agressivo'
  label: string
  description: string
  conversionMultiplier: number
  ticketMultiplier: number
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
}

const PROFILES: Profile[] = [
  {
    id: 'conservador',
    label: 'Conservador',
    description: 'Cenário cauteloso — iniciantes',
    conversionMultiplier: 0.5,
    ticketMultiplier: 0.8,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: <Target size={14} />,
  },
  {
    id: 'moderado',
    label: 'Moderado',
    description: 'Cenário realista — média',
    conversionMultiplier: 1.0,
    ticketMultiplier: 1.0,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: <TrendingUp size={14} />,
  },
  {
    id: 'agressivo',
    label: 'Agressivo',
    description: 'Cenário otimista — top',
    conversionMultiplier: 1.8,
    ticketMultiplier: 1.2,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
    borderColor: 'border-primary-500/30',
    icon: <Zap size={14} />,
  },
]

const MAX_TIPS = [
  'Poste 3 a 5 vezes por dia em cada conta pra maximizar alcance do algoritmo.',
  'Use produtos com heat score alto (acima de 80) e comissão mínima de 15%.',
  'Varie ângulos e formatos — mesmo produto em pose diferente performa como vídeo novo.',
  'Use músicas virais do TikTok nas primeiras 24h que estouram.',
  'Hook forte nos 3 primeiros segundos — 70% desistem antes de 5s.',
  'Monitore CTR na live. Pause criativo com CTR abaixo de 3% e escale os acima de 7%.',
  'Gere variações com IA — 1 foto vira 20 vídeos com cenários diferentes.',
  'Testa horários: 18h-22h tem pico de conversão por impulso.',
]

export function CalculatorPage() {
  const [profile, setProfile] = useState<Profile['id']>('moderado')
  const [accounts, setAccounts] = useState(1)
  const [postsPerDay, setPostsPerDay] = useState(3)
  const [avgViews, setAvgViews] = useState(5000)
  const [conversionRate, setConversionRate] = useState(2)
  const [avgTicket, setAvgTicket] = useState(80)
  const [commissionRate, setCommissionRate] = useState(15)

  const activeProfile = PROFILES.find(p => p.id === profile)!

  const adjustedConversion = conversionRate * activeProfile.conversionMultiplier
  const adjustedTicket = avgTicket * activeProfile.ticketMultiplier

  const dailySales = accounts * postsPerDay * (avgViews * (adjustedConversion / 100))
  const dailyGMV = dailySales * adjustedTicket
  const dailyCommission = dailyGMV * (commissionRate / 100)
  const monthlyCommission = dailyCommission * 30
  const monthlyGMV = dailyGMV * 30
  const monthlyGrowth = Math.min(0.20, 0.05 + (postsPerDay / 10) * 0.1)
  const projections = [1, 3, 6, 12].map(months => ({
    months,
    revenue: monthlyCommission * Math.pow(1 + monthlyGrowth, months - 1),
  }))
  const roi = monthlyCommission > 0 ? ((monthlyCommission - 97) / 97) * 100 : 0

  const parameters = [
    {
      label: 'Número de contas',
      value: accounts,
      set: setAccounts,
      min: 1, max: 50, step: 1,
      icon: <Users size={12} />,
      tip: 'Afiliados top rodam 5 a 20 contas simultâneas.',
    },
    {
      label: 'Posts/dia (por conta)',
      value: postsPerDay,
      set: setPostsPerDay,
      min: 1, max: 20, step: 1,
      icon: <TrendingUp size={12} />,
      tip: 'Sweet spot: 3 a 5 postagens diárias.',
    },
    {
      label: 'Views médios/post',
      value: avgViews,
      set: setAvgViews,
      min: 500, max: 100000, step: 500,
      icon: <BarChart3 size={12} />,
      tip: 'Nova: 500-3k. Madura: 5k-20k. Viral: 100k+.',
    },
    {
      label: 'Conversão (%)',
      value: conversionRate,
      set: setConversionRate,
      min: 0.1, max: 10, step: 0.1,
      icon: <Target size={12} />,
      tip: 'Média TikTok Shop: 1-3%. Top: 5%+.',
    },
    {
      label: 'Ticket médio (R$)',
      value: avgTicket,
      set: setAvgTicket,
      min: 10, max: 500, step: 5,
      icon: <DollarSign size={12} />,
      tip: 'Beleza: R$40-80. Eletrônicos: R$80-200.',
    },
    {
      label: 'Comissão (%)',
      value: commissionRate,
      set: setCommissionRate,
      min: 1, max: 50, step: 1,
      icon: <DollarSign size={12} />,
      tip: 'Média: 10-20%. Dropshipping nicho: 30%+.',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Calculadora de Escalabilidade</h1>
          <p className="text-sm text-white/50">Simule receita potencial com base em cenários reais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PAINEL 1: Configure sua operação */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <div className="w-7 h-7 rounded-lg bg-primary-600/20 flex items-center justify-center">
              <BarChart3 size={14} className="text-primary-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Configure sua operação</h3>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-white/40 uppercase tracking-wide">Perfil de simulação</p>
            <div className="grid grid-cols-3 gap-2">
              {PROFILES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setProfile(p.id)}
                  className={`text-left p-2 rounded-lg border transition-all cursor-pointer ${
                    profile === p.id ? `${p.bgColor} ${p.borderColor}` : 'bg-surface-400 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className={`flex items-center gap-1 mb-0.5 ${profile === p.id ? p.color : 'text-white/60'}`}>
                    {p.icon}
                    <span className="text-[11px] font-bold">{p.label}</span>
                  </div>
                  <p className="text-[9px] text-white/40 leading-tight">{p.description}</p>
                  <div className="flex gap-2 text-[9px] text-white/40 mt-1">
                    <span>×{p.conversionMultiplier}</span>
                    <span>×{p.ticketMultiplier}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {parameters.map(input => (
              <div key={input.label}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-white/60 flex items-center gap-1">
                    {input.icon} {input.label}
                  </label>
                  <span className="text-[11px] font-semibold text-primary-400">
                    {typeof input.value === 'number' && input.value % 1 !== 0 ? input.value.toFixed(1) : input.value.toLocaleString('pt-BR')}
                  </span>
                </div>
                <input
                  type="range"
                  min={input.min}
                  max={input.max}
                  step={input.step}
                  value={input.value}
                  onChange={e => input.set(Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
                <p className="text-[9px] text-white/40 flex items-start gap-1 mt-0.5">
                  <Info size={9} className="flex-shrink-0 mt-0.5" />
                  {input.tip}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* PAINEL 2: Resumo da Operação */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <div className="w-7 h-7 rounded-lg bg-neon/20 flex items-center justify-center">
              <DollarSign size={14} className="text-neon" />
            </div>
            <h3 className="text-sm font-semibold text-white">Resumo da Operação</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-primary-600/20 to-accent-600/20 border border-primary-500/30 rounded-lg p-3">
              <p className="text-[9px] text-white/50 uppercase tracking-wide">Faturamento</p>
              <p className="text-base font-bold text-white leading-tight mt-0.5">{fmtCurrency(monthlyGMV)}</p>
              <p className="text-[9px] text-white/40">GMV/mês</p>
            </div>
            <div className="bg-surface-400 border border-neon/30 rounded-lg p-3">
              <p className="text-[9px] text-white/50 uppercase tracking-wide">Comissão</p>
              <p className="text-base font-bold text-neon leading-tight mt-0.5">{fmtCurrency(monthlyCommission)}</p>
              <p className="text-[9px] text-white/40">Lucro/mês</p>
            </div>
            <div className="bg-surface-400 border border-white/5 rounded-lg p-3">
              <p className="text-[9px] text-white/50 uppercase tracking-wide">Vendas</p>
              <p className="text-base font-bold text-white leading-tight mt-0.5">{Math.round(dailySales * 30).toLocaleString('pt-BR')}</p>
              <p className="text-[9px] text-white/40">/mês · {dailySales.toFixed(1)}/dia</p>
            </div>
            <div className="bg-surface-400 border border-white/5 rounded-lg p-3">
              <p className="text-[9px] text-white/50 uppercase tracking-wide">ROI</p>
              <p className="text-base font-bold text-emerald-400 leading-tight mt-0.5">{roi > 0 ? '+' : ''}{roi.toFixed(0)}%</p>
              <p className="text-[9px] text-white/40">vs plano Creator</p>
            </div>
          </div>

          <div className="bg-surface-400 rounded-lg p-3 space-y-1.5">
            <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Detalhamento diário</p>
            <div className="flex justify-between text-[11px]"><span className="text-white/50">Posts/dia</span><span className="text-white font-medium">{accounts * postsPerDay}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-white/50">Alcance/dia</span><span className="text-white font-medium">{(accounts * postsPerDay * avgViews).toLocaleString('pt-BR')}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-white/50">Conv ajustada</span><span className="text-white font-medium">{adjustedConversion.toFixed(2)}%</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-white/50">Ticket ajustado</span><span className="text-white font-medium">{fmtCurrency(adjustedTicket)}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-white/50">GMV/dia</span><span className="text-white font-medium">{fmtCurrency(dailyGMV)}</span></div>
            <div className="flex justify-between text-[11px] pt-1 border-t border-white/5">
              <span className="text-white/70 font-medium">Comissão/dia</span>
              <span className="text-neon font-bold">{fmtCurrency(dailyCommission)}</span>
            </div>
          </div>
        </div>

        {/* PAINEL 3: Projeções mensais */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Projeções mensais</h3>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-white/40 uppercase tracking-wide">Com growth estimado de +{(monthlyGrowth * 100).toFixed(0)}% ao mês</p>
            {projections.map(p => (
              <div key={p.months} className="flex items-center justify-between bg-surface-400 rounded-lg p-2.5">
                <div>
                  <p className="text-[11px] text-white/70">Mês {p.months}</p>
                  <p className="text-[9px] text-white/40">{p.months === 1 ? 'linha de base' : p.months === 12 ? 'após 1 ano' : `após ${p.months} meses`}</p>
                </div>
                <p className="text-sm font-bold text-neon">{fmtCurrency(p.revenue)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between bg-gradient-to-r from-primary-600/20 to-accent-600/20 border border-primary-500/30 rounded-lg p-2.5 mt-2">
              <div>
                <p className="text-[11px] text-white font-semibold">Total 12 meses</p>
                <p className="text-[9px] text-white/50">projeção acumulada</p>
              </div>
              <p className="text-base font-bold text-white">
                {fmtCurrency(projections.reduce((sum, p, i) => {
                  const prev = i > 0 ? projections[i - 1].months : 0
                  return sum + p.revenue * (p.months - prev)
                }, 0))}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-600/10 to-accent-600/10 border border-primary-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={12} className="text-neon" />
              <h4 className="text-[11px] font-semibold text-white">Dicas pra maximizar</h4>
            </div>
            <ul className="space-y-1.5">
              {MAX_TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[10px] text-white/70 leading-relaxed">
                  <span className="text-neon font-bold">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
