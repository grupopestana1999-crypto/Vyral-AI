import { useState } from 'react'
import { Calculator, TrendingUp, DollarSign, Users, BarChart3, Lightbulb, Target, Zap, Sparkles, Info } from 'lucide-react'

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
    description: 'Cenário cauteloso — ideal pra iniciantes',
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
    description: 'Cenário realista — média do mercado',
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
    description: 'Cenário otimista — afiliados top',
    conversionMultiplier: 1.8,
    ticketMultiplier: 1.2,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
    borderColor: 'border-primary-500/30',
    icon: <Zap size={14} />,
  },
]

const MAX_TIPS = [
  'Poste no mínimo 3 a 5 vezes por dia em cada conta pra maximizar alcance do algoritmo.',
  'Use produtos com heat score alto (acima de 80) e comissão mínima de 15% pra garantir boa margem.',
  'Varie os ângulos e formatos — mesmo produto em pose diferente performa como vídeo novo.',
  'Aproveite trends: use músicas virais do TikTok nas primeiras 24h que estouram.',
  'Crie hook forte nos 3 primeiros segundos — 70% dos desistentes saem antes de 5s.',
  'Monitore CTR e conversão na live. Pause criativo com CTR abaixo de 3% e escale os acima de 7%.',
  'Gere variações com IA — 1 foto do produto vira 20 vídeos com cenários e poses diferentes.',
  'Teste horários: 18h-22h costuma ter pico de conversão pra impulso de compra.',
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
  const roi = monthlyCommission > 0 ? ((monthlyCommission - 97) / 97) * 100 : 0

  const parameters = [
    {
      label: 'Número de contas',
      value: accounts,
      set: setAccounts,
      min: 1,
      max: 50,
      step: 1,
      icon: <Users size={14} />,
      tip: 'Mais contas = mais alcance distribuído. Afiliados top rodam de 5 a 20 contas simultâneas.',
    },
    {
      label: 'Postagens por dia (por conta)',
      value: postsPerDay,
      set: setPostsPerDay,
      min: 1,
      max: 20,
      step: 1,
      icon: <TrendingUp size={14} />,
      tip: 'O algoritmo do TikTok Shop premia consistência. 3 a 5 postagens diárias é o sweet spot.',
    },
    {
      label: 'Média de views por post',
      value: avgViews,
      set: setAvgViews,
      min: 500,
      max: 100000,
      step: 500,
      icon: <BarChart3 size={14} />,
      tip: 'Conta nova: 500-3k views. Conta madura: 5k-20k. Viral esporádico: 100k+.',
    },
    {
      label: 'Taxa de conversão (%)',
      value: conversionRate,
      set: setConversionRate,
      min: 0.1,
      max: 10,
      step: 0.1,
      icon: <Target size={14} />,
      tip: 'Média no TikTok Shop: 1% a 3%. Produtos com prova social forte chegam a 5%.',
    },
    {
      label: 'Ticket médio (R$)',
      value: avgTicket,
      set: setAvgTicket,
      min: 10,
      max: 500,
      step: 5,
      icon: <DollarSign size={14} />,
      tip: 'Produtos de beleza: R$ 40-80. Eletrônicos: R$ 80-200. Casa e decor: R$ 50-150.',
    },
    {
      label: 'Comissão (%)',
      value: commissionRate,
      set: setCommissionRate,
      min: 1,
      max: 50,
      step: 1,
      icon: <DollarSign size={14} />,
      tip: 'Comissão média: 10% a 20%. Dropshipping de nicho: 30%+. Produtos digitais: 40%+.',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Calculadora de Escalabilidade</h1>
          <p className="text-sm text-white/50">Simule receita potencial com base em cenários reais</p>
        </div>
      </div>

      {/* Resumo da operação */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-primary-600/20 to-accent-600/20 border border-primary-500/30 rounded-xl p-4">
          <p className="text-[10px] text-white/50 uppercase tracking-wide mb-1">Faturamento Mensal</p>
          <p className="text-lg md:text-xl font-bold text-white">{fmtCurrency(monthlyGMV)}</p>
          <p className="text-[10px] text-white/40 mt-0.5">GMV (vendas brutas)</p>
        </div>
        <div className="bg-surface-300 border border-neon/30 rounded-xl p-4">
          <p className="text-[10px] text-white/50 uppercase tracking-wide mb-1">Comissão Líquida</p>
          <p className="text-lg md:text-xl font-bold text-neon">{fmtCurrency(monthlyCommission)}</p>
          <p className="text-[10px] text-white/40 mt-0.5">Seu lucro/mês</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4">
          <p className="text-[10px] text-white/50 uppercase tracking-wide mb-1">Vendas/Mês</p>
          <p className="text-lg md:text-xl font-bold text-white">{Math.round(dailySales * 30).toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{dailySales.toFixed(1)} por dia</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4">
          <p className="text-[10px] text-white/50 uppercase tracking-wide mb-1">ROI estimado</p>
          <p className="text-lg md:text-xl font-bold text-emerald-400">{roi > 0 ? '+' : ''}{roi.toFixed(0)}%</p>
          <p className="text-[10px] text-white/40 mt-0.5">sobre plano Creator</p>
        </div>
      </div>

      {/* Perfis */}
      <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Perfil de simulação</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PROFILES.map(p => (
            <button
              key={p.id}
              onClick={() => setProfile(p.id)}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                profile === p.id
                  ? `${p.bgColor} ${p.borderColor}`
                  : 'bg-surface-400 border-white/5 hover:border-white/10'
              }`}
            >
              <div className={`flex items-center gap-1.5 mb-1 ${profile === p.id ? p.color : 'text-white/60'}`}>
                {p.icon}
                <span className="text-sm font-bold">{p.label}</span>
              </div>
              <p className="text-[11px] text-white/50 mb-2">{p.description}</p>
              <div className="flex gap-3 text-[10px] text-white/40">
                <span>Conv ×{p.conversionMultiplier}</span>
                <span>Ticket ×{p.ticketMultiplier}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Parâmetros */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 size={16} className="text-primary-400" /> Ajuste os parâmetros
          </h3>
          {parameters.map(input => (
            <div key={input.label}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-white/60 flex items-center gap-1.5">
                  {input.icon} {input.label}
                </label>
                <span className="text-sm font-semibold text-primary-400">
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
              <div className="flex items-start gap-1.5 mt-1.5">
                <Info size={10} className="text-white/30 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/40 leading-relaxed">{input.tip}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Detalhamento + dicas */}
        <div className="space-y-4">
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-3">Detalhamento diário</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Total de posts/dia</span>
                <span className="text-white font-medium">{(accounts * postsPerDay).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Alcance total/dia</span>
                <span className="text-white font-medium">{(accounts * postsPerDay * avgViews).toLocaleString('pt-BR')} views</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Conversão ajustada</span>
                <span className="text-white font-medium">{adjustedConversion.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Ticket ajustado</span>
                <span className="text-white font-medium">{fmtCurrency(adjustedTicket)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Vendas estimadas/dia</span>
                <span className="text-white font-medium">{dailySales.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">GMV/dia</span>
                <span className="text-white font-medium">{fmtCurrency(dailyGMV)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5">
                <span className="text-white/70 font-medium">Comissão/dia</span>
                <span className="text-neon font-bold">{fmtCurrency(dailyCommission)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-600/10 to-accent-600/10 border border-primary-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-neon" />
              <h4 className="text-sm font-semibold text-white">Dicas para maximizar resultados</h4>
            </div>
            <ul className="space-y-2">
              {MAX_TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/70 leading-relaxed">
                  <span className="text-neon font-bold mt-0.5">{i + 1}.</span>
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
