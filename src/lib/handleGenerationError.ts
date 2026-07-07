import { toast } from 'sonner'
import { useGenerationErrorStore } from '../stores/generation-error-store'

// E65: helpers centrais pra tratar erros do backend.
//   tryCapModal(data)          → abre modal se cap oculto (retorna true se abriu)
//   handleGenerationError(...) → tryCapModal + toast pros demais
// Páginas que usam setError local (inline) chamam tryCapModal antes.
interface BackendError {
  error?: string
  code?: string
}

export function tryCapModal(data: BackendError | null | undefined): boolean {
  if (data?.code === 'internal_cap_reached') {
    useGenerationErrorStore.getState().openCapExhausted()
    return true
  }
  return false
}

export function handleGenerationError(data: BackendError | null | undefined, fallback = 'Falha na geração. Tente de novo.') {
  if (tryCapModal(data)) return
  toast.error(data?.error ?? fallback)
}
