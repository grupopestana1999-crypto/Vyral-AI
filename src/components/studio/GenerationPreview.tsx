import { Sparkles, Download, RotateCw } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  status: 'idle' | 'generating' | 'done' | 'error'
  resultUrl: string | null
  errorMessage: string | null
  onRegenerate: () => void
}

export function GenerationPreview({ status, resultUrl, errorMessage, onRegenerate }: Props) {
  async function downloadImage() {
    if (!resultUrl) return
    try {
      const res = await fetch(resultUrl)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `vyral-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Imagem baixada!')
    } catch {
      window.open(resultUrl, '_blank')
    }
  }

  if (status === 'generating') {
    return (
      <div className="bg-surface-300 border border-white/5 rounded-xl p-6 min-h-[400px] flex flex-col items-center justify-center text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-600/20 border border-primary-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-400" />
          </span>
          <span className="text-xs font-semibold text-primary-300">Gerando</span>
        </div>

        {/* Audio waves animadas */}
        <div className="flex items-end gap-1 h-12">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <span
              key={i}
              className="w-1 bg-primary-400 rounded-full animate-wave"
              style={{
                animationDelay: `${i * 0.1}s`,
                height: `${20 + (i % 3) * 15}%`,
              }}
            />
          ))}
        </div>

        <div>
          <p className="text-base font-semibold text-white">Preparando geração</p>
          <p className="text-xs text-white/50 mt-1">Isso pode levar alguns segundos...</p>
        </div>

        <div className="bg-primary-600/10 border border-primary-500/20 rounded-lg p-3 max-w-xs">
          <div className="flex items-start gap-2">
            <Sparkles size={14} className="text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-xs font-semibold text-primary-300">Processamento em segundo plano</p>
              <p className="text-[11px] text-white/50 mt-0.5">Você pode sair desta página — a imagem continuará sendo gerada.</p>
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes wave {
            0%, 100% { transform: scaleY(0.4); opacity: 0.6; }
            50% { transform: scaleY(1.2); opacity: 1; }
          }
          .animate-wave { animation: wave 0.8s ease-in-out infinite; transform-origin: bottom; }
        ` }} />
      </div>
    )
  }

  if (status === 'done' && resultUrl) {
    return (
      <div className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden">
        <div className="relative bg-surface-400">
          <img src={resultUrl} alt="Resultado gerado" className="w-full block" />
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          <button
            onClick={onRegenerate}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-surface-400 border border-white/10 text-white text-sm font-medium hover:bg-surface-200 transition-all cursor-pointer"
          >
            <RotateCw size={14} /> Regerar
          </button>
          <button
            onClick={downloadImage}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-bold hover:brightness-110 transition-all cursor-pointer"
          >
            <Download size={14} /> Baixar
          </button>
        </div>
      </div>
    )
  }

  if (status === 'error' && errorMessage) {
    return (
      <div className="bg-surface-300 border border-red-500/20 rounded-xl p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
          <Sparkles size={22} className="text-red-400" />
        </div>
        <p className="text-sm font-semibold text-white mb-1">Falhou ao gerar</p>
        <p className="text-xs text-white/50 max-w-xs">{errorMessage}</p>
        <p className="text-[10px] text-white/30 mt-3">Se créditos foram debitados, foram estornados.</p>
        <button
          onClick={onRegenerate}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
        >
          <RotateCw size={14} /> Tentar de novo
        </button>
      </div>
    )
  }

  // idle
  return (
    <div className="bg-surface-300 border border-white/5 rounded-xl p-6 min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary-600/10 flex items-center justify-center mx-auto mb-3">
          <Sparkles size={24} className="text-primary-400" />
        </div>
        <p className="text-white/50 font-medium">Seu conteúdo aparecerá aqui</p>
        <p className="text-white/30 text-sm">Configure e gere sua imagem</p>
      </div>
    </div>
  )
}
