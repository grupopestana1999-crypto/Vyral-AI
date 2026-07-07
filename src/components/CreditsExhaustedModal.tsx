import { X, AlertCircle, MessageCircle } from 'lucide-react'
import { useGenerationErrorStore } from '../stores/generation-error-store'

// E65: modal exibido quando o backend retorna `code: 'internal_cap_reached'`
// (usuário atingiu o cap oculto de créditos). Bloqueia geração e orienta
// o usuário a contatar o suporte.
const SUPPORT_LINK = 'https://wa.me/5511999999999?text=Ol%C3%A1%2C%20meus%20cr%C3%A9ditos%20foram%20esgotados%20no%20Vyral%20AI%20e%20preciso%20de%20reativa%C3%A7%C3%A3o.'

export function CreditsExhaustedModal() {
  const open = useGenerationErrorStore(s => s.capExhaustedOpen)
  const close = useGenerationErrorStore(s => s.closeCapExhausted)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={close}>
      <div className="bg-surface-300 border border-red-500/30 rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Créditos esgotados</h3>
          </div>
          <button onClick={close} className="text-white/40 hover:text-white cursor-pointer" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-white/70 leading-relaxed">
          Você atingiu o limite de créditos da sua conta.<br />
          Entre em contato com o suporte para reativação.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href={SUPPORT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary-600 text-white font-semibold text-sm hover:brightness-110 transition-all"
          >
            <MessageCircle size={16} /> Falar com o suporte
          </a>
          <button
            onClick={close}
            className="w-full py-2.5 rounded-lg bg-surface-400 text-white/70 hover:text-white text-sm font-medium cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
