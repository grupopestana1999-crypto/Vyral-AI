import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Sparkles, Trash2, Volume2, Wrench } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { calcCredits } from '../types/credits'

const MAX_VOICES = 3
const MIN_DURATION = 5
const MAX_DURATION = 60
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

  // Criar voz - desativada temporariamente (em manutenção, ver banner abaixo).
  // Quando reativar, voltar a usar audioDataUrl/audioDuration/cloning + handleAudioFile/handleClone.
  const [voiceName, setVoiceName] = useState('')

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

  // handleAudioFile + handleClone removidos enquanto banner "Em manutenção"
  // está ativo. Restaurar do git history quando Elevenlabs voltar a funcionar.

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
            <div className="relative flex flex-col items-center justify-center gap-3 py-12 rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Wrench size={20} className="text-amber-300" />
              </div>
              <div className="text-center max-w-md px-4">
                <p className="text-sm font-semibold text-amber-200">Em manutenção</p>
                <p className="text-[12px] text-amber-100/70 mt-1 leading-relaxed">
                  A clonagem de voz está temporariamente indisponível enquanto fazemos um ajuste na integração com o provedor de áudio. Volta em breve.
                </p>
              </div>
            </div>
          </div>

          <button disabled className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm opacity-40 cursor-not-allowed flex items-center justify-center gap-2">
            <Wrench size={16} />
            Indisponível no momento
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

// Helpers fileToDataUrl + getAudioDuration removidos enquanto upload de
// áudio está em manutenção. Restaurar do git history quando reativar.
