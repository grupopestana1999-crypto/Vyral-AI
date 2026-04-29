import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Check, Loader2, Upload, Wand2, ImageIcon, Video, Zap, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'
import { toast } from 'sonner'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { useBoosterSettings } from '../stores/booster-settings-store'

type Step = 'studio_image' | 'edit_image' | 'avatar_creator' | 'skin_enhancer' | 'grok_video' | 'veo_video' | 'kling_3'

interface WorkflowTemplate {
  id: string
  title: string
  description: string
  emoji: string
  steps: Step[]
  prompts: { [k in Step]?: string }
  outputType: 'image' | 'video'
  outputLabel: string
}

const TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'ugc_express',
    title: 'UGC Express',
    description: 'Pessoa segurando seu produto + cenário casa + vídeo animado pronto pra TikTok Shop',
    emoji: '🎬',
    steps: ['edit_image', 'grok_video'],
    prompts: {
      edit_image: 'Mantenha a pessoa segurando o produto, troque o cenário pra um ambiente caseiro aconchegante (sala/cozinha) com iluminação natural. Estilo UGC autêntico, foto casual.',
      grok_video: 'Pessoa demonstrando o produto naturalmente, leve movimento de câmera, ambiente caseiro. Estilo UGC autêntico TikTok.',
    },
    outputType: 'video',
    outputLabel: 'Vídeo UGC final',
  },
  {
    id: 'antes_depois',
    title: 'Antes & Depois',
    description: 'Pegue uma imagem e gere a versão "antes" sem o produto + "depois" com pele realista pra skincare/beauty',
    emoji: '✨',
    steps: ['edit_image', 'skin_enhancer'],
    prompts: {
      edit_image: 'Cenário antes: pessoa com pele com imperfeições naturais (acne, vermelhidão, manchas), iluminação neutra. Mantenha identidade facial.',
    },
    outputType: 'image',
    outputLabel: 'Comparativo antes/depois',
  },
  {
    id: 'avatar_reels',
    title: 'Avatar Reels',
    description: 'Crie um avatar personalizado e gere vídeo dele falando seu pitch de vendas',
    emoji: '🎭',
    steps: ['avatar_creator', 'veo_video'],
    prompts: {
      veo_video: 'Avatar falando naturalmente pra câmera, expressão confiante, ambiente moderno bem iluminado. Lip-sync preciso.',
    },
    outputType: 'video',
    outputLabel: 'Vídeo avatar narrador',
  },
  {
    id: 'cinematic',
    title: 'Cinematic Brand',
    description: 'Imagem de produto + vídeo cinemático com áudio nativo pra anúncios premium',
    emoji: '🎥',
    steps: ['edit_image', 'kling_3'],
    prompts: {
      edit_image: 'Cenário cinematográfico premium pra produto, iluminação dramática, profundidade de campo. Estilo brand campaign luxury.',
      kling_3: 'Cena cinematográfica do produto em destaque, movimento suave de câmera, iluminação volumétrica, qualidade de campanha de marca premium.',
    },
    outputType: 'video',
    outputLabel: 'Vídeo cinematográfico',
  },
]

interface StepRun {
  step: Step
  status: 'idle' | 'running' | 'success' | 'error'
  result_url?: string
  error?: string
  credits?: number
}

