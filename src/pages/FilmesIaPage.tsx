import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, Sparkles, Wand2, Volume2, VolumeX, Image as ImageIcon } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { HistoryTab } from '../components/boosters/HistoryTab'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { calcCredits } from '../types/credits'

const MAX_PROMPT = 1200
const MIN_DURATION = 3
const MAX_DURATION = 15
const DEFAULT_DURATION = 5

const RATIOS = [
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
  { value: '1:1', label: '1:1' },
] as const

type Tab = 'criar' | 'historico'
type Ratio = typeof RATIOS[number]['value']

export function FilmesIaPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [tab, setTab] = useState<Tab>('criar')
  const [prompt, setPrompt] = useState('')
  const [imageInitial, setImageInitial] = useState<string>('')
  const [imageTail, setImageTail] = useState<string>('')
  const [audio, setAudio] = useState(true)
  const [aspectRatio, setAspectRatio] = useState<Ratio>('9:16')
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [generating, setGenerating] = useState(false)
  const [enhancing, setEnhancing] = useState(false)

  const cost = calcCredits('kling_3', { duration_s: duration, audio })
  const insufficient = credits < cost

  function handleFile(setter: (s: string) => void) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const data = await resizeImageFile(file, 1280, 0.85)
        setter(data)
      } catch (err) {
        toast.error('Erro: ' + (err as Error).message)
      } finally {
        e.target.value = ''
      }
    }
  }

  async function enhancePrompt() {
    if (!prompt.trim()) { toast.error('Escreva algo no prompt primeiro'); return }
    setEnhancing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')
      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({ description: prompt, type: 'video' }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) { toast.error(data?.error || `Erro ${r.status}`); return }
      if (typeof data?.prompt === 'string') {
        applyCreditsFromResponse(data)
        setPrompt(data.prompt.slice(0, MAX_PROMPT))
        toast.success('Prompt melhorado!')
      }
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setEnhancing(false)
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Escreva o prompt'); return }
    if (insufficient) { toast.error(`Créditos insuficientes (precisa ${cost})`); return }

    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')
      const body: Record<string, unknown> = {
        prompt,
        audio,
        aspect_ratio: aspectRatio,
        duration_s: duration,
      }
      if (imageInitial) body.image_url = imageInitial
      if (imageTail) body.image_tail_url = imageTail

      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/generate-kling3-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok || data?.error) { toast.error(data?.error || `Erro ${r.status}`); return }
      if (data?.task_id) {
        applyCreditsFromResponse(data)
        toast.success('Vídeo entrou na fila — acompanhe na aba Histórico')
        setTab('historico')
        setPrompt(''); setImageInitial(''); setImageTail('')
      }
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">FILMES IA · Kling 3.0</p>
          <h1 className="text-xl font-bold text-white">Vídeos cinematográficos · 720p · 3-15s</h1>
          <p className="text-sm text-white/50">Crie vídeos com áudio nativo e multi-frame</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-xs font-bold">
          7 cr/s sem áudio · 10 cr/s com áudio
        </div>
      </div>

      <div className="flex gap-1 bg-surface-300 rounded-xl p-1 max-w-md">
        <button onClick={() => setTab('criar')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'criar' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Criar</button>
        <button onClick={() => setTab('historico')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'historico' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Histórico</button>
      </div>

      {tab === 'criar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wide">Prompt *</p>
                <span className="text-[10px] text-white/30">{prompt.length}/{MAX_PROMPT}</span>
              </div>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
                  placeholder="Descreva o vídeo que deseja criar..."
                  rows={5}
                  className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none pr-3"
                />
                <button onClick={enhancePrompt} disabled={enhancing || !prompt.trim()} className="absolute right-2 bottom-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neon text-surface-500 text-[11px] font-bold hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer">
                  {enhancing ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                  Melhorar
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Frames de referência</p>
              <div className="grid grid-cols-2 gap-2">
                <FrameSlot label="Frame Inicial *" value={imageInitial} onPick={handleFile(setImageInitial)} required />
                <FrameSlot label="Frame Final (opcional)" value={imageTail} onPick={handleFile(setImageTail)} />
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Modo do Áudio</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAudio(true)} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${audio ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>
                  <Volume2 size={14} /> Com Fala
                </button>
                <button onClick={() => setAudio(false)} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${!audio ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>
                  <VolumeX size={14} /> Sem Fala
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Proporção</p>
              <div className="grid grid-cols-3 gap-2">
                {RATIOS.map(r => (
                  <button key={r.value} onClick={() => setAspectRatio(r.value)} className={`py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${aspectRatio === r.value ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>{r.label}</button>
                ))}
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

            <button onClick={handleGenerate} disabled={generating || insufficient || !prompt.trim()} className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Enviando…' : `Gerar — ${cost} créditos`}
            </button>

            <p className="text-[11px] text-white/40 text-center">Saldo: <span className="text-neon font-semibold">{credits}</span> créditos</p>
          </div>

          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3 text-sm text-white/70 self-start">
            <p className="text-xs text-white/40 uppercase tracking-wide">Como funciona</p>
            <ol className="space-y-2 list-decimal list-inside text-[13px]">
              <li>Descreva o vídeo no prompt — clique <span className="text-neon">Melhorar</span> pra IA enriquecer</li>
              <li>(Opcional) suba frame inicial e/ou final pra guiar transições</li>
              <li>Escolha modo de áudio: com ou sem fala</li>
              <li>Defina proporção e duração — custo atualiza em tempo real</li>
              <li>Resultado aparece na aba <span className="text-primary-400 font-medium">Histórico</span></li>
            </ol>
          </div>
        </div>
      ) : (
        <HistoryTab tool="kling_3" mediaType="video" />
      )}
    </div>
  )
}

function FrameSlot({ label, value, onPick, required }: { label: string; value: string; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean }) {
  return (
    <label className="block">
      <p className="text-[10px] text-white/40 mb-1">{label}{required && ' *'}</p>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer group aspect-square">
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all">
            <Upload size={16} className="text-white/0 group-hover:text-white" />
          </div>
        </div>
      ) : (
        <div className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 cursor-pointer transition-colors">
          <ImageIcon size={18} className="text-white/40" />
          <span className="text-[10px] text-white/40">{label.split(' ')[0]}</span>
        </div>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
  )
}
