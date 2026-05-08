import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, Sparkles, User as UserIcon, Film, Volume2, Pause, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { HistoryTab } from '../components/boosters/HistoryTab'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { calcCredits } from '../types/credits'
import { useBoosterSettings } from '../stores/booster-settings-store'
import { LazyVideo } from '../components/LazyVideo'
import { invokeRaw } from '../lib/invokeRaw'
import { logEvent } from '../lib/clientDiagnostic'

const MAX_PROMPT = 600
const MIN_DURATION = 3
const MAX_DURATION = 30
const DEFAULT_DURATION = 5

type Tab = 'criar' | 'historico'
type Quality = '720p' | '1080p'
type CategoryFilter = 'todos' | 'dancas' | 'gestos' | 'camera' | 'expressoes'

interface MotionTemplate {
  id: string
  name: string
  category: 'dancas' | 'gestos' | 'camera' | 'expressoes'
  video_url: string
  thumbnail_url: string | null
  audio_url: string | null
  duration_s: number | null
  is_active: boolean
  sort_order: number
}

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  todos: 'Todos', dancas: 'Danças', gestos: 'Gestos', camera: 'Câmera', expressoes: 'Expressões',
}

export function ImitarMovimentoPage() {
  const navigate = useNavigate()
  const { subscription, user } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [tab, setTab] = useState<Tab>('criar')
  // Task ativa: polling client-side pra mostrar resultado direto na aba Criar quando
  // Kie completar (cliente saber que tem feedback claro em vez de só "Processando…").
  type ActiveTask = {
    taskId: string
    startedAt: number
    status: 'pending' | 'success' | 'failed'
    resultUrl?: string
    errorMsg?: string
  }
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null)
  const [elapsedS, setElapsedS] = useState(0)
  const [characterImage, setCharacterImage] = useState<string>('')
  // referenceVideo: pra preview local. Pode ser blob URL (upload local) ou URL HTTP (template).
  const [referenceVideo, setReferenceVideo] = useState<string>('')
  // videoFile: arquivo cru pra upload no Storage no momento do generate. Edge functions do Supabase
  // têm limite ~6MB pra body JSON, então não dá pra mandar data URL grande direto. Upload primeiro
  // e manda URL pública pro reference_video_url da edge fn.
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [quality, setQuality] = useState<Quality>('720p')
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [generating, setGenerating] = useState(false)
  // E35: ref síncrono pra impedir 2º click ANTES do React propagar setState
  const generatingRef = useRef(false)

  // Templates
  const [templates, setTemplates] = useState<MotionTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('todos')

  const cost = calcCredits('motion_control', { duration_s: duration, quality })
  const insufficient = credits < cost

  // E35: snapshot de estado quando user abre a página, pra debug bug "segue dando erro"
  useEffect(() => {
    logEvent('page_mount', 'imitar-movimento', {
      sw_active: !!navigator.serviceWorker?.controller,
      sw_registered: !!navigator.serviceWorker,
      online: navigator.onLine,
      hasAuth: !!localStorage.getItem('sb-mdueuksfunifyxfqpmdv-auth-token'),
      lsKeys: Object.keys(localStorage).filter(k => k.includes('vyral') || k.includes('sb-')).length,
    })
  }, [])

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    async function load() {
      setTemplatesLoading(true)
      const { data } = await supabase
        .from('motion_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setTemplates((data as MotionTemplate[]) ?? [])
        setTemplatesLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.email])

  // E27: polling client-side da task Kie quando há geração ativa.
  // Antes: client recebia task_id e mandava user pra aba Histórico — UX ruim porque
  // cliente reportou "Processando…" sem fim. Agora poll a cada 5s na própria página
  // e mostra vídeo direto quando completar.
  useEffect(() => {
    if (!activeTask || activeTask.status !== 'pending') return
    let cancelled = false
    const tick = setInterval(() => {
      if (!cancelled) setElapsedS(Math.floor((Date.now() - activeTask.startedAt) / 1000))
    }, 1000)
    async function poll() {
      if (cancelled) return
      try {
        const { data, error } = await supabase.functions.invoke('check-kie-task', {
          body: { task_id: activeTask!.taskId, tool_name: 'motion_control' },
        })
        if (cancelled) return
        if (error) return
        if (data?.status === 'success' && typeof data?.result_url === 'string') {
          setActiveTask(t => t ? { ...t, status: 'success', resultUrl: data.result_url } : null)
          toast.success('Vídeo pronto!')
        } else if (data?.status === 'failed') {
          setActiveTask(t => t ? { ...t, status: 'failed', errorMsg: data.error || 'Geração falhou' } : null)
          toast.error('Geração falhou: ' + (data.error || 'erro desconhecido'))
        }
      } catch { /* silent — tenta de novo no próximo tick */ }
    }
    poll()
    const pollInterval = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(tick)
      clearInterval(pollInterval)
    }
  }, [activeTask])

  function handleSelectTemplate(t: MotionTemplate) {
    setReferenceVideo(t.video_url)
    setVideoFile(null) // template já tem URL pública, não precisa upload
    setSelectedTemplateId(t.id)
    if (t.duration_s) setDuration(Math.min(MAX_DURATION, Math.max(MIN_DURATION, t.duration_s)))
  }

  const filteredTemplates = categoryFilter === 'todos'
    ? templates
    : templates.filter(t => t.category === categoryFilter)

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await resizeImageFile(file, 1280, 0.85)
      setCharacterImage(data)
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally { e.target.value = '' }
  }

  function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 30 * 1024 * 1024) { toast.error('Vídeo muito grande (max 30MB)'); e.target.value = ''; return }
    if (referenceVideo && referenceVideo.startsWith('blob:')) URL.revokeObjectURL(referenceVideo)
    const previewUrl = URL.createObjectURL(file)
    setReferenceVideo(previewUrl)
    setVideoFile(file)
    setSelectedTemplateId(null) // upload manual desmarca template
    e.target.value = ''
  }

  async function handleGenerate() {
    const tStart = Date.now()
    // E35: ref guard SÍNCRONO. Bloqueia 2º click ANTES do React propagar disabled.
    if (generatingRef.current) {
      logEvent('early_return', 'imitar-movimento', { reason: 'already-generating-ref' })
      return
    }
    generatingRef.current = true
    logEvent('click_received', 'imitar-movimento', {
      hasCharacter: !!characterImage,
      hasRefVideo: !!referenceVideo || !!videoFile,
      fromTemplate: !!selectedTemplateId,
      hasUpload: !!videoFile,
      quality,
      duration,
      cost,
    })
    if (!characterImage) {
      generatingRef.current = false
      logEvent('early_return', 'imitar-movimento', { reason: 'no-character' })
      toast.error('Suba a imagem do personagem'); return
    }
    if (!referenceVideo && !videoFile) {
      generatingRef.current = false
      logEvent('early_return', 'imitar-movimento', { reason: 'no-reference' })
      toast.error('Selecione um template ou suba um vídeo de referência'); return
    }
    if (insufficient) {
      generatingRef.current = false
      logEvent('early_return', 'imitar-movimento', { reason: 'insufficient-credits' })
      toast.error(`Créditos insuficientes (precisa ${cost})`); return
    }
    logEvent('validations_passed', 'imitar-movimento')

    setGenerating(true)
    try {
      // Resolve a URL HTTP que vai pra edge fn. Template já tem URL HTTP. Upload local
      // precisa subir pro Storage primeiro (Edge Functions têm limite ~6MB de body JSON).
      let videoUrlForEdge: string
      if (videoFile) {
        if (!user?.id) throw new Error('sessão expirada — faça login de novo')
        const ext = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4'
        const filename = `motion-uploads/${user.id}/${Date.now()}.${ext}`
        logEvent('upload_dispatched', 'imitar-movimento', { ext, size: videoFile.size })
        const { error: upErr } = await supabase.storage.from('public-media').upload(filename, videoFile, { contentType: videoFile.type, upsert: false })
        if (upErr) {
          logEvent('upload_error', 'imitar-movimento', { msg: upErr.message })
          throw new Error('Falha ao subir vídeo: ' + upErr.message)
        }
        const { data: pub } = supabase.storage.from('public-media').getPublicUrl(filename)
        if (!pub?.publicUrl) throw new Error('Não consegui gerar URL pública do upload')
        videoUrlForEdge = pub.publicUrl
        logEvent('upload_done', 'imitar-movimento')
      } else {
        // Veio de template — referenceVideo já é URL HTTP pública
        videoUrlForEdge = referenceVideo
      }

      logEvent('invoke_dispatched', 'imitar-movimento')
      // E35: invokeRaw em vez de supabase.functions.invoke() — invoke() pendura
      // sem fazer fetch HTTP em sessões longas (mesmo bug provado em E29 pros 3 boosters
      // já migrados em E31: edit-image, studio, avatar-creator).
      const invokePromise = invokeRaw<{ task_id?: string; error?: string; credits_remaining?: number }>('generate-motion-video', {
        image_url: characterImage,
        reference_video_url: videoUrlForEdge,
        motion_prompt: prompt,
        quality,
        duration_s: duration,
      })
      // E28: timeout 180s
      const timeoutPromise = new Promise<{ kind: 'timeout' }>(res => setTimeout(() => res({ kind: 'timeout' }), 180_000))
      const result = await Promise.race([invokePromise, timeoutPromise])
      const elapsed = Date.now() - tStart
      if (result.kind === 'timeout') {
        logEvent('invoke_timeout', 'imitar-movimento', { elapsedMs: elapsed })
        toast.error('Tempo excedido. A geração pode estar em andamento — veja o Histórico.'); return
      }
      const { data, error: invokeError } = result
      logEvent('invoke_response', 'imitar-movimento', {
        elapsedMs: elapsed,
        hasError: !!invokeError,
        errMsg: invokeError ? String(invokeError.message).slice(0, 100) : null,
        hasData: !!data,
        hasTaskId: !!data?.task_id,
        hasErrorField: !!data?.error,
      })
      if (invokeError) throw invokeError
      if (data?.error) { toast.error(data.error); return }
      if (data?.task_id) {
        applyCreditsFromResponse(data)
        toast.success('Vídeo entrou na fila — aguarde aqui mesmo')
        setActiveTask({ taskId: data.task_id, startedAt: Date.now(), status: 'pending' })
        setElapsedS(0)
        setPrompt('')
      }
    } catch (err) {
      const e = err as Error
      logEvent('invoke_catch', 'imitar-movimento', { msg: String(e.message).slice(0, 200) })
      toast.error('Erro: ' + e.message)
    } finally {
      logEvent('finally_reached', 'imitar-movimento')
      generatingRef.current = false
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">IMITAR MOVIMENTO · Kling Motion Control</p>
          <h1 className="text-xl font-bold text-white">Anime personagens com vídeo de referência</h1>
          <p className="text-sm text-white/50">Replique movimentos/danças no seu personagem usando IA</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-xs font-bold">
          720p 6cr/s · 1080p 9cr/s
        </div>
      </div>

      <div className="flex gap-1 bg-surface-300 rounded-xl p-1 max-w-md">
        <button onClick={() => setTab('criar')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'criar' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Criar</button>
        <button onClick={() => setTab('historico')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'historico' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Histórico</button>
      </div>

      {tab === 'criar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <UploadSlot label="Vídeo de Referência *" value={referenceVideo} onPick={handleVideoFile} icon={<Film size={18} />} mediaType="video" required selectedFromTemplate={!!selectedTemplateId} />
              <UploadSlot label="Seu Personagem *" value={characterImage} onPick={handleImageFile} icon={<UserIcon size={18} />} mediaType="image" required />
            </div>

            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Qualidade</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setQuality('720p')} className={`py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${quality === '720p' ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>720p · {useBoosterSettings.getState().getCredits('motion_control', '720p') ?? 6} cr/s</button>
                <button onClick={() => setQuality('1080p')} className={`py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${quality === '1080p' ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>1080p · {useBoosterSettings.getState().getCredits('motion_control', '1080p') ?? 9} cr/s</button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wide">Duração</p>
                <span className="text-sm text-white font-semibold">{duration}s — <span className="text-neon">{cost} cr</span></span>
              </div>
              <input type="range" min={MIN_DURATION} max={MAX_DURATION} step={1} value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full accent-primary-500" />
              <div className="flex justify-between text-[10px] text-white/30 mt-1"><span>{MIN_DURATION}s</span><span>{MAX_DURATION}s</span></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wide">Prompt (opcional)</p>
                <span className="text-[10px] text-white/30">{prompt.length}/{MAX_PROMPT}</span>
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
                placeholder="Detalhes adicionais sobre o movimento desejado..."
                rows={3}
                className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>

            <button onClick={handleGenerate} disabled={generating || insufficient || !characterImage || !referenceVideo} className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Enviando…' : `Imitar Movimento — ${cost} cr`}
            </button>

            <p className="text-[11px] text-white/40 text-center">Saldo: <span className="text-neon font-semibold">{credits}</span> créditos</p>

            {/* E27: bloco de status da task ativa — polling client-side mostra resultado direto */}
            {activeTask && (
              <div className="mt-2 border-t border-white/5 pt-4 space-y-3">
                {activeTask.status === 'pending' && (
                  <div className="bg-surface-400 rounded-lg p-4 flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-primary-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">Gerando vídeo…</p>
                      <p className="text-[11px] text-white/50">{Math.floor(elapsedS / 60)}:{String(elapsedS % 60).padStart(2, '0')} · Kling normalmente leva 1-2min</p>
                    </div>
                  </div>
                )}
                {activeTask.status === 'success' && activeTask.resultUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs">
                      <CheckCircle2 size={14} /> Vídeo pronto em {Math.floor(elapsedS / 60)}:{String(elapsedS % 60).padStart(2, '0')}
                    </div>
                    <video src={activeTask.resultUrl} controls className="w-full rounded-lg" />
                    <div className="flex gap-2">
                      <a href={activeTask.resultUrl} download={`motion-${Date.now()}.mp4`} className="flex-1 py-2 rounded-lg bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 text-xs font-medium text-center cursor-pointer">Baixar</a>
                      <button onClick={() => setActiveTask(null)} className="flex-1 py-2 rounded-lg bg-surface-400 text-white/70 hover:text-white text-xs font-medium cursor-pointer">Nova geração</button>
                    </div>
                  </div>
                )}
                {activeTask.status === 'failed' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-red-300">{activeTask.errorMsg || 'Geração falhou'}</p>
                    <button onClick={() => setActiveTask(null)} className="w-full py-2 rounded-lg bg-surface-400 text-white/70 hover:text-white text-xs font-medium cursor-pointer">Tentar de novo</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3 self-start">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-white/40 uppercase tracking-wide">Templates</p>
              <span className="text-[10px] text-white/40">{filteredTemplates.length} disponíveis · clique pra usar</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${categoryFilter === c ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-12 text-white/40 text-sm gap-2">
                <Loader2 size={14} className="animate-spin" /> Carregando templates…
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Film size={28} className="text-white/20" />
                <p className="text-sm text-white/50">Nenhum template ainda</p>
                <p className="text-[11px] text-white/30 max-w-xs">Os templates aparecem aqui assim que forem cadastrados. Por enquanto, faça upload de um vídeo de referência manual.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredTemplates.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    selected={selectedTemplateId === t.id}
                    onClick={() => handleSelectTemplate(t)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <HistoryTab tool="motion_control" mediaType="video" />
      )}
    </div>
  )
}

function UploadSlot({ label, value, onPick, icon, mediaType, required, selectedFromTemplate }: { label: string; value: string; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void; icon: React.ReactNode; mediaType: 'image' | 'video'; required?: boolean; selectedFromTemplate?: boolean }) {
  return (
    <label className="block">
      <p className="text-[10px] text-white/40 mb-1 flex items-center gap-1">
        {label}
        {selectedFromTemplate && <span className="text-primary-300 font-semibold">(via template)</span>}
      </p>
      {value ? (
        <div className={`relative rounded-lg overflow-hidden border cursor-pointer group aspect-square ${selectedFromTemplate ? 'border-primary-500' : 'border-white/10'}`}>
          {mediaType === 'video' ? (
            <video src={value} className="w-full h-full object-cover" muted playsInline />
          ) : (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all">
            <Upload size={16} className="text-white/0 group-hover:text-white" />
          </div>
        </div>
      ) : (
        <div className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 cursor-pointer transition-colors text-white/40">
          {icon}
          <span className="text-[10px] text-center px-2">{label}{required ? ' *' : ''}</span>
        </div>
      )}
      <input type="file" accept={mediaType === 'video' ? 'video/*' : 'image/*'} className="hidden" onChange={onPick} />
    </label>
  )
}

function TemplateCard({ template, selected, onClick }: { template: MotionTemplate; selected: boolean; onClick: () => void }) {
  // Áudio on-demand (criado lazy quando user clica "Ouvir áudio")
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)

  function toggleAudio(e: React.MouseEvent) {
    e.stopPropagation()
    if (!template.audio_url) return
    if (!audioEl) {
      const a = new Audio(template.audio_url)
      a.onended = () => setAudioPlaying(false)
      a.play().catch(() => {})
      setAudioEl(a); setAudioPlaying(true)
      return
    }
    if (audioPlaying) { audioEl.pause(); setAudioPlaying(false) } else { audioEl.play().catch(() => {}); setAudioPlaying(true) }
  }

  return (
    <div
      onClick={onClick}
      className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
        selected ? 'border-primary-500 ring-2 ring-primary-500/40' : 'border-white/10 hover:border-white/30'
      }`}
    >
      <LazyVideo src={template.video_url} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {selected && (
        <div className="absolute top-1.5 left-1.5 bg-primary-500 rounded-full p-0.5 z-10">
          <CheckCircle2 size={12} className="text-white" />
        </div>
      )}

      {template.duration_s && (
        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-bold text-white">
          {template.duration_s}s
        </span>
      )}

      {template.audio_url && (
        <button
          type="button"
          onClick={toggleAudio}
          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 hover:bg-primary-600 flex items-center justify-center text-white transition-colors z-10"
          title="Ouvir áudio"
        >
          {audioPlaying ? <Pause size={12} /> : <Volume2 size={12} />}
        </button>
      )}

      <p className="absolute bottom-1.5 left-1.5 right-10 text-[10px] font-semibold text-white truncate z-10">{template.name}</p>
    </div>
  )
}
