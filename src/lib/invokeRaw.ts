// E31: replacement pra supabase.functions.invoke().
// Diagnostic provou (00:10:38-00:13:52 UTC, grupopestana.1999@gmail.com):
// supabase.functions.invoke() chamada → 180s timeout → backend ZERO requests.
// Já o client-diagnostic-log (que usa fetch raw) funciona normalmente.
// Conclusão: invoke() pendura na chamada interna auth.getSession() esperando
// refresh de token. fetch raw bypassa esse loop e funciona.

const SUPABASE_URL = 'https://mdueuksfunifyxfqpmdv.supabase.co'
const STORAGE_KEY = 'sb-mdueuksfunifyxfqpmdv-auth-token'

function getTokenSync(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { access_token?: string }
    return parsed?.access_token || null
  } catch { return null }
}

export type InvokeResult<T = unknown> =
  | { kind: 'response'; data: T | null; error: null }
  | { kind: 'response'; data: null; error: { message: string } }

/**
 * Fetch raw direto pra edge function. Bypassa supabase-js v2 invoke().
 * Compatível com a shape `{kind: 'response', data, error}` que os boosters esperam.
 */
export async function invokeRaw<T = unknown>(
  functionName: string,
  body: unknown,
): Promise<InvokeResult<T>> {
  const token = getTokenSync()
  if (!token) {
    return { kind: 'response', data: null, error: { message: 'sessão expirada — faça login de novo' } }
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    let data: T | null = null
    try { data = await r.json() } catch { data = null }
    if (!r.ok) {
      const errMsg = (data as { error?: string } | null)?.error || `HTTP ${r.status}`
      return { kind: 'response', data: null, error: { message: errMsg } }
    }
    return { kind: 'response', data, error: null }
  } catch (e) {
    return { kind: 'response', data: null, error: { message: 'rede: ' + (e as Error).message } }
  }
}
