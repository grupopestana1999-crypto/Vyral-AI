import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

// E65 dia 5: se a aba do user tá rodando bundle antigo depois de deploy,
// nenhum fix novo (retry 401, cap oculto, banner etc) vai aparecer pra ele.
// Solução: publish/version.json com o timestamp do build (gerado pelo plugin
// em vite.config.ts). O front polla esse arquivo a cada N minutos e compara
// com o timestamp injetado no bundle (__BUILD_TS__). Se ficar >5min pra trás,
// mostra toast persistente com botão de reload.
//
// Não usa navigator.serviceWorker.controller?.postMessage porque o SW da E23
// é auto-destruct — não confiável pra sinal de update.

declare const __BUILD_TS__: number

const POLL_MS = 10 * 60 * 1000  // 10 minutos
const STALE_THRESHOLD_MS = 60 * 1000  // avisa quando dif > 1min (build novo já rolou)
const TOAST_ID = 'vyral-new-version'

export function useVersionCheck() {
  const notified = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (cancelled || notified.current) return
      try {
        const res = await fetch('/version.json', { cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as { ts?: number }
        const serverTs = Number(body?.ts ?? 0)
        if (!Number.isFinite(serverTs) || serverTs <= 0) return
        const localTs = typeof __BUILD_TS__ === 'number' ? __BUILD_TS__ : 0
        if (serverTs - localTs > STALE_THRESHOLD_MS) {
          notified.current = true
          toast('Nova versão disponível', {
            id: TOAST_ID,
            description: 'O app foi atualizado. Recarregue pra pegar o fix mais recente.',
            duration: Infinity,
            action: {
              label: 'Recarregar',
              onClick: () => window.location.reload(),
            },
          })
        }
      } catch {
        // rede off / fetch bloqueado — silencioso, tenta na próxima
      }
    }

    // primeira checada ~30s depois do boot pra não competir com carregamento inicial
    const first = setTimeout(check, 30_000)
    const iv = setInterval(check, POLL_MS)
    return () => {
      cancelled = true
      clearTimeout(first)
      clearInterval(iv)
    }
  }, [])
}
