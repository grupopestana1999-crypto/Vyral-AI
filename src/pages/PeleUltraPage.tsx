import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, Sparkles, Download } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { TOOL_CREDITS } from '../types/credits'
import { invokeRaw } from '../lib/invokeRaw'
import { HistoryTab } from '../components/boosters/HistoryTab'

const CREDITS = TOOL_CREDITS.skin_enhancer

type Tab = 'criar' | 'historico'

export function PeleUltraPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0
  const isUnlimited = !!subscription?.unlimited_daily // E53: modelo cota não bloqueia por crédito

  const [tab, setTab] = useState<Tab>('criar')
  const [imageUrl, setImageUrl] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [historyRefresh, setHistoryRefresh] = useState(0)

  const insufficient = !isUnlimited && credits < CREDITS

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await resizeImageFile(file, 1280, 0.85)
      setImageUrl(data); setResultUrl(null); setError(null)
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally { e.target.value = '' }
  }

  async function handleGenerate() {
    if (!imageUrl) { toast.error('Suba uma imagem primeiro'); return }
    if (insufficient) { toast.error(`Créditos insuficientes (precisa ${CREDITS})`); return }

    setGenerating(true); setError(null); setResultUrl(null)
    try {
      // E43: invokeRaw em vez de supabase.functions.invoke() — invoke() pendura silenciosamente
      // sem fazer HTTP em sessões longas (cliente reportou "tempo excedido 2x" sem nada chegar
      // no backend, mesmo padrão dos boosters migrados em E31).
      const invokePromise = invokeRaw<{ image_url?: string; task_id?: string; error?: string; credits_remaining?: number }>('skin-enhancer', {
        image_url: imageUrl,
      })
      const timeoutPromise = new Promise<{ kind: 'timeout' }>(res => setTimeout(() => res({ kind: 'timeout' }), 180_000))
      const result = await Promise.race([invokePromise, timeoutPromise])
      if (result.kind === 'timeout') {
        setError('Tempo excedido. A geração pode estar em andamento — veja o Histórico ou tente de novo.')
        return
      }
      const { data, error: invokeError } = result
      if (invokeError) throw invokeError
      if (data?.error) { setError(data.error); return }
      if (typeof data?.image_url === 'string' && /^https?:\/\//.test(data.image_url)) {
        applyCreditsFromResponse(data)
        setResultUrl(data.image_url)
        setHistoryRefresh(prev => prev + 1)
        toast.success('Pele aprimorada!')
      } else if (data?.task_id) {
        applyCreditsFromResponse(data)
        toast.message('Processando — pode levar uns segundos.')
      } else {
        setError('Resposta inesperada da IA. Tente novamente.')
      }
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Falha ao aprimorar pele')
    } finally {
      setGenerating(false)
    }
  }

  async function downloadImage() {
    if (!resultUrl) return
    try {
      const res = await fetch(resultUrl)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `pele-ultra-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(resultUrl, '_blank')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">PELE ULTRA REALISTA</p>
          <h1 className="text-xl font-bold text-white">Skin Enhancer</h1>
          <p className="text-sm text-white/50">Aprimore texturas da pele com realismo extremo</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm font-bold">
          {CREDITS} créditos
        </div>
      </div>

      <div className="flex gap-1 bg-surface-300 rounded-xl p-1 max-w-md">
        <button onClick={() => setTab('criar')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'criar' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Criar</button>
        <button onClick={() => setTab('historico')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'historico' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Histórico</button>
      </div>

      {tab === 'criar' ? (
      <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
        {!resultUrl ? (
          <label className="block">
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer group">
                <img src={imageUrl} alt="Imagem" className="w-full max-h-[480px] object-contain bg-black/30" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all">
                  <span className="text-white/0 group-hover:text-white text-sm font-medium flex items-center gap-2"><Upload size={14} /> Trocar imagem</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-20 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 cursor-pointer transition-colors">
                <Upload size={28} className="text-primary-400" />
                <p className="text-sm text-white/80 font-medium">SKIN ENHANCER</p>
                <p className="text-xs text-white/50 text-center max-w-xs">Faça upload da sua imagem para aprimorar textura e qualidade da pele</p>
                <p className="text-[11px] text-white/40 mt-2 inline-flex items-center gap-1">
                  <Upload size={11} /> Upload Media
                </p>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wide">Antes / Depois</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[11px] text-white/50 font-medium uppercase tracking-wide">Antes</p>
                <div className="aspect-square rounded-lg border border-white/10 overflow-hidden bg-black/30 flex items-center justify-center">
                  <img src={imageUrl} alt="Original" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] text-neon font-medium uppercase tracking-wide">Depois</p>
                <div className="aspect-square rounded-lg border border-neon/30 overflow-hidden bg-black/30 flex items-center justify-center">
                  <img src={resultUrl} alt="Aprimorada" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setResultUrl(null); setImageUrl('') }}
                className="py-2.5 rounded-lg bg-surface-400 border border-white/10 text-white text-sm font-medium hover:bg-white/5 cursor-pointer"
              >
                Nova imagem
              </button>
              <button
                onClick={downloadImage}
                className="py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:brightness-110 cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={14} /> Baixar
              </button>
            </div>
          </div>
        )}

        {!resultUrl && (
          <button
            onClick={handleGenerate}
            disabled={generating || insufficient || !imageUrl}
            className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Aprimorando…' : `Gerar — ${CREDITS} cr`}
          </button>
        )}

        <p className="text-[11px] text-white/40 text-center">Saldo: <span className="text-neon font-semibold">{credits}</span> créditos</p>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">{error}</div>}
      </div>
      ) : (
        <HistoryTab tool="skin_enhancer" mediaType="image" aspectRatio="1:1" refreshTrigger={historyRefresh} />
      )}

      {tab === 'criar' && (
      <div className="bg-surface-300 border border-white/5 rounded-xl p-4 text-sm text-white/70">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-2">O que é otimizado</p>
        <ul className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[12px] list-disc list-inside">
          <li>Suavização de pele</li>
          <li>Melhoria de textura</li>
          <li>Redução de imperfeições</li>
          <li>Aspecto natural (sem efeito artificial)</li>
        </ul>
      </div>
      )}
    </div>
  )
}
