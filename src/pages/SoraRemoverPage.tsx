import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Sparkles, Download, Link as LinkIcon } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { HistoryTab } from '../components/boosters/HistoryTab'
import { TOOL_CREDITS } from '../types/credits'

const CREDITS = TOOL_CREDITS.sora_remover

// Aceita só URLs do Sora 2 (sora.chatgpt.com/p/...) — bloqueio client-side, edge fn revalida.
const SORA_URL_REGEX = /^https?:\/\/(sora\.chatgpt\.com|sora\.com)\/p\/[\w-]+/i

type Tab = 'criar' | 'historico'

export function SoraRemoverPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [tab, setTab] = useState<Tab>('criar')
  const [videoUrl, setVideoUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const insufficient = credits < CREDITS
  const validUrl = SORA_URL_REGEX.test(videoUrl.trim())

  async function handleRemove() {
    const url = videoUrl.trim()
    if (!url) { toast.error('Cole a URL do vídeo Sora'); return }
    if (!validUrl) { toast.error('URL inválida — só aceita links do Sora 2 (sora.chatgpt.com/p/...)'); return }
    if (insufficient) { toast.error(`Créditos insuficientes (precisa ${CREDITS})`); return }

    setGenerating(true); setError(null); setResultUrl(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/sora-watermark-remover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({ video_url: url }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) { setError(data?.error || `Erro ${r.status}`); return }
      if (data?.task_id) {
        applyCreditsFromResponse(data)
        toast.success('Processando — acompanhe na aba Histórico')
        setTab('historico')
        setVideoUrl('')
      } else if (data?.video_url || data?.result_url) {
        applyCreditsFromResponse(data)
        setResultUrl(data.video_url || data.result_url)
        toast.success('Vídeo limpo!')
      } else {
        setError('Resposta inesperada da IA. Tente novamente.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function downloadVideo() {
    if (!resultUrl) return
    try {
      const res = await fetch(resultUrl)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `sora-clean-${Date.now()}.mp4`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(resultUrl, '_blank')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">SORA WATERMARK REMOVER</p>
          <h1 className="text-xl font-bold text-white">Remover marca d'água do Sora 2</h1>
          <p className="text-sm text-white/50">Cole a URL do vídeo do Sora e baixe sem marca d'água</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm font-bold">
          {CREDITS} créditos
        </div>
      </div>

      <div className="flex gap-1 bg-surface-300 rounded-xl p-1 max-w-md">
        <button onClick={() => setTab('criar')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'criar' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Remover</button>
        <button onClick={() => setTab('historico')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'historico' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Histórico</button>
      </div>

      {tab === 'criar' ? (
        <>
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon size={14} className="text-white/40" />
              <input
                type="url"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="Cole a URL do vídeo Sora 2 (sora.chatgpt.com/p/...)"
                className="flex-1 px-3 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={handleRemove}
                disabled={generating || insufficient || !validUrl}
                className="px-4 py-2.5 rounded-lg bg-neon text-surface-500 text-sm font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Remover
              </button>
            </div>
            {videoUrl && !validUrl && (
              <p className="text-[11px] text-amber-300/80">URL inválida — apenas links do Sora 2 (sora.chatgpt.com/p/...) são aceitos.</p>
            )}
            <p className="text-[11px] text-white/40">Saldo: <span className="text-neon font-semibold">{credits}</span> créditos</p>

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">{error}</div>}
          </div>

          {resultUrl ? (
            <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wide">Resultado</p>
              <video src={resultUrl} controls className="w-full rounded-lg" />
              <button onClick={downloadVideo} className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:brightness-110 cursor-pointer flex items-center justify-center gap-2">
                <Download size={14} /> Baixar vídeo
              </button>
            </div>
          ) : (
            <div className="bg-surface-300 border border-white/5 rounded-xl p-8 text-center">
              <p className="text-sm text-white/40">Suas gerações aparecerão aqui</p>
            </div>
          )}
        </>
      ) : (
        <HistoryTab tool="sora_remover" mediaType="video" />
      )}
    </div>
  )
}
