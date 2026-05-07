import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, Sparkles, Download, Image as ImageIcon, Sliders, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { TOOL_CREDITS } from '../types/credits'
import { logEvent } from '../lib/clientDiagnostic'

const CREDITS = TOOL_CREDITS.avatar_creator

// URLs Higgsfield CDN fornecidas pelo cliente em "ultimos ajustes boosters" (2026-04-28).
// Cliente substitui no futuro se precisar customizar.
const HIGGS = (path: string) => `https://higgsfield.ai/cdn-cgi/image/fit=scale-down,format=webp,onerror=redirect,width=1280,quality=85/https://cdn.higgsfield.ai/ai_influencer_option/${path}.webp`

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

const CATEGORIES: Category[] = [
  {
    id: 'pele',
    label: 'Pele',
    description: 'condição, textura, pigmentação',
    variants: [
      { id: 'vitiligo', label: 'Vitiligo', emoji: '🧬', imageUrl: HIGGS('bf0f7520-a41a-46b9-b41c-7dc030c22b8b') },
      { id: 'sardas', label: 'Sardas', emoji: '✨', imageUrl: HIGGS('a657e9c1-02b6-4083-a058-5f78e56a77ac') },
      { id: 'albinismo', label: 'Albinismo', emoji: '🤍', imageUrl: HIGGS('6069e93f-31ce-4840-8e48-c81daee56be0') },
      { id: 'cicatrizes', label: 'Cicatrizes', emoji: '🩹', imageUrl: HIGGS('9d28dcde-2709-4fa8-8f61-8a76798b0e1f') },
      { id: 'pigmentacao', label: 'Pigmentação', emoji: '🎨', imageUrl: HIGGS('a9e6b3c8-9ab5-4fe3-8b99-5c5fbfa9665c') },
      { id: 'enrugada', label: 'Pele Enrugada', emoji: '👴', imageUrl: HIGGS('26f07d76-57a7-4975-b18b-80a5fa2137c5') },
    ],
  },
  {
    id: 'corpo',
    label: 'Corpo',
    description: 'proporção, definição, ajuste visual',
    variants: [
      { id: 'magro', label: 'Magro', emoji: '🪶', imageUrl: HIGGS('dadf681a-d007-4ac7-96f0-cb14673687b5') },
      { id: 'atletico', label: 'Atlético', emoji: '🏃', imageUrl: HIGGS('142ea702-6816-4933-8f42-4b65cade3a8c') },
      { id: 'curvilineo', label: 'Curvilíneo', emoji: '🌸', imageUrl: HIGGS('2bb2fe58-8099-4d62-97f5-5742e564a31f') },
      { id: 'pesado', label: 'Pesado', emoji: '🐻', imageUrl: HIGGS('c6198edf-f21d-4e3e-9ac5-d4a3333ceb6f') },
      { id: 'muscular', label: 'Muscular', emoji: '💪', imageUrl: HIGGS('16b7cb85-e2b6-42ac-8d22-30edb28d8eb2') },
      { id: 'normal', label: 'Normal', emoji: '👤', imageUrl: HIGGS('d077688b-6a9a-4cb5-9bfb-b62c06fc7f2b') },
    ],
  },
  {
    id: 'cabelo',
    label: 'Cabelo',
    description: 'estilo, volume, acabamento',
    variants: [
      { id: 'calvo', label: 'Calvo', emoji: '🥚', imageUrl: HIGGS('ca8b2954-900c-424f-9fda-acc5c37d58dd') },
      { id: 'comprido', label: 'Comprido', emoji: '👱‍♀️', imageUrl: HIGGS('9145dee8-7136-4ee9-a464-20268fed4a37') },
      { id: 'afro', label: 'Afro', emoji: '👨‍🦱', imageUrl: HIGGS('7fc8fcc7-310f-406c-94c2-c4fc56568d40') },
      { id: 'curto', label: 'Curto', emoji: '👦', imageUrl: HIGGS('383399be-fe36-4196-9b45-f328cf40eb1e') },
      { id: 'punk', label: 'Punk', emoji: '🤘', imageUrl: HIGGS('a6555ba9-bd9b-4839-898d-3758e9788d18') },
      { id: 'cacheado', label: 'Cacheado', emoji: '👩‍🦱', imageUrl: HIGGS('b3c8c28b-c19d-49bf-8223-42a5e3a66edb') },
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
  // E27: nano-banana-pro com image_urls (edit mode) leva 90-120s, ultrapassa o
  // KIE_POLL_TIMEOUT_MS (80s) da edge function. Quando volta task_id pending,
  // poll client-side a cada 5s até completar — evita "Processando..." sem feedback.
  const [pendingTask, setPendingTask] = useState<{ taskId: string; startedAt: number } | null>(null)
  const [elapsedS, setElapsedS] = useState(0)
  // E30: ref síncrono pra impedir 2º click ANTES do React propagar disabled
  const generatingRef = useRef(false)

  const insufficient = credits < CREDITS
  const currentVariants = CATEGORIES.find(c => c.id === category)?.variants ?? []

  // E29: snapshot pra debug bug "2ª trava"
  useEffect(() => {
    logEvent('page_mount', 'avatar-creator', {
      sw_active: !!navigator.serviceWorker?.controller,
      sw_registered: !!navigator.serviceWorker,
      online: navigator.onLine,
      hasAuth: !!localStorage.getItem('sb-mdueuksfunifyxfqpmdv-auth-token'),
      lsKeys: Object.keys(localStorage).filter(k => k.includes('vyral') || k.includes('sb-')).length,
    })
  }, [])

  // Polling Kie quando edge function retornou task_id pending
  useEffect(() => {
    if (!pendingTask) return
    let cancelled = false
    const tick = setInterval(() => {
      if (!cancelled) setElapsedS(Math.floor((Date.now() - pendingTask.startedAt) / 1000))
    }, 1000)
    async function poll() {
      if (cancelled) return
      try {
        const { data, error } = await supabase.functions.invoke('check-kie-task', {
          body: { task_id: pendingTask!.taskId, tool_name: 'avatar_creator' },
        })
        if (cancelled) return
        if (error) return
        if (data?.status === 'success' && typeof data?.result_url === 'string') {
          setResultUrl(data.result_url)
          setPendingTask(null)
          toast.success('Avatar gerado!')
        } else if (data?.status === 'failed') {
          setError(data.error || 'Geração falhou na Kie')
          setPendingTask(null)
        }
      } catch { /* silent */ }
    }
    poll()
    const pollInterval = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(tick)
      clearInterval(pollInterval)
    }
  }, [pendingTask])

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
    const tStart = Date.now()
    // E30: ref guard SÍNCRONO. Bloqueia 2º click ANTES do React propagar disabled.
    if (generatingRef.current) {
      logEvent('early_return', 'avatar-creator', { reason: 'already-generating-ref' })
      return
    }
    generatingRef.current = true
    logEvent('click_received', 'avatar-creator', {
      hasImage: !!imageUrl, category, variant,
      credits, hasPendingTask: !!pendingTask, generating,
    })
    if (!imageUrl) {
      generatingRef.current = false
      logEvent('early_return', 'avatar-creator', { reason: 'no-image' })
      toast.error('Suba uma imagem de referência'); return
    }
    if (!variant) {
      generatingRef.current = false
      logEvent('early_return', 'avatar-creator', { reason: 'no-variant' })
      toast.error(`Selecione uma variante de ${category}`); return
    }
    if (insufficient) {
      generatingRef.current = false
      logEvent('early_return', 'avatar-creator', { reason: 'insufficient-credits' })
      toast.error(`Créditos insuficientes (precisa ${CREDITS})`); return
    }
    logEvent('validations_passed', 'avatar-creator')

    setGenerating(true); setError(null); setResultUrl(null)
    try {
      logEvent('invoke_dispatched', 'avatar-creator')
      // E24: removido `await supabase.auth.getSession()` defensivo. supabase-js já
      // anexa o bearer token automaticamente em invoke(). O await explícito travava
      // o frontend quando o auto-refresh interno do client estava pendurado, o que
      // explicava o "carregando sem fim" relatado mesmo com Promise.race depois.
      const invokePromise = supabase.functions.invoke('avatar-creator', {
        body: { image_url: imageUrl, category, variant },
      }).then(r => ({ kind: 'response' as const, ...r }))
      // E28: timeout 180s pra dar margem confortável sobre KIE_POLL_TIMEOUT_MS (80s)
      // do backend + tempo de roundtrip da rede do cliente. Antes 90s era apertado
      // demais, gerava "tempo excedido" em rede um pouco lenta.
      const timeoutPromise = new Promise<{ kind: 'timeout' }>(res => setTimeout(() => res({ kind: 'timeout' }), 180_000))
      const result = await Promise.race([invokePromise, timeoutPromise])
      const elapsed = Date.now() - tStart
      if (result.kind === 'timeout') {
        logEvent('invoke_timeout', 'avatar-creator', { elapsedMs: elapsed })
        setError('Tempo excedido. A geração pode estar em andamento — veja o Histórico do booster ou tente de novo.')
        return
      }
      const { data, error: invokeError } = result
      logEvent('invoke_response', 'avatar-creator', {
        elapsedMs: elapsed,
        hasError: !!invokeError,
        hasData: !!data,
        hasImageUrl: !!data?.image_url,
        hasTaskId: !!data?.task_id,
        hasErrorField: !!data?.error,
      })
      if (invokeError) throw invokeError
      if (data?.error) { setError(data.error); return }
      if (typeof data?.image_url === 'string' && /^https?:\/\//.test(data.image_url)) {
        applyCreditsFromResponse(data)
        setResultUrl(data.image_url)
        toast.success('Avatar gerado!')
      } else if (data?.task_id) {
        applyCreditsFromResponse(data)
        setPendingTask({ taskId: data.task_id, startedAt: Date.now() })
        setElapsedS(0)
      } else {
        setError('Resposta inesperada da IA. Tente novamente.')
      }
    } catch (err) {
      const e = err as Error
      logEvent('invoke_catch', 'avatar-creator', { msg: String(e.message).slice(0, 200) })
      setError(e.message || 'Falha ao gerar avatar')
    } finally {
      logEvent('finally_reached', 'avatar-creator')
      generatingRef.current = false
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
            disabled={generating || !!pendingTask || insufficient || !imageUrl || !variant}
            className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating || pendingTask ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Enviando…' : pendingTask ? 'Aguardando IA…' : `Gerar — ${CREDITS} cr`}
          </button>

          <p className="text-[11px] text-white/40 text-center">Saldo: <span className="text-neon font-semibold">{credits}</span> créditos</p>

          {pendingTask && (
            <div className="bg-surface-400 border border-white/10 rounded-lg p-3 flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-primary-400 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-white font-medium">Gerando avatar…</p>
                <p className="text-[10px] text-white/50">{Math.floor(elapsedS / 60)}:{String(elapsedS % 60).padStart(2, '0')} · pode levar 1-2min</p>
              </div>
            </div>
          )}

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
