// E31: replacement pra supabase.functions.invoke().
// Diagnostic provou (00:10:38-00:13:52 UTC, grupopestana.1999@gmail.com):
// supabase.functions.invoke() chamada → 180s timeout → backend ZERO requests.
// Já o client-diagnostic-log (que usa fetch raw) funciona normalmente.
// Conclusão: invoke() pendura na chamada interna auth.getSession() esperando
// refresh de token. fetch raw bypassa esse loop e funciona.
//
// E65 dia 5: adicionado retry silencioso em 401. JWT expira em 1h (padrão Supabase);
// aba aberta muito tempo (background, sleep do SO) faz refresh silencioso do supabase-js
// falhar → token stale no localStorage → edge retorna 401 "Unauthorized". Agora, no
// primeiro 401 a gente força supabase.auth.refreshSession() (chamada isolada, não passa
// pelo getSession pendurado do bug E31) e refaz o fetch UMA vez.
import { supabase } from './supabase'

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

async function doFetch<T>(functionName: string, body: unknown, token: string): Promise<{ ok: boolean; status: number; data: T | null }> {
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
  return { ok: r.ok, status: r.status, data }
}

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
    let attempt = await doFetch<T>(functionName, body, token)

    // E65 dia 5: JWT expirado? Tenta refresh 1x e refaz o fetch.
    if (attempt.status === 401) {
      try {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
        const freshToken = refreshed?.session?.access_token
        if (refreshErr || !freshToken) {
          return { kind: 'response', data: null, error: { message: 'Sua sessão expirou. Atualize a página e tente novamente.' } }
        }
        attempt = await doFetch<T>(functionName, body, freshToken)
      } catch {
        return { kind: 'response', data: null, error: { message: 'Sua sessão expirou. Atualize a página e tente novamente.' } }
      }
    }

    if (!attempt.ok) {
      // E65 dia 7: erro de NEGÓCIO estruturado ({error, code}) volta como `data`, não `error`.
      // Antes virava `error` e as 14 páginas de booster fazem `throw invokeError` ANTES de
      // olhar `data?.error` — então o `code` (ex: 'internal_cap_reached') nunca chegava no
      // tryCapModal/handleGenerationError, e o usuário via o texto cru inline sem o modal
      // "Créditos esgotados!" com o botão de renovação. Cobre 402 (cap/créditos),
      // 403 (booster off) e 429 (rate limit / cota diária).
      const body = attempt.data as { error?: string; code?: string } | null
      if (body?.error) return { kind: 'response', data: attempt.data, error: null }
      // Sem body estruturado (500 sem JSON, gateway) — segue como erro genérico.
      return { kind: 'response', data: null, error: { message: `HTTP ${attempt.status}` } }
    }
    return { kind: 'response', data: attempt.data, error: null }
  } catch (e) {
    return { kind: 'response', data: null, error: { message: 'rede: ' + (e as Error).message } }
  }
}
