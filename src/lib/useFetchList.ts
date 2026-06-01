import { useEffect, useState, useCallback, useRef } from 'react'

interface FetchResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  retry: () => void
}

type QueryFn<T> = (signal: AbortSignal) => Promise<{ data: T[] | null; error: unknown }>

/**
 * Hook pra fetch de listas com:
 * - timeout (default 12s) → nunca trava em skeleton infinito
 * - AbortController → cancela fetch quando componente desmonta ou deps mudam
 * - try/catch → erros aparecem na UI, não são engolidos
 * - retry() → dispara nova tentativa sem recarregar a página
 */
export function useFetchList<T>(
  queryFn: QueryFn<T>,
  deps: unknown[] = [],
  timeoutMs = 12000
): FetchResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const stateRef = useRef({ data, loading, error })
  stateRef.current = { data, loading, error }

  const retry = useCallback(() => setRetryTick(t => t + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)
      try {
        // Race entre a query e o timeout — supabase-js v2 não respeita AbortController externo
        // por padrão, então precisamos forçar rejeição via race.
        const result = await Promise.race([
          queryFn(controller.signal),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
        ])
        if (cancelled) return
        const { data: rows, error: qError } = result
        if (qError) {
          const msg = qError instanceof Error ? qError.message : typeof qError === 'object' && qError && 'message' in qError
            ? String((qError as { message: unknown }).message)
            : String(qError)
          throw new Error(msg)
        }
        setData(rows ?? [])
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('timeout') || msg.includes('aborted') || msg.includes('AbortError')) {
          setError('Tempo de resposta excedido. Verifique sua conexão e tente de novo.')
        } else if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
          setError('Falha de rede. Confira sua conexão.')
        } else if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('401')) {
          setError('Sua sessão expirou. Recarregue a página pra renovar.')
        } else {
          setError(msg || 'Erro desconhecido ao carregar dados.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true; controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retryTick])

  // Defensivo: se a lista estiver VAZIA sem loading/erro (caso o primeiro fetch tenha
  // pego um momento ruim de sessão/rede) E o usuário voltar a focar a página, refaz.
  // Só refaz se NÃO tem dado mostrando — evita flicker em quem já vê a lista cheia.
  useEffect(() => {
    function maybeRefetch() {
      if (document.visibilityState !== 'visible') return
      const s = stateRef.current
      if (s.loading || s.error || s.data.length > 0) return
      setRetryTick(t => t + 1)
    }
    window.addEventListener('focus', maybeRefetch)
    document.addEventListener('visibilitychange', maybeRefetch)
    return () => {
      window.removeEventListener('focus', maybeRefetch)
      document.removeEventListener('visibilitychange', maybeRefetch)
    }
  }, [])

  return { data, loading, error, retry }
}
