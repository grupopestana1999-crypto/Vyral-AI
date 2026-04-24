import { useEffect, useState, useCallback } from 'react'

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

  const retry = useCallback(() => setRetryTick(t => t + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs)
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)
      try {
        const { data: result, error: qError } = await queryFn(controller.signal)
        if (cancelled) return
        if (qError) {
          const msg = qError instanceof Error ? qError.message : typeof qError === 'object' && qError && 'message' in qError
            ? String((qError as { message: unknown }).message)
            : String(qError)
          throw new Error(msg)
        }
        setData(result ?? [])
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
        clearTimeout(timeoutId)
      }
    }

    run()
    return () => { cancelled = true; controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retryTick])

  return { data, loading, error, retry }
}
