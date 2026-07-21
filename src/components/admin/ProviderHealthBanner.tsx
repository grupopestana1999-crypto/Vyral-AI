import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// E65 dia 7: o usuário final vê só a INSTABILITY_MSG genérica (mascaramento intencional
// do E65). O efeito colateral era que o DONO também não conseguia distinguir "minha conta
// de provider zerou" de "provider instável" — a Kie zerou 20/07 e a Replicate 19/07, e as
// duas só foram descobertas 2 dias depois, por análise manual dos logs.
// Este banner lê a RPC admin_provider_health (agrega api_logs das últimas 6h) e mostra a
// causa real dentro do /admin.

interface ProviderHealth {
  provider: string
  no_credit_errors: number
  other_errors: number
  success: number
  last_error_at: string | null
}

// Providers de IA que custam dinheiro e podem zerar. `client`/`resend` são
// infra interna e não interessam aqui.
const RECHARGE_LINKS: Record<string, { label: string; url: string }> = {
  kie: { label: 'kie.ai', url: 'https://kie.ai' },
  replicate: { label: 'replicate.com', url: 'https://replicate.com/account/billing' },
  gemini: { label: 'ai.studio/spend', url: 'https://ai.studio/spend' },
  elevenlabs: { label: 'elevenlabs.io', url: 'https://elevenlabs.io/app/subscription' },
}

export function ProviderHealthBanner() {
  const [rows, setRows] = useState<ProviderHealth[]>([])

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_provider_health')
    if (error) return
    setRows((data ?? []) as ProviderHealth[])
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60_000)
    return () => clearInterval(id)
  }, [load])

  const relevant = rows.filter(r => RECHARGE_LINKS[r.provider])
  const noCredit = relevant.filter(r => r.no_credit_errors > 0)
  // Degradado = muita falha sem ser saldo (503, timeout). Só alerta se falhar mais que acertar.
  const degraded = relevant.filter(r => r.no_credit_errors === 0 && r.other_errors >= 5 && r.other_errors > r.success)

  if (noCredit.length === 0 && degraded.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {noCredit.map(r => {
        const link = RECHARGE_LINKS[r.provider]
        const dead = r.success === 0
        return (
          <div key={r.provider} className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-300">
                {r.provider.toUpperCase()} sem saldo — {r.no_credit_errors} falha{r.no_credit_errors > 1 ? 's' : ''} nas últimas 6h
                {dead && ' · nenhuma geração passando'}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">
                Os usuários estão vendo a mensagem genérica de instabilidade. Recarregue pra normalizar.
                {r.success > 0 && ` (${r.success} geraç${r.success > 1 ? 'ões' : 'ão'} ainda passaram no período)`}
              </p>
            </div>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 text-xs font-semibold transition-colors"
            >
              Recarregar {link.label} <ExternalLink size={12} />
            </a>
          </div>
        )
      })}

      {degraded.map(r => (
        <div key={r.provider} className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-100/90 flex-1">
            <strong className="text-amber-300">{r.provider.toUpperCase()} instável</strong> — {r.other_errors} erros vs {r.success} sucessos nas últimas 6h.
            Não é saldo; provavelmente instabilidade do provedor.
          </p>
        </div>
      ))}
    </div>
  )
}
