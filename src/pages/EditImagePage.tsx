import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Coins, Loader2, Upload, Sparkles, Download, Image as ImageIcon } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { BeforeAfterSlider } from '../components/BeforeAfterSlider'
import { BOOSTER_BY_SLUG } from '../types/boosters'
import { LazyVideo } from '../components/LazyVideo'

export function EditImagePage() {
  const navigate = useNavigate()
  const booster = BOOSTER_BY_SLUG['edit-image']
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [imageUrl, setImageUrl] = useState<string>('')
  const [maskPrompt, setMaskPrompt] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasInsufficientCredits = booster && booster.credits > 0 && credits < booster.credits

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageUrl(reader.result as string)
      setResultUrl(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  async function handleGenerate() {
    if (!imageUrl) { toast.error('Escolha uma imagem primeiro'); return }
    if (!editPrompt.trim()) { toast.error('Descreva o que você quer editar'); return }

    setGenerating(true)
    setError(null)
    setResultUrl(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('edit-image-inpaint', {
        body: { image_url: imageUrl, edit_prompt: editPrompt, mask_prompt: maskPrompt }
      })
      if (fnError) throw new Error(fnError.message)
      if (data?.error) {
        setError(data.error + (data.details ? ` (${data.details})` : ''))
        return
      }
      const outUrl = data?.result || data?.image_url
      if (outUrl) {
        setResultUrl(outUrl)
        toast.success('Imagem editada!')
      } else {
        setError('Resposta inesperada da IA. Tente novamente.')
      }
    } catch (err) {
      setError((err as Error).message)
      toast.error('Erro ao gerar edição')
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
      a.download = `editada-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(resultUrl, '_blank')
    }
  }

  if (!booster) return null

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      {/* Header com vídeo de preview */}
      <div className="relative h-44 md:h-56 rounded-2xl overflow-hidden">
        <div className="absolute inset-0">
          <LazyVideo src={booster.videoUrl} className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-end p-5">
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-primary-400" />
                <span className="text-xs text-white/60 uppercase tracking-wide">Booster</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{booster.title}</h1>
              <p className="text-sm text-white/70">{booster.description}</p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-600/90 text-white text-sm font-bold">
              <Coins size={14} /> {booster.credits}
            </div>
          </div>
        </div>
      </div>

      {/* Grid 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Esquerda: Imagem original + prompts */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Imagem original</h3>

          <label className="block">
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer group">
                <img src={imageUrl} alt="Original" className="w-full object-cover max-h-80" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all">
                  <span className="text-white/0 group-hover:text-white/80 text-sm font-medium flex items-center gap-2">
                    <Upload size={14} /> Trocar imagem
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 cursor-pointer transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary-600/20 flex items-center justify-center">
                  <Upload size={20} className="text-primary-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/80">Arraste ou clique pra escolher uma imagem</p>
                  <p className="text-[11px] text-white/40">JPG, PNG ou WEBP</p>
                </div>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>

          <div>
            <label className="text-sm text-white/70 mb-1.5 block">O que você quer trocar? <span className="text-white/30 text-[10px]">(opcional)</span></label>
            <input
              type="text"
              value={maskPrompt}
              onChange={e => setMaskPrompt(e.target.value)}
              placeholder="Ex: fundo, camiseta, produto"
              className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="text-sm text-white/70 mb-1.5 block">Como quer que fique? *</label>
            <textarea
              value={editPrompt}
              onChange={e => setEditPrompt(e.target.value)}
              placeholder="Ex: trocar fundo por praia ao entardecer, com palmeiras e iluminação quente"
              rows={3}
              className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500 resize-none"
            />
          </div>

          {hasInsufficientCredits && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              Créditos insuficientes. Você tem {credits}, mas precisa de {booster.credits}.
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || hasInsufficientCredits || !imageUrl || !editPrompt.trim()}
            className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Gerando...' : `Gerar edição (${booster.credits} créditos)`}
          </button>
        </div>

        {/* Direita: Resultado */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 min-h-[400px] flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-4">Resultado</h3>
          {error ? (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <div>
                <p className="text-red-400 text-sm mb-1">❌ {error}</p>
                <p className="text-[11px] text-white/40">Se créditos foram debitados, foram estornados automaticamente.</p>
              </div>
            </div>
          ) : generating ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="text-primary-400 animate-spin" />
              <p className="text-white/60 text-sm">A IA está editando sua imagem...</p>
              <p className="text-white/30 text-[11px]">pode levar 10-30 segundos</p>
            </div>
          ) : resultUrl && imageUrl ? (
            <div className="space-y-3 flex-1 flex flex-col">
              <BeforeAfterSlider before={imageUrl} after={resultUrl} alt="Comparação antes e depois" />
              <p className="text-[11px] text-white/40 text-center">Arraste o slider pra comparar</p>
              <button
                onClick={downloadImage}
                className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:brightness-110 transition-all cursor-pointer"
              >
                <Download size={14} /> Baixar imagem
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <div className="w-14 h-14 rounded-full bg-primary-600/10 flex items-center justify-center mx-auto mb-3">
                  <ImageIcon size={22} className="text-primary-400" />
                </div>
                <p className="text-white/50 text-sm">Sua imagem editada aparece aqui</p>
                <p className="text-white/30 text-xs mt-1">Suba a original e descreva o que editar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