export function SuperVyralPage() {
  const navigate = useNavigate()
  const { user, subscription } = useAuthStore()
  const isActive = useBoosterSettings(s => s.isActive)
  const [selectedTpl, setSelectedTpl] = useState<WorkflowTemplate | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [productDesc, setProductDesc] = useState('')
  const [running, setRunning] = useState(false)
  const [runs, setRuns] = useState<StepRun[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalCreditsEstimated = selectedTpl ? selectedTpl.steps.reduce((sum, s) => {
    if (s === 'kling_3') return sum + 35 // 5s no_audio
    if (s === 'grok_video') return sum + 10 // 5s
    if (s === 'veo_video') return sum + 15 // lite
    if (s === 'edit_image' || s === 'avatar_creator') return sum + 2
    if (s === 'skin_enhancer') return sum + 4
    return sum + 2
  }, 0) : 0

  if (!isActive('super_vyral') && false) {
    // Reservado: caso queira fechar acesso por flag de banco no futuro
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile || !user?.id) return null
    const path = `super-vyral/${user.id}/${Date.now()}.jpg`
    const { error } = await supabase.storage.from('public-media').upload(path, imageFile, { contentType: imageFile.type, upsert: false })
    if (error) { toast.error('Erro ao subir imagem: ' + error.message); return null }
    const { data } = supabase.storage.from('public-media').getPublicUrl(path)
    return data?.publicUrl ?? null
  }

  async function runWorkflow() {
    if (!selectedTpl || !imageFile) { toast.error('Suba uma imagem e selecione um template'); return }
    if (!productDesc.trim()) { toast.error('Descreva brevemente o produto/cena'); return }
    setRunning(true)
    setRuns(selectedTpl.steps.map(s => ({ step: s, status: 'idle' })))

    let currentImageUrl = await uploadImage()
    if (!currentImageUrl) { setRunning(false); return }

    let lastResultUrl = currentImageUrl

    for (let i = 0; i < selectedTpl.steps.length; i++) {
      const step = selectedTpl.steps[i]
      setRuns(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r))

      const fnName = step === 'kling_3' ? 'generate-kling3-video'
        : step === 'grok_video' ? 'generate-grok-video'
        : step === 'veo_video' ? 'generate-veo-video'
        : step === 'edit_image' ? 'edit-image-inpaint'
        : step === 'avatar_creator' ? 'avatar-creator'
        : step === 'skin_enhancer' ? 'skin-enhancer'
        : ''
      if (!fnName) continue

      const prompt = (selectedTpl.prompts[step] ?? '') + ' Produto: ' + productDesc
      const isVideo = step === 'kling_3' || step === 'grok_video' || step === 'veo_video'
      const body: Record<string, unknown> = isVideo
        ? { prompt, image_url: lastResultUrl, duration_s: 5 }
        : step === 'avatar_creator'
        ? { image_url: lastResultUrl, category: 'pele', variant: 'sardas' } // default — o avatar creator precisa de categoria
        : { image_url: lastResultUrl, prompt }

      const { data, error } = await supabase.functions.invoke(fnName, { body })
      if (error || (data as { error?: string })?.error) {
        const msg = error?.message ?? (data as { error?: string }).error ?? 'erro desconhecido'
        setRuns(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: msg } : r))
        toast.error(`Etapa ${i + 1} falhou: ${msg}`)
        setRunning(false)
        return
      }
      applyCreditsFromResponse(data)
      const dataObj = data as { task_id?: string; image_url?: string; result_url?: string; credits_charged?: number }
      const resultUrl = dataObj?.image_url ?? dataObj?.result_url
      if (isVideo && dataObj?.task_id && !resultUrl) {
        // Video em fila: marcar pendente; user verá no histórico
        setRuns(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'success', result_url: undefined, credits: dataObj?.credits_charged } : r))
        toast.success(`Etapa ${i + 1} enviada pra fila — confira o resultado no histórico do booster (Filmes IA / Avatar Vídeos / Vídeos IA conforme o caso)`)
        break
      }
      if (resultUrl) {
        lastResultUrl = resultUrl
        setRuns(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'success', result_url: resultUrl, credits: dataObj?.credits_charged } : r))
      }
    }

    setRunning(false)
    toast.success('Workflow concluído!')
  }

  function reset() {
    setSelectedTpl(null)
    setImageFile(null)
    setImagePreview(null)
    setProductDesc('')
    setRuns([])
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Super Vyral</h1>
            <p className="text-sm text-white/50">Workflows automáticos pré-elaborados — escolha um template, suba imagem, descreva produto. O resto é com a IA.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Saldo</p>
          <p className="text-sm font-semibold text-neon">{subscription?.credits_remaining ?? 0} cr</p>
        </div>
      </div>

      {!selectedTpl ? (
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Escolha um template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setSelectedTpl(t)}
                className="group bg-surface-300 border border-white/5 rounded-xl p-5 hover:border-violet-500/40 transition-all cursor-pointer text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{t.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white">{t.title}</h3>
                    <p className="text-[10px] text-white/40 uppercase">{t.outputType === 'video' ? 'Saída: vídeo' : 'Saída: imagem'}</p>
                  </div>
                </div>
                <p className="text-xs text-white/60 mb-3 leading-relaxed">{t.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {t.steps.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded bg-surface-400 text-[10px] text-white/60">{s.replace('_', ' ')}</span>
                      {idx < t.steps.length - 1 && <ArrowRight size={10} className="text-white/30" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-violet-400 font-semibold mt-4">
                  Usar <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wide">Template selecionado</p>
                <h2 className="text-lg font-bold text-white">{selectedTpl.emoji} {selectedTpl.title}</h2>
              </div>
              <button onClick={reset} className="text-xs text-white/40 hover:text-white cursor-pointer underline">Trocar template</button>
            </div>

            <div>
              <label className="text-xs text-white/60 block mb-2">Imagem do produto / pessoa</label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-primary-500/40 bg-surface-400/50 flex items-center justify-center cursor-pointer transition-colors overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Upload size={20} className="text-white/40 mx-auto mb-1" />
                    <p className="text-xs text-white/40">Clique pra subir uma imagem</p>
                  </div>
                )}
              </button>
            </div>

            <div>
              <label className="text-xs text-white/60 block mb-2">Descrição do produto / cena</label>
              <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)}
                placeholder="Ex: Tênis esportivo branco, marca jovem, foco em conforto. Cena: ambiente fitness."
                rows={3}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-surface-400/50 rounded-lg">
              <div>
                <p className="text-xs text-white/60">Custo estimado</p>
                <p className="text-lg font-bold text-neon">~{totalCreditsEstimated} cr</p>
                <p className="text-[10px] text-white/30">Pode variar por etapa</p>
              </div>
              <button onClick={runWorkflow} disabled={running || !imageFile || !productDesc.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold hover:brightness-110 disabled:opacity-50 cursor-pointer flex items-center gap-2">
                {running ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {running ? 'Executando...' : 'Gerar Super Vyral'}
              </button>
            </div>
          </div>

          {runs.length > 0 && (
            <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Zap size={14} className="text-violet-400" /> Progresso do workflow</h3>
              {runs.map((r, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-surface-400/50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    r.status === 'success' ? 'bg-green-500/20 text-green-400' :
                    r.status === 'running' ? 'bg-violet-500/20 text-violet-400' :
                    r.status === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/5 text-white/30'
                  }`}>
                    {r.status === 'running' ? <Loader2 size={14} className="animate-spin" /> :
                     r.status === 'success' ? <Check size={14} /> :
                     <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Etapa {idx + 1}: {r.step.replace('_', ' ')}</p>
                    <p className="text-[10px] text-white/40">
                      {r.status === 'idle' && 'Aguardando...'}
                      {r.status === 'running' && 'Processando...'}
                      {r.status === 'success' && (r.credits ? `${r.credits} cr debitados` : 'Concluído')}
                      {r.status === 'error' && r.error}
                    </p>
                  </div>
                  {r.result_url && (
                    <a href={r.result_url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
                      {selectedTpl.outputType === 'video' && idx === runs.length - 1 ? <Video size={16} /> : <ImageIcon size={16} />}
                    </a>
                  )}
                </div>
              ))}
              {runs.length > 0 && runs.every(r => r.status === 'success') && runs[runs.length - 1].result_url && (
                <a href={runs[runs.length - 1].result_url} target="_blank" rel="noopener noreferrer"
                  className="block w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-center hover:brightness-110">
                  Ver {selectedTpl.outputLabel} →
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
