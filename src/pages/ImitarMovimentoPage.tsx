import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, Sparkles, User as UserIcon, Film, Volume2, Pause, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { HistoryTab } from '../components/boosters/HistoryTab'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { calcCredits } from '../types/credits'
import { LazyVideo } from '../components/LazyVideo'

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
  const [characterImage, setCharacterImage] = useState<string>('')
  const [referenceVideo, setReferenceVideo] = useState<string>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [quality, setQuality] = useState<Quality>('720p')
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [generating, setGenerating] = useState(false)

  // Templates
  const [templates, setTemplates] = useState<MotionTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('todos')

  const cost = calcCredits('motion_control', { duration_s: duration, quality })
  const insufficient = credits < cost

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

  function handleSelectTemplate(t: MotionTemplate) {
    setReferenceVideo(t.video_url)
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

  async function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 30 * 1024 * 1024) { toast.error('Vídeo muito grande (max 30MB)'); return }
    try {
      const data = await blobToDataUrl(file)
      setReferenceVideo(data)
      setSelectedTemplateId(null) // upload manual desmarca template selecionado
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally { e.target.value = '' }
  }

  async function handleGenerate() {
    if (!characterImage) { toast.error('Suba a imagem do personagem'); return }
    if (!referenceVideo) { toast.error('Suba o vídeo de referência (movimento/dança)'); return }
    if (insufficient) { toast.error(`Créditos insuficientes (precisa ${cost})`); return }

    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/generate-motion-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({
          image_url: characterImage,
          reference_video_url: referenceVideo,
          motion_prompt: prompt,
          quality,
          duration_s: duration,
        }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) { toast.error(data?.error || `Erro ${r.status}`); return }
      if (data?.task_id) {
        applyCreditsFromResponse(data)
        toast.success('Vídeo entrou na fila — acompanhe na aba Histórico')
        setTab('historico')
        setPrompt('')
      }
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
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
                <button onClick={() => setQuality('720p')} className={`py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${quality === '720p' ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>720p · 6 cr/s</button>
                <button onClick={() => setQuality('1080p')} className={`py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${quality === '1080p' ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>1080p · 9 cr/s</button>
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
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
