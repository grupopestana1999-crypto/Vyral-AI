import { useState, type ReactNode } from 'react'
import { Calculator, TrendingUp, DollarSign, Users, Lightbulb, Target, Info } from 'lucide-react'

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace('.', ',')}K`
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',')}K`
  return n.toLocaleString('pt-BR')
}

const TIPS = [
  'Poste nos horários de pico (12h, 18h, 21h)',
  'Mantenha consistência: 30+ dias seguidos aumenta alcance',
  'Use hooks dos vídeos virais da plataforma',
  '1 conta por nicho = conteúdo mais relevante = mais conversão',
]

export function CalculatorPage() {
  const [accounts, setAccounts] = useState(3)
  const [postsPerDay, setPostsPerDay] = useState(5)
  const [conversionRate, setConversionRate] = useState(0.5)
  const [avgTicket, setAvgTicket] = useState(80)
  const [commissionRate, setCommissionRate] = useState(10)

  // Cálculos centrais
  const postsPerMonth = accounts * postsPerDay * 30
  const chancesPerDay = accounts * postsPerDay

  // Cenários: multipliers idênticos ao iaTikShop
  // Conservador: 0.5×conv, 0.8×ticket | Moderado: 1×, 1× | Agressivo: 1.8×, 1.2×
  function projectionFor(convMult: number, ticketMult: number) {
    const adjustedConv = (conversionRate / 100) * convMult
    const adjustedTicket = avgTicket * ticketMult
    // Pra cada post, assume views base = 1500 (média humilde de TikTok new account)
    const viewsPerPost = 1500
    const sales = postsPerMonth * viewsPerPost * adjustedConv
    const revenue = sales * adjustedTicket
    const commission = revenue * (commissionRate / 100)
    return { sales: Math.round(sales), revenue, commission }
  }

  const conservador = projectionFor(0.5, 0.8)
  const moderado = projectionFor(1, 1)
  const agressivo = projectionFor(1.8, 1.2)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Calculadora de Escalabilidade</h1>
          <p className="text-sm text-white/50">Simule sua receita baseada no volume de contas e postagens</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PAINEL 1 — Configure sua Operação (esquerda inteiro) */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse" />
              <h3 className="text-sm font-semibold text-white">Configure sua Operação</h3>
            </div>
            <p className="text-[11px] text-white/40 mt-1">Ajuste os parâmetros para simular diferentes cenários</p>
          </div>

          <SliderField
            label="Contas TikTok"
            icon={<Users size={12} />}
            value={accounts}
            onChange={setAccounts}
            min={1} max={50} step={1}
            tip="Cada conta = 1 nicho diferente (ex: beleza, fitness, casa)"
          />
          <SliderField
            label="Posts por Dia (por conta)"
            icon={<TrendingUp size={12} />}
            value={postsPerDay}
            onChange={setPostsPerDay}
            min={1} max={20} step={1}
            tip="Recomendado: 5-10 posts/dia para crescimento rápido"
          />
          <SliderField
            label="Taxa de Conversão"
            icon={<Target size={12} />}
            value={conversionRate}
            onChange={setConversionRate}
            min={0.1} max={5} step={0.1}
            suffix="%"
            tip="Média do TikTok Shop: 0.3% - 1% de conversão"
          />
          <SliderField
            label="Ticket Médio"
            icon={<DollarSign size={12} />}
            value={avgTicket}
            onChange={setAvgTicket}
            min={10} max={500} step={5}
            prefix="R$ "
            tip="Valor médio das vendas dos produtos promovidos"
          />
          <SliderField
            label="Comissão de Afiliado"
            icon={<DollarSign size={12} />}
            value={commissionRate}
            onChange={setCommissionRate}
            min={1} max={50} step={1}
            suffix="%"
            tip="Comissão média no TikTok Shop: 8-15%"
          />
        </div>

        {/* Coluna direita: 3 painéis empilhados */}
        <div className="space-y-4">
          {/* PAINEL 2 — Resumo da Operação */}
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Resumo da Operação</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-surface-400 rounded-lg py-3">
                <p className="text-2xl font-bold text-white">{accounts}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wide mt-0.5">Contas</p>
              </div>
              <div className="text-center bg-surface-400 rounded-lg py-3">
                <p className="text-2xl font-bold text-primary-400">{chancesPerDay}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wide mt-0.5">Posts/Dia</p>
              </div>
              <div className="text-center bg-surface-400 rounded-lg py-3">
                <p className="text-2xl font-bold text-emerald-400">{postsPerMonth}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wide mt-0.5">Posts/Mês</p>
              </div>
            </div>
            <div className="bg-surface-400 rounded-lg px-3 py-2.5 flex items-center gap-2 text-xs">
              <Info size={12} className="text-white/40 flex-shrink-0" />
              <span className="text-white/50">Fórmula de Cálculo</span>
              <code className="ml-auto text-emerald-400 font-mono text-[11px]">
                {accounts} × {postsPerDay} = <span className="text-emerald-300 font-semibold">{chancesPerDay} chances/dia</span>
              </code>
            </div>
          </div>

          {/* PAINEL 3 — Projeções Mensais */}
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary-400" />
              <h3 className="text-sm font-semibold text-white">Projeções Mensais</h3>
            </div>

            <ScenarioCard
              label="Conservador"
              labelClass="bg-amber-500/15 text-amber-400 border border-amber-500/20"
              tagline="Cenário pessimista"
              data={conservador}
              valueClass="text-amber-400"
            />
            <ScenarioCard
              label="Moderado ⭐"
              labelClass="bg-primary-600 text-white"
              tagline="Cenário mais provável"
              data={moderado}
              valueClass="text-emerald-400"
            />
            <ScenarioCard
              label="Agressivo"
              labelClass="bg-purple-500/15 text-purple-400 border border-purple-500/20"
              tagline="Com virais + consistência"
              data={agressivo}
              valueClass="text-purple-400"
            />
          </div>

          {/* PAINEL 4 — Dicas pra Maximizar Resultados */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={14} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-400">Dicas para Maximizar Resultados</h3>
            </div>
            <ul className="space-y-1.5">
              {TIPS.map(tip => (
                <li key={tip} className="flex items-start gap-2 text-xs text-white/80">
                  <span className="text-amber-400 mt-0.5">•</span>
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

interface SliderFieldProps {
  label: string
  icon: ReactNode
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  prefix?: string
  suffix?: string
  tip: string
}

function SliderField({ label, icon, value, onChange, min, max, step, prefix, suffix, tip }: SliderFieldProps) {
  const display = value % 1 !== 0 ? value.toFixed(1) : value.toString()
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-white/70 flex items-center gap-1.5">
          {icon}
          {label}
        </label>
        <span className="text-sm font-bold text-white">
          {prefix}{display}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary-500"
      />
      <p className="text-[10px] text-white/40 mt-1">{tip}</p>
    </div>
  )
}

interface ScenarioCardProps {
  label: string
  labelClass: string
  tagline: string
  data: { sales: number; revenue: number; commission: number }
  valueClass: string
}

function ScenarioCard({ label, labelClass, tagline, data, valueClass }: ScenarioCardProps) {
  return (
    <div className="bg-surface-400 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${labelClass}`}>{label}</span>
        <span className="text-[10px] text-white/40">{tagline}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] text-white/50 uppercase tracking-wide">Vendas</p>
          <p className="text-base font-bold text-white">{fmtCount(data.sales)}</p>
        </div>
        <div>
          <p className="text-[9px] text-white/50 uppercase tracking-wide">Faturamento</p>
          <p className="text-base font-bold text-white">{fmtCurrency(data.revenue)}</p>
        </div>
        <div>
          <p className="text-[9px] text-white/50 uppercase tracking-wide">Sua Comissão</p>
          <p className={`text-base font-bold ${valueClass}`}>{fmtCurrency(data.commission)}</p>
        </div>
      </div>
    </div>
  )
}
