import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, Sparkles, Download, Image as ImageIcon, Sliders, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { TOOL_CREDITS } from '../types/credits'

const CREDITS = TOOL_CREDITS.avatar_creator

// Path padrão pra imagens das variantes no Storage. Cliente sobe imagens reais em
// public-media/booster-templates/avatar-creator/{category}/{variant}.jpg quando tiver assets.
// Enquanto não tiver, o card renderiza placeholder com gradiente + emoji + label.
const ASSET_BASE = 'https://mdueuksfunifyxfqpmdv.supabase.co/storage/v1/object/public/public-media/booster-templates/avatar-creator'

interface Variant {
  id: string
  label: string
  emoji: string
  imageUrl?: string
}

interface Category {
  id: 'pele' | 'corpo' | 'cabelo'
  label: string
  description: string
  variants: Variant[]
}

// Variantes pré-definidas por categoria — mesmo set do TikShop IA, espelhando o PDF do cliente.
const CATEGORIES: Category[] = [
  {
    id: 'pele',
    label: 'Pele',
    description: 'suavização, textura, iluminação',
    variants: [
      { id: 'vintage', label: 'Vintage', emoji: '🎞️', imageUrl: `${ASSET_BASE}/pele/vintage.jpg` },
      { id: 'sexta', label: 'Fresh', emoji: '✨', imageUrl: `${ASSET_BASE}/pele/sexta.jpg` },
      { id: 'atletico', label: 'Atlético', emoji: '💪', imageUrl: `${ASSET_BASE}/pele/atletico.jpg` },
      { id: 'curvilineo', label: 'Curvilíneo', emoji: '🌸', imageUrl: `${ASSET_BASE}/pele/curvilineo.jpg` },
      { id: 'magro', label: 'Magro', emoji: '🪶', imageUrl: `${ASSET_BASE}/pele/magro.jpg` },
      { id: 'pigmentacao', label: 'Pigmentação', emoji: '🎨', imageUrl: `${ASSET_BASE}/pele/pigmentacao.jpg` },
      { id: 'enrugada', label: 'Pele Enrugada', emoji: '👴', imageUrl: `${ASSET_BASE}/pele/enrugada.jpg` },
    ],
  },
  {
    id: 'corpo',
    label: 'Corpo',
    description: 'proporção, definição, ajuste visual',
    variants: [
      { id: 'magro', label: 'Magro', emoji: '🪶', imageUrl: `${ASSET_BASE}/corpo/magro.jpg` },
      { id: 'atletico', label: 'Atlético', emoji: '🏃', imageUrl: `${ASSET_BASE}/corpo/atletico.jpg` },
      { id: 'curvilineo', label: 'Curvilíneo', emoji: '🌸', imageUrl: `${ASSET_BASE}/corpo/curvilineo.jpg` },
      { id: 'pesado', label: 'Pesado', emoji: '🐻', imageUrl: `${ASSET_BASE}/corpo/pesado.jpg` },
      { id: 'musculoso', label: 'Musculoso', emoji: '💪', imageUrl: `${ASSET_BASE}/corpo/musculoso.jpg` },
      { id: 'normal', label: 'Normal', emoji: '👤', imageUrl: `${ASSET_BASE}/corpo/normal.jpg` },
    ],
  },
  {
    id: 'cabelo',
    label: 'Cabelo',
    description: 'estilo, volume, acabamento',
    variants: [
      { id: 'calvo', label: 'Calvo', emoji: '🥚', imageUrl: `${ASSET_BASE}/cabelo/calvo.jpg` },
      { id: 'comprido', label: 'Comprido', emoji: '👱‍♀️', imageUrl: `${ASSET_BASE}/cabelo/comprido.jpg` },
      { id: 'afro', label: 'Afro', emoji: '👨‍🦱', imageUrl: `${ASSET_BASE}/cabelo/afro.jpg` },
      { id: 'curto', label: 'Curto', emoji: '👦', imageUrl: `${ASSET_BASE}/cabelo/curto.jpg` },
      { id: 'punk', label: 'Punk', emoji: '🤘', imageUrl: `${ASSET_BASE}/cabelo/punk.jpg` },
      { id: 'cacheado', label: 'Cacheado', emoji: '👩‍🦱', imageUrl: `${ASSET_BASE}/cabelo/cacheado.jpg` },
    ],
  },
]

type CategoryId = typeof CATEGORIES[number]['id']

