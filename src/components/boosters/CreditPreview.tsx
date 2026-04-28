import { Coins } from 'lucide-react'
import { calcCredits, type CreditCalcOpts } from '../../types/credits'

interface Props {
  tool: string
  opts?: CreditCalcOpts
  /** Texto extra exibido depois do custo, ex: "(saldo: 1416)" */
  suffix?: string
  className?: string
}

/**
 * Mostra o custo dinâmico calculado pelo helper `calcCredits`. Usado em boosters
 * com cobrança por segundo (Vídeos IA, Filmes IA, Imitar Movimento) e por chars
 * (Clonagem de Voz). Frontend é informativo — backend re-calcula no debit.
 */
export function CreditPreview({ tool, opts, suffix, className = '' }: Props) {
  const credits = calcCredits(tool, opts)
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold text-neon ${className}`}>
      <Coins size={14} />
      {credits} cr{suffix ? <span className="text-white/40 font-normal ml-1">{suffix}</span> : null}
    </span>
  )
}
