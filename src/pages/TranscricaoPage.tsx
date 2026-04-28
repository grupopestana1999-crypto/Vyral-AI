import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Sparkles, Copy, Download, FileAudio, Link as LinkIcon, Check } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { calcCredits } from '../types/credits'

const MAX_FILE_BYTES = 100 * 1024 * 1024
const SUPABASE_URL = 'https://mdueuksfunifyxfqpmdv.supabase.co'

type Mode = 'upload' | 'url'

export function TranscricaoPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [mode, setMode] = useState<Mode>('upload')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreview, setAudioPreview] = useState<string>('')
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [resultText, setResultText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const cost = calcCredits('transcribe_audio', { duration_s: duration > 0 ? duration : 60 })
  const insufficient = credits < cost

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) { toast.error('Arquivo > 100MB'); return }
    try {
      const dur = await getAudioDuration(file)
      const url = URL.createObjectURL(file)
      if (audioPreview) URL.revokeObjectURL(audioPreview)
      setAudioFile(file)
      setAudioPreview(url)
      setDuration(dur)
      setResultText(null); setError(null)
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally { e.target.value = '' }
  }

  async function handleTranscribe() {
    if (mode === 'upload' && !audioFile) { toast.error('Suba um arquivo'); return }
    if (mode === 'url' && !audioUrl.trim()) { toast.error('Cole a URL'); return }
    if (insufficient) { toast.error(`Créditos insuficientes (precisa ${cost})`); return }

    setTranscribing(true); setError(null); setResultText(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      let payloadAudioUrl = audioUrl.trim()
      let durationToSend = duration

      // Upload pra Storage se for upload local (edge fn não pode receber data:URL grandes via JSON).
      if (mode === 'upload' && audioFile) {
        const ext = audioFile.name.split('.').pop()?.toLowerCase() || 'mp3'
        const filename = `transcribe-uploads/${session.user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('public-media').upload(filename, audioFile, { contentType: audioFile.type, upsert: false })
        if (upErr) throw new Error('Upload falhou: ' + upErr.message)
        const { data: pub } = supabase.storage.from('public-media').getPublicUrl(filename)
        payloadAudioUrl = pub?.publicUrl ?? ''
        if (!payloadAudioUrl) throw new Error('Não consegui gerar URL pública do upload')
      }

      const r = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({ audio_url: payloadAudioUrl, duration_s: durationToSend }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) { setError(data?.error || `Erro ${r.status}`); return }
      if (typeof data?.text === 'string') {
        applyCreditsFromResponse(data)
        setResultText(data.text)
        toast.success(`Transcrito (${data.credits_charged} cr)`)
      } else {
        setError('Resposta inesperada da IA. Tente novamente.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setTranscribing(false)
    }
  }

  function handleCopy() {
    if (!resultText) return
    navigator.clipboard.writeText(resultText)
    setCopied(true)
    toast.success('Texto copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    if (!resultText) return
    const blob = new Blob([resultText], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `transcricao-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">TRANSCRIÇÃO DE ÁUDIO · Elevenlabs Scribe</p>
          <h1 className="text-xl font-bold text-white">Áudio em texto rapidamente</h1>
          <p className="text-sm text-white/50">Suba arquivo ou cole URL · 2 cr/minuto</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-xs font-bold">
          2 cr / minuto
        </div>
      </div>

      <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex gap-1 bg-surface-400 rounded-lg p-1 max-w-sm">
          <button onClick={() => setMode('upload')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${mode === 'upload' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Upload arquivo</button>
          <button onClick={() => setMode('url')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${mode === 'url' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Colar URL</button>
        </div>

        {mode === 'upload' ? (
          <label className="block">
            {audioPreview ? (
              <div className="bg-surface-400 border border-white/10 rounded-lg p-4 cursor-pointer">
                <audio src={audioPreview} controls className="w-full" />
                <p className="text-[11px] text-white/40 mt-2">{audioFile?.name} · {duration.toFixed(1)}s · clique pra trocar</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 cursor-pointer transition-colors">
                <FileAudio size={24} className="text-primary-400" />
                <p className="text-sm text-white/70 font-medium">Suba áudio ou vídeo</p>
                <p className="text-[11px] text-white/40">MP3, WAV, M4A, MP4 — até 100MB</p>
              </div>
            )}
            <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleFile} />
          </label>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon size={14} className="text-white/40" />
              <input type="url" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="https://exemplo.com/audio.mp3 ou link de vídeo" className="flex-1 px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500" />
            </div>
            <p className="text-[10px] text-white/40">Aceita URLs diretas de áudio. Pra vídeos, garanta que o áudio é extraível.</p>
          </div>
        )}

        {mode === 'upload' && audioFile && duration > 0 && (
          <CostBreakdown duration={duration} cost={cost} credits={credits} />
        )}

        {mode === 'url' && audioUrl.trim() && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200/80">
            <p className="font-semibold mb-1">Custo via URL</p>
            <p className="text-amber-100/60">Pra URLs externas a duração só é detectada no servidor. Cobra mínimo 2 cr/minuto, arredondado pra cima — saldo cai exato após processar.</p>
          </div>
        )}

        <button onClick={handleTranscribe} disabled={transcribing || insufficient || (mode === 'upload' ? !audioFile : !audioUrl.trim())} className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
          {transcribing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {transcribing ? 'Transcrevendo…' : (mode === 'upload' && duration > 0 ? `Transcrever — ${cost} cr` : `Transcrever — ~${cost} cr`)}
        </button>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">{error}</div>}
      </div>

      {resultText && (
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40 uppercase tracking-wide">Transcrição</p>
            <span className="text-[10px] text-white/40">{resultText.length} caracteres</span>
          </div>
          <pre className="bg-surface-400 border border-white/5 rounded-lg p-3 text-sm text-white/90 whitespace-pre-wrap font-sans max-h-96 overflow-y-auto leading-relaxed">{resultText}</pre>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="flex-1 py-2 rounded-lg bg-surface-400 border border-white/10 text-white text-sm font-medium hover:bg-white/5 cursor-pointer flex items-center justify-center gap-1.5">
              {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
            </button>
            <button onClick={handleDownload} className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:brightness-110 cursor-pointer flex items-center justify-center gap-1.5">
              <Download size={14} /> Baixar (.txt)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CostBreakdown({ duration, cost, credits }: { duration: number; cost: number; credits: number }) {
  const minutes = Math.floor(duration / 60)
  const seconds = Math.round(duration % 60)
  const billedMinutes = Math.max(1, Math.ceil(duration / 60))
  const balanceAfter = credits - cost
  const insufficient = balanceAfter < 0

  return (
    <div className="bg-gradient-to-r from-primary-600/10 to-accent-600/10 border border-primary-500/30 rounded-xl p-4 space-y-3">
      <p className="text-xs text-white/50 uppercase tracking-wide">Custo da transcrição</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-white/40 uppercase">Duração</p>
          <p className="text-sm font-bold text-white mt-0.5">{minutes > 0 ? `${minutes} min ${seconds}s` : `${seconds}s`}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase">Cobrança</p>
          <p className="text-sm font-bold text-white mt-0.5">{billedMinutes} min × 2 cr</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase">Total</p>
          <p className="text-sm font-bold text-neon mt-0.5">{cost} cr</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
        <span className="text-white/50">Saldo atual</span>
        <span className="text-white font-semibold">
          {credits} cr → <span className={insufficient ? 'text-red-400' : 'text-neon'}>{balanceAfter} cr</span>
        </span>
      </div>
      {insufficient && (
        <p className="text-[11px] text-red-300 font-medium">⚠ Saldo insuficiente. Recarregue créditos pra continuar.</p>
      )}
    </div>
  )
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      // Vídeos podem falhar via Audio() — tenta via video element.
      const video = document.createElement('video')
      video.preload = 'metadata'
      const url2 = URL.createObjectURL(file)
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url2)
        resolve(video.duration)
      }
      video.onerror = () => {
        URL.revokeObjectURL(url2)
        // Sem duration extraível, retornar 60s como default — edge fn cobra mínimo 1 minuto
        resolve(60)
      }
      video.src = url2
    }
    audio.src = url
  })
}
