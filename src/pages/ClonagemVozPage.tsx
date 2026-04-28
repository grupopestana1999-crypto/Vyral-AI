import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Sparkles, Trash2, Mic, Volume2, Plus } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { calcCredits } from '../types/credits'

const MAX_VOICES = 3
const MIN_DURATION = 5
const MAX_DURATION = 60
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TEXT = 1000

type Tab = 'criar' | 'gerar' | 'historico'

interface Voice {
  id: string
  voice_id: string
  name: string
  audio_sample_url: string | null
  duration_s: number | null
  provider: string
  created_at: string
}

interface Generation {
  id: string
  user_email: string
  tool_name: string
  credits_used: number
  status: string
  created_at: string
  result_url: string | null
}

export function ClonagemVozPage() {
  const navigate = useNavigate()
  const { subscription, user } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [tab, setTab] = useState<Tab>('criar')
  const [voices, setVoices] = useState<Voice[]>([])
  const [history, setHistory] = useState<Generation[]>([])

  // Criar voz
  const [voiceName, setVoiceName] = useState('')
  const [audioDataUrl, setAudioDataUrl] = useState('')
  const [audioDuration, setAudioDuration] = useState(0)
  const [cloning, setCloning] = useState(false)

  // Gerar áudio
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [text, setText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [resultAudio, setResultAudio] = useState<string | null>(null)

  const cost = calcCredits('voice_clone', { chars: text.length })
  const insufficient = credits < cost
  const atVoiceLimit = voices.length >= MAX_VOICES

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: vs } = await supabase.from('cloned_voices').select('*').order('created_at', { ascending: false })
      if (!cancelled && vs) {
        setVoices(vs as Voice[])
        if (vs.length > 0 && !selectedVoiceId) setSelectedVoiceId((vs[0] as Voice).voice_id)
      }
      if (user?.email) {
        const { data: hs } = await supabase.from('credit_usage_log').select('*').eq('user_email', user.email).eq('tool_name', 'voice_clone').order('created_at', { ascending: false }).limit(20)
        if (!cancelled && hs) setHistory(hs as Generation[])
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.email])

  async function handleAudioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) { toast.error(`Arquivo muito grande (max ${MAX_FILE_BYTES / 1024 / 1024}MB)`); return }
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/x-m4a', 'audio/m4a', 'audio/mp4']
    if (!validTypes.some(t => file.type.startsWith(t.split('/')[0]))) {
      toast.error('Formato inválido. Use MP3, WAV ou M4A.'); return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      const duration = await getAudioDuration(file)
      if (duration < MIN_DURATION || duration > MAX_DURATION) {
        toast.error(`Duração deve estar entre ${MIN_DURATION}s e ${MAX_DURATION}s (atual: ${duration.toFixed(1)}s)`)
        return
      }
      setAudioDataUrl(dataUrl)
      setAudioDuration(duration)
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally { e.target.value = '' }
  }

  async function handleClone() {
    if (atVoiceLimit) { toast.error(`Limite de ${MAX_VOICES} vozes atingido. Exclua uma para adicionar outra.`); return }
    if (!voiceName.trim() || voiceName.length < 2) { toast.error('Nome da voz precisa ter ao menos 2 chars'); return }
    if (!audioDataUrl) { toast.error('Suba um áudio de referência'); return }

    setCloning(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/clone-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({ audio_data_url: audioDataUrl, name: voiceName.trim(), duration_s: audioDuration }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) {
        toast.error(data?.error || `Erro ${r.status}`)
        return
      }
      if (data?.voice) {
        setVoices(v => [data.voice, ...v])
        if (!selectedVoiceId) setSelectedVoiceId(data.voice.voice_id)
        setVoiceName(''); setAudioDataUrl(''); setAudioDuration(0)
        if (data.provider === 'placeholder') {
          toast.message('Voz salva — sem clone real (Elevenlabs não configurado). TTS usará voz padrão pt-BR.')
        } else {
          toast.success('Voz clonada com sucesso!')
        }
        setTab('gerar')
      }
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setCloning(false)
    }
  }

  async function handleDeleteVoice(id: string) {
    if (!confirm('Deletar essa voz? A ação é irreversível.')) return
    const { error } = await supabase.from('cloned_voices').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setVoices(vs => vs.filter(v => v.id !== id))
    toast.success('Voz removida')
  }

  async function handleGenerate() {
    if (!text.trim()) { toast.error('Digite o texto'); return }
    if (insufficient) { toast.error(`Créditos insuficientes (precisa ${cost})`); return }

    setGenerating(true); setResultAudio(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({ text, voice_id: selectedVoiceId }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) { toast.error(data?.error || `Erro ${r.status}`); return }
      if (data?.audio_url) {
        applyCreditsFromResponse(data)
        setResultAudio(data.audio_url)
        toast.success(`Áudio gerado (${data.credits_charged} cr)`)
        setText('')
      }
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">CLONAGEM DE VOZ · Elevenlabs</p>
          <h1 className="text-xl font-bold text-white">Clone uma voz e gere falas com ela</h1>
          <p className="text-sm text-white/50">Máximo {MAX_VOICES} vozes salvas · 5cr / 1000 chars na geração</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-xs font-bold">
          5 cr / 1000 chars
        </div>
      </div>

      <div className="flex gap-1 bg-surface-300 rounded-xl p-1 max-w-xl">
        <button onClick={() => setTab('criar')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'criar' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Criar Voz</button>
        <button onClick={() => setTab('gerar')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'gerar' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Gerar Áudio</button>
        <button onClick={() => setTab('historico')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'historico' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Minhas Vozes</button>
      </div>

      {tab === 'criar' && (
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
          {atVoiceLimit && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
              Você atingiu o limite de {MAX_VOICES} vozes salvas. Vá em <button onClick={() => setTab('historico')} className="underline cursor-pointer">Minhas Vozes</button> e exclua uma para adicionar outra.
            </div>
          )}

          <div>
            <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Nome da voz</p>
            <input type="text" value={voiceName} onChange={e => setVoiceName(e.target.value.slice(0, 40))} placeholder="Ex: Minha voz, Cliente João" className="w-full px-3 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500" />
          </div>

          <div>
            <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Áudio de referência ({MIN_DURATION}-{MAX_DURATION}s, max 10MB)</p>
            <label className="block">
              {audioDataUrl ? (
                <div className="bg-surface-400 border border-white/10 rounded-lg p-3 cursor-pointer">
                  <audio src={audioDataUrl} controls className="w-full" />
                  <p className="text-[11px] text-white/40 mt-2">Duração: {audioDuration.toFixed(1)}s · Clique pra trocar</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 cursor-pointer transition-colors">
                  <Mic size={20} className="text-primary-400" />
                  <p className="text-sm text-white/70">Suba um áudio de referência</p>
                  <p className="text-[11px] text-white/40">MP3, WAV ou M4A · {MIN_DURATION}-{MAX_DURATION}s · até 10MB</p>
                </div>
              )}
              <input type="file" accept="audio/*" className="hidden" onChange={handleAudioFile} disabled={atVoiceLimit} />
            </label>
          </div>

          <button onClick={handleClone} disabled={cloning || atVoiceLimit || !audioDataUrl || !voiceName.trim()} className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
            {cloning ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {cloning ? 'Clonando…' : 'Clonar Voz (grátis)'}
          </button>
          <p className="text-[11px] text-white/40 text-center">Você tem {voices.length}/{MAX_VOICES} vozes salvas</p>
        </div>
      )}

      {tab === 'gerar' && (
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
          {voices.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
              Você ainda não tem vozes salvas. Vá em <button onClick={() => setTab('criar')} className="underline cursor-pointer">Criar Voz</button> primeiro.
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Voz</p>
                <select value={selectedVoiceId} onChange={e => setSelectedVoiceId(e.target.value)} className="w-full px-3 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500">
                  {voices.map(v => (
                    <option key={v.id} value={v.voice_id}>{v.name} ({v.duration_s ?? '?'}s · {v.provider === 'elevenlabs' ? '✓ clone real' : 'voz padrão'})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/40 uppercase tracking-wide">Texto a gerar</p>
                  <span className="text-[10px] text-white/30">{text.length}/{MAX_TEXT}</span>
                </div>
                <textarea value={text} onChange={e => setText(e.target.value.slice(0, MAX_TEXT))} placeholder="Digite o texto que a voz vai falar…" rows={6} className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none" />
              </div>

              <button onClick={handleGenerate} disabled={generating || insufficient || !text.trim()} className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? 'Gerando…' : `Gerar Áudio — ${cost} cr`}
              </button>
              <p className="text-[11px] text-white/40 text-center">Saldo: <span className="text-neon font-semibold">{credits}</span> · Custo dinâmico baseado em chars</p>

              {resultAudio && (
                <div className="bg-surface-400 border border-white/10 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-wide">Resultado</p>
                  <audio src={resultAudio} controls className="w-full" />
                  <a href={resultAudio} download={`audio-${Date.now()}.mp3`} className="inline-flex items-center gap-1.5 text-xs text-primary-300 hover:text-primary-200">
                    <Volume2 size={12} /> Baixar MP3
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'historico' && (
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-wide">Vozes salvas ({voices.length}/{MAX_VOICES})</p>
          {voices.length === 0 ? (
            <p className="text-sm text-white/40 py-8 text-center">Nenhuma voz clonada ainda.</p>
          ) : (
            <div className="space-y-2">
              {voices.map(v => (
                <div key={v.id} className="flex items-center justify-between gap-3 bg-surface-400 border border-white/5 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{v.name}</p>
                    <p className="text-[11px] text-white/40">
                      {v.duration_s ?? '?'}s · {v.provider === 'elevenlabs' ? '✓ clone real Elevenlabs' : '⚠ placeholder (voz padrão)'} · criada {new Date(v.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    {v.audio_sample_url && <audio src={v.audio_sample_url} controls className="mt-2 w-full max-w-md" />}
                  </div>
                  <button onClick={() => handleDeleteVoice(v.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <>
              <p className="text-xs text-white/40 uppercase tracking-wide pt-4 border-t border-white/5">Últimas gerações</p>
              <div className="space-y-1.5">
                {history.slice(0, 10).map(h => (
                  <div key={h.id} className="flex items-center justify-between text-[11px] text-white/60 px-2 py-1.5 bg-surface-400/50 rounded">
                    <span>{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                    <span className="text-neon font-semibold">{h.credits_used} cr · {h.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Falha ao ler duração do áudio'))
    }
    audio.src = url
  })
}
