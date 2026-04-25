import { useEffect, useState } from 'react'

interface Props {
  totalCount?: number
  totalRevenue?: number
  countLabel?: string
}

function fmtCompactCurrency(n: number) {
  if (n >= 1_000_000_000) return `R$${(n / 1_000_000_000).toFixed(1).replace('.', ',')}B`
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return `R$${n.toFixed(0)}`
}

export function SystemOnlineBanner({ totalCount, totalRevenue, countLabel = 'produtos' }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const next = new Date(now); next.setHours(24, 0, 0, 0)
  const elapsedMs = now.getTime() - startOfDay.getTime()
  const totalMs = next.getTime() - startOfDay.getTime()
  const cyclePct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100))
  const remainingMs = next.getTime() - now.getTime()
  const hours = Math.floor(remainingMs / 3_600_000)
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000)

  const showCount = totalCount != null && totalCount > 0
  const showRevenue = totalRevenue != null && totalRevenue > 0

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-2.5">
        {/* Esquerda: status */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="text-xs font-semibold text-emerald-400 whitespace-nowrap">Sistema Online</span>
          <span className="text-xs text-white/40 hidden md:inline">·</span>
          <span className="text-xs text-white/60 hidden md:inline truncate">Minerando dados em tempo real</span>
        </div>

        {/* Direita: stats agregados + countdown — tudo na mesma linha */}
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs sm:ml-auto">
          {showCount && (
            <span className="text-white/70 font-medium whitespace-nowrap">
              {totalCount} {countLabel}
            </span>
          )}
          {showCount && showRevenue && <span className="text-white/30">·</span>}
          {showRevenue && (
            <span className="text-emerald-400 font-semibold whitespace-nowrap">{fmtCompactCurrency(totalRevenue)}</span>
          )}
          {(showCount || showRevenue) && <span className="text-white/30 hidden sm:inline">·</span>}
          <span className="text-white/60 whitespace-nowrap">
            Próxima atualização: <span className="text-emerald-400 font-semibold">{hours}h{String(minutes).padStart(2, '0')}min</span>
          </span>
        </div>
      </div>

      {/* Barra de ciclo limpa, sem texto sobreposto */}
      <div className="h-1 w-full bg-emerald-500/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500/40 via-emerald-400/70 to-emerald-300/90 transition-all duration-1000"
          style={{ width: `${cyclePct.toFixed(2)}%` }}
        />
      </div>
    </div>
  )
}
