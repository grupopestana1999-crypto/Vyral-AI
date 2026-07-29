import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

// E65: banner de "app em atualização" exibido diariamente das 22h às 5h Brasília.
// Fechável pela sessão até o fim da janela (a janela cruza meia-noite Brasília,
// então dismiss usa "window-key" = data do dia que INICIOU a janela, não o dia atual).
const STORAGE_KEY = 'maintenance_banner_dismissed'

function currentHourBrasilia(): number {
  const raw = new Date().toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  })
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : new Date().getHours()
}

function todayBrasilia(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function yesterdayBrasilia(): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() - 1)
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function currentWindowKey(hour: number): string {
  return hour < 5 ? yesterdayBrasilia() : todayBrasilia()
}

export function MaintenanceBanner() {
  const [hour, setHour] = useState(currentHourBrasilia())
  const [dismissed, setDismissed] = useState<string | null>(null)

  useEffect(() => {
    setDismissed(sessionStorage.getItem(STORAGE_KEY))
    const id = setInterval(() => setHour(currentHourBrasilia()), 60_000)
    return () => clearInterval(id)
  }, [])

  const inWindow = true
  const windowKey = currentWindowKey(hour)
  const isDismissedThisWindow = dismissed === windowKey

  if (!inWindow || isDismissedThisWindow) return null

  function handleDismiss() {
    const key = currentWindowKey(hour)
    sessionStorage.setItem(STORAGE_KEY, key)
    setDismissed(key)
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 md:px-6 py-2.5 flex items-center gap-3">
      <AlertTriangle size={16} className="text-amber-400 shrink-0" />
      <p className="text-xs md:text-sm text-amber-100/90 flex-1">
        <strong className="text-amber-300">🔧 🚨ATENÇÃO:</strong>{' '}
O APLICATIVO DO VYRAL AI ATUALIZOU!
O nosso aplicativo atualizou e agora você consegue acessar o Vyral AI nesse link: https://vyral-ia.bolt.host/
      </p>
      <button
        onClick={handleDismiss}
        className="text-amber-300/60 hover:text-amber-300 cursor-pointer shrink-0"
        aria-label="Fechar aviso"
      >
        <X size={14} />
      </button>
    </div>
  )
}
