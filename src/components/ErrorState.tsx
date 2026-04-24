import { AlertTriangle, RotateCw } from 'lucide-react'

interface Props {
  message: string
  onRetry: () => void
  compact?: boolean
}

export function ErrorState({ message, onRetry, compact = false }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`}>
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
        <AlertTriangle size={24} className="text-red-400" />
      </div>
      <p className="text-sm text-white/80 mb-1">Não foi possível carregar</p>
      <p className="text-xs text-white/50 max-w-sm mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
      >
        <RotateCw size={14} /> Tentar de novo
      </button>
    </div>
  )
}
