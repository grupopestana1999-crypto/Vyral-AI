// E29: instrumentação client-side pra capturar eventos do app no banco.
// Bug "2ª geração trava no Mac/Chrome do cliente" não consegui reproduzir em
// Playwright Windows. Logamos eventos de cada handleGenerate pra ver onde quebra
// na sessão real do cliente.

const ENDPOINT = 'https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/client-diagnostic-log'

let cachedEmail: string | null = null
export function setDiagnosticEmail(email: string | null) {
  cachedEmail = email
}

export function logEvent(event: string, page: string, payload?: Record<string, unknown>): void {
  try {
    const body = {
      event,
      page,
      user_email: cachedEmail,
      payload: {
        ts: Date.now(),
        url: typeof location !== 'undefined' ? location.pathname : '',
        ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '',
        sw_active: typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller,
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        ...(payload || {}),
      },
    }
    // keepalive: garante que log sai mesmo se aba fecha logo após
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => { /* fire-and-forget, falha silenciosa */ })
  } catch { /* nunca quebrar app por causa de instrumentação */ }
}