export function AvatarCreatorPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [imageUrl, setImageUrl] = useState<string>('')
  const [category, setCategory] = useState<CategoryId>('pele')
  const [variant, setVariant] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const insufficient = credits < CREDITS
  const currentVariants = CATEGORIES.find(c => c.id === category)?.variants ?? []

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
    if (!imageUrl) { toast.error('Suba uma imagem de referência'); return }
    if (!variant) { toast.error(`Selecione uma variante de ${category}`); return }
    if (insufficient) { toast.error(`Créditos insuficientes (precisa ${CREDITS})`); return }

    setGenerating(true); setError(null); setResultUrl(null)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 100_000)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/avatar-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({ image_url: imageUrl, category, variant }),
        signal: controller.signal,
      })
      const data = await r.json()
      if (!r.ok || data?.error) { setError(data?.error || `Erro ${r.status}`); return }
      if (typeof data?.image_url === 'string' && /^https?:\/\//.test(data.image_url)) {
        applyCreditsFromResponse(data)
        setResultUrl(data.image_url)
        toast.success('Avatar gerado!')
      } else if (data?.task_id) {
        applyCreditsFromResponse(data)
        toast.message('Processando — pode levar uns segundos. Atualize em instantes.')
      } else {
        setError('Resposta inesperada da IA. Tente novamente.')
      }
    } catch (err) {
      const e = err as Error
      setError(e.name === 'AbortError' ? 'Tempo excedido. Tente novamente.' : e.message)
    } finally {
      clearTimeout(timeoutId)
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
      a.download = `avatar-${category}-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(resultUrl, '_blank')
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">AVATAR CREATOR</p>
          <h1 className="text-xl font-bold text-white">Crie seu influencer personalizado</h1>
          <p className="text-sm text-white/50">Suba uma imagem e ajuste pele, corpo ou cabelo com IA</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm font-bold">
          {CREDITS} créditos
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Imagem de referência *</p>
            <label className="block">
              {imageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer group">
                  <img src={imageUrl} alt="Referência" className="w-full max-h-64 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all">
                    <span className="text-white/0 group-hover:text-white text-sm font-medium flex items-center gap-2"><Upload size={14} /> Trocar</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 cursor-pointer transition-colors">
                  <Upload size={20} className="text-primary-400" />
                  <p className="text-sm text-white/70">Suba uma foto de referência</p>
                  <p className="text-[11px] text-white/40">PNG, JPG até 7MB</p>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>

          <div>
            <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Tipo de personalização</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCategory(c.id); setVariant('') }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${category === c.id ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/40 mt-1.5 italic">{CATEGORIES.find(c => c.id === category)?.description}</p>
          </div>

          <div>
            <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Variante *</p>
            <div className="grid grid-cols-3 gap-2">
              {currentVariants.map(v => (
                <VariantCard
                  key={v.id}
                  variant={v}
                  selected={variant === v.id}
                  onClick={() => setVariant(v.id)}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || insufficient || !imageUrl || !variant}
            className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Gerando…' : `Gerar — ${CREDITS} cr`}
          </button>

          <p className="text-[11px] text-white/40 text-center">Saldo: <span className="text-neon font-semibold">{credits}</span> créditos</p>

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">{error}</div>}
        </div>

        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3 self-start">
          {resultUrl ? (
            <>
              <p className="text-xs text-white/40 uppercase tracking-wide">Resultado</p>
              <img src={resultUrl} alt="Avatar gerado" className="w-full rounded-lg border border-white/10" />
              <button
                onClick={downloadImage}
                className="w-full py-2.5 rounded-lg bg-surface-400 border border-white/10 text-white text-sm font-medium hover:bg-white/5 cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={14} /> Baixar
              </button>
            </>
          ) : (
            <div className="text-sm text-white/70 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wide">Como funciona</p>
              <ol className="space-y-2 list-decimal list-inside text-[13px]">
                <li>Suba uma foto de referência (rosto / corpo)</li>
                <li>Escolha tipo de personalização: <Sliders size={11} className="inline" /> Pele / Corpo / Cabelo</li>
                <li>Selecione uma variante específica</li>
                <li>Clique Gerar — debita {CREDITS} créditos</li>
                <li>Baixe o resultado</li>
              </ol>
              <div className="bg-surface-400/50 border border-white/5 rounded-lg p-3 text-[12px] flex items-start gap-2">
                <ImageIcon size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
                <p className="text-white/60 leading-relaxed">Fotos com fundo neutro e enquadramento de busto rendem resultados mais naturais.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VariantCard({ variant, selected, onClick }: { variant: Variant; selected: boolean; onClick: () => void }) {
  // Quando imageUrl carrega com sucesso, esconde o placeholder. Senão (404 ou pendente)
  // exibe gradient + emoji + label centralizado.
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
        selected ? 'border-primary-500 ring-2 ring-primary-500/40' : 'border-white/10 hover:border-white/30'
      }`}
    >
      {variant.imageUrl && !imageFailed && (
        <img
          src={variant.imageUrl}
          alt={variant.label}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
      )}
      {(!variant.imageUrl || imageFailed || !imageLoaded) && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-surface-400 to-accent-900/40 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">{variant.emoji}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 px-1.5 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-[11px] font-semibold text-white text-center truncate">{variant.label}</p>
      </div>
      {selected && (
        <div className="absolute top-1.5 right-1.5 bg-primary-500 rounded-full p-0.5">
          <CheckCircle2 size={12} className="text-white" />
        </div>
      )}
    </button>
  )
}
