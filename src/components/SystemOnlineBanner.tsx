import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

/**
 * Banner "Sistema Online" estilo iaTikShop, com countdown pra próxima atualização.
 *
 * Como o sistema atual ainda popula manual via admin, esse countdown é decorativo —
 * cicla a cada 24h baseado no horário do dia. Quando rolar integração com cron real,
 * ler o último timestamp de update do banco.
 */
export function SystemOnlineBanner() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000) // refresh por minuto
    return () => clearInterval(id)
  }, [])

  // próxima atualização: meia-noite seguinte
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  const diffMs = next.getTime() - now.getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000)

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
        </span>
        <span className="text-xs font-semibold text-emerald-400">Sistema Online</span>
        <span className="text-xs text-white/50 hidden sm:inline">·</span>
        <span className="text-xs text-white/60 hidden sm:inline">Minerando dados em tempo real</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-white/60">
        <Activity size={11} className="text-emerald-400" />
        <span>Próxima atualização: <span className="text-emerald-400 font-semibold">{hours}h {String(minutes).padStart(2, '0')}min</span></span>
      </div>
    </div>
  )
}
