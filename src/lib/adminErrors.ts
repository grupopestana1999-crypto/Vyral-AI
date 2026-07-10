// E65 dia 3: helper pra extrair mensagem util de FunctionsHttpError do supabase-js.
//
// Problema: quando uma edge function retorna 4xx/5xx, o supabase-js só devolve
// `error.message = "Edge Function returned a non-2xx status code"`. O body JSON
// (com `{error: 'user_exists', ...}`) fica em `error.context.body` como string
// ou stream, não é parseado automaticamente. Resultado: admin via toast genérico
// em vez do motivo real.
//
// Uso:
//   const { data, error } = await supabase.functions.invoke('admin-update-user', { body })
//   if (error || (data && (data as { error?: string }).error)) {
//     toast.error(await extractEdgeError(error, data))
//     return
//   }

interface EdgeErrorContext {
  body?: unknown
  status?: number
}

interface EdgeErrorLike {
  message?: string
  context?: EdgeErrorContext
}

interface EdgeErrorBody {
  error?: string
  user_id?: string
}

export async function extractEdgeError(error: unknown, data?: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as EdgeErrorBody).error
    if (err) return mapErrorCode(String(err))
  }

  const errObj = error as EdgeErrorLike | null | undefined
  const ctx = errObj?.context
  if (ctx?.body !== undefined) {
    try {
      let body: unknown = ctx.body
      if (typeof body === 'string') body = JSON.parse(body)
      else if (body && typeof (body as Response).text === 'function') {
        // supabase-js pode devolver a Response cru
        const text = await (body as Response).text()
        body = text ? JSON.parse(text) : null
      }
      const parsed = body as EdgeErrorBody | null
      if (parsed?.error) return mapErrorCode(String(parsed.error))
    } catch {
      // body não é JSON válido — cai no fallback
    }
  }

  return errObj?.message ?? 'Erro desconhecido'
}

function mapErrorCode(err: string): string {
  const literal: Record<string, string> = {
    user_exists: 'Este email já existe no sistema. Se o usuário foi excluído antes, use "Trocar email" no perfil dele.',
    invalid_email: 'Email inválido.',
    invalid_plan: 'Plano inválido.',
    forbidden: 'Você não tem permissão pra essa ação.',
    unauthorized: 'Sessão expirada. Faça login de novo.',
  }
  if (literal[err]) return literal[err]

  if (err.startsWith('create_failed:')) return 'Falha ao criar em auth: ' + err.replace('create_failed:', '').trim()
  if (err.startsWith('sub_create_failed:')) return 'Falha ao criar subscription: ' + err.replace('sub_create_failed:', '').trim()

  return err
}
