import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, Sparkles, User as UserIcon, Film } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { HistoryTab } from '../components/boosters/HistoryTab'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { calcCredits } from '../types/credits'

const MAX_PROMPT = 600
const MIN_DURATION = 3
const MAX_DURATION = 30
const DEFAULT_DURATION = 5

type Tab = 'criar' | 'historico'
type Quality = '720p' | '1080p'

export function ImitarMovimentoPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [tab, setTab] = useState<Tab>('criar')
  const [characterImage, setCharacterImage] = useState<string>('')
  const [referenceVideo, setReferenceVideo] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [quality, setQuality] = useState<Quality>('720p')
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [generating, setGenerating] = useState(false)

  const cost = calcCredits('motion_control', { duration_s: duration, quality })
  const insufficient = credits < cost

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
    <div className="max-w-5xl mx-auto space-y-5">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <UploadSlot label="Vídeo de Referência *" value={referenceVideo} onPick={handleVideoFile} icon={<Film size={18} />} mediaType="video" required />
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

          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3 text-sm text-white/70 self-start">
            <p className="text-xs text-white/40 uppercase tracking-wide">Como funciona</p>
            <ol className="space-y-2 list-decimal list-inside text-[13px]">
              <li>Suba o vídeo de referência (a dança ou movimento que quer replicar)</li>
              <li>Suba a imagem do seu personagem (foto que será animada)</li>
              <li>Selecione qualidade: 720p (6 cr/s) ou 1080p (9 cr/s)</li>
              <li>Ajuste duração — custo atualiza em tempo real</li>
              <li>Resultado aparece na aba <span className="text-primary-400 font-medium">Histórico</span></li>
            </ol>
            <div className="bg-surface-400/50 border border-white/5 rounded-lg p-3 text-[12px]">
              <p className="text-white/60 leading-relaxed"><span className="text-amber-300 font-medium">Dica:</span> vídeos de referência com 1 pessoa em fundo neutro rendem melhor. Personagem deve estar de corpo inteiro.</p>
            </div>
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

function UploadSlot({ label, value, onPick, icon, mediaType, required }: { label: string; value: string; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void; icon: React.ReactNode; mediaType: 'image' | 'video'; required?: boolean }) {
  return (
    <label className="block">
      <p className="text-[10px] text-white/40 mb-1">{label}</p>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer group aspect-square">
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
