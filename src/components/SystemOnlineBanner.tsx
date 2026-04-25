import { useEffect, useState } from 'react'

interface Props {
  /** Total de items no feed (ex: "20 produtos") */
  totalCount?: number
  /** Soma agregada de receita pra mostrar (ex: 99_900_000 → "R$99.9M") */
  totalRevenue?: number
  /** Label customizado pro contador (default: "produtos") */
  countLabel?: string
}

function fmtCompactCurrency(n: number) {
  if (n >= 1_000_000_000) return `R$${(n / 1_000_000_000).toFixed(1).replace('.', ',')}B`
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return `R$${n.toFixed(0)}`
}

/**
 * Banner "Sistema Online" estilo iaTikShop com:
 * - status pulsante "Sistema Online · Minerando dados em tempo real"
 * - contador agregado (X items · R$YM)
 * - countdown decorativo "Próxima atualização: Xh Ymin" (ciclo 24h)
 * - barra horizontal de "Ciclo" preenchendo conforme o dia avança
 */
export function SystemOnlineBanner({ totalCount, totalRevenue, countLabel = 'produtos' }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Ciclo de 24h baseado em meia-noite
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const next = new Date(now); next.setHours(24, 0, 0, 0)
  const elapsedMs = now.getTime() - startOfDay.getTime()
  const totalMs = next.getTime() - startOfDay.getTime()
  const cyclePct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100))
  const remainingMs = next.getTime() - now.getTime()
  const hours = Math.floor(remainingMs / 3_600_000)
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000)

  const showStats = (totalCount != null && totalCount > 0) || (totalRevenue != null && totalRevenue > 0)

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 overflow-hidden">
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="text-xs font-semibold text-emerald-400">Sistema Online</span>
          <span className="text-xs text-white/40 hidden sm:inline">·</span>
          <span className="text-xs text-white/60 hidden sm:inline">Minerando dados em tempo real</span>
        </div>

        {showStats && (
          <div className="flex items-center gap-2 text-xs text-white/70 ml-auto">
            {totalCount != null && totalCount > 0 && (
              <span className="font-medium">{totalCount} {countLabel}</span>
            )}
            {totalCount != null && totalRevenue != null && totalRevenue > 0 && (
              <span className="text-white/30">·</span>
            )}
            {totalRevenue != null && totalRevenue > 0 && (
              <span className="font-semibold text-emerald-400">{fmtCompactCurrency(totalRevenue)}</span>
            )}
          </div>
        )}

        <div className={`flex items-center gap-1.5 text-[11px] text-white/60 ${showStats ? '' : 'ml-auto'}`}>
          <span>Próxima atualização:</span>
          <span className="text-emerald-400 font-semibold">{hours}h {String(minutes).padStart(2, '0')}min</span>
        </div>
      </div>

      {/* Barra de ciclo decorativa */}
      <div className="h-1 w-full bg-emerald-500/10 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500/40 via-emerald-400/60 to-emerald-300/80 transition-all duration-1000"
          style={{ width: `${cyclePct.toFixed(2)}%` }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-emerald-300/80 font-medium pointer-events-none">
          Ciclo · {cyclePct.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}
