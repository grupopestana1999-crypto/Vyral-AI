import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, Sparkles, Wand2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { HistoryTab } from '../components/boosters/HistoryTab'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { calcCredits } from '../types/credits'
import { useBoosterSettings } from '../stores/booster-settings-store'
import { CreditPreview } from '../components/boosters/CreditPreview'
import { invokeRaw } from '../lib/invokeRaw'

const MAX_PROMPT = 800
// E44: backend generate-grok-video v26 exige duration 6-30s (Kie grok-imagine).
// Antes era 1, batia em "Value must be within range" 500.
const MIN_DURATION = 6
const MAX_DURATION = 15
const DEFAULT_DURATION = 6

type Tab = 'criar' | 'historico'

export function VideosIaPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [tab, setTab] = useState<Tab>('criar')
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string>('')
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION)
  const [generating, setGenerating] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceElapsed, setEnhanceElapsed] = useState(0)
  const enhanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // E44: cliente quer que o card "Processando" apareça IMEDIATO no Histórico —
  // tab switcha otimisticamente e refreshTrigger força re-fetch após backend
  // INSERT do credit_usage_log pending.
  const [historyRefresh, setHistoryRefresh] = useState(0)

  useEffect(() => {
    if (enhancing) {
      setEnhanceElapsed(0)
      enhanceTimerRef.current = setInterval(() => setEnhanceElapsed(s => s + 1), 1000)
    } else {
      if (enhanceTimerRef.current) clearInterval(enhanceTimerRef.current)
    }
    return () => { if (enhanceTimerRef.current) clearInterval(enhanceTimerRef.current) }
  }, [enhancing])

  const cost = calcCredits('grok_video', { duration_s: duration })
  const insufficient = credits < cost

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await resizeImageFile(file, 1280, 0.85)
      setImageUrl(data)
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      e.target.value = ''
    }
  }

  async function enhancePrompt() {
    if (!prompt.trim()) { toast.error('Escreva algo no prompt primeiro'); return }
    setEnhancing(true)
    try {
      // E44: invokeRaw em vez de supabase.functions.invoke — invoke() pendura em
      // sessões longas (vide Pele Realista pré-E43). Padrão alinhado com Edit/Avatar/Pele.
      // E52: passa max_chars pro backend respeitar limite. Antes Gemini gerava livre e
      // o slice cortava feio no meio da palavra.
      const { data, error } = await invokeRaw<{ prompt?: string; truncated?: boolean; error?: string; over_limit?: boolean; uses_lifetime?: number; lifetime_limit?: number; uses_today?: number; limit?: number; credits_remaining?: number }>('enhance-prompt', {
        description: prompt, type: 'video', max_chars: MAX_PROMPT,
      })
      if (error) throw new Error(error.message)
      if (data?.error) { toast.error(data.error); return }
      if (typeof data?.prompt === 'string') {
        applyCreditsFromResponse(data)
        setPrompt(data.prompt.slice(0, MAX_PROMPT))
        const used = typeof data.uses_lifetime === 'number' ? data.uses_lifetime : data.uses_today
        const limit = typeof data.lifetime_limit === 'number' ? data.lifetime_limit : data.limit
        if (data.truncated) toast.success('Prompt melhorado e ajustado ao limite de 800 chars')
        else toast.success(data.over_limit ? 'Prompt melhorado (1 crédito)' : `Prompt melhorado (${used}/${limit} grátis · vida toda)`)
      }
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setEnhancing(false)
    }
  }

  async function handleGenerate() {
    if (!imageUrl) { toast.error('Suba uma imagem de referência'); return }
    if (!prompt.trim()) { toast.error('Escreva o prompt'); return }
    if (insufficient) { toast.error(`Créditos insuficientes (precisa ${cost})`); return }

    setGenerating(true)
    // E44: switch otimista pra Histórico ANTES do invokeRaw — cliente quer ver
    // o card "Processando" instantaneamente em vez de ficar esperando 1-2s na aba
    // Criar e achar que travou. Backend insere credit_usage_log pending logo de cara.
    setTab('historico')
    try {
      // E44: invokeRaw em vez de invoke() — mesma migração da Pele Realista (E43).
      const invokePromise = invokeRaw<{ task_id?: string; error?: string; credits_remaining?: number }>('generate-grok-video', {
        prompt, image_url: imageUrl, duration_s: duration,
      })
      const timeoutPromise = new Promise<{ kind: 'timeout' }>(res => setTimeout(() => res({ kind: 'timeout' }), 180_000))
      const result = await Promise.race([invokePromise, timeoutPromise])
      if (result.kind === 'timeout') {
        toast.error('Tempo excedido. A geração pode estar em andamento — veja o Histórico.')
        return
      }
      const { data, error: invokeError } = result
      if (invokeError) throw invokeError
      if (data?.error) { toast.error(data.error); setTab('criar'); return }
      if (data?.task_id) {
        applyCreditsFromResponse(data)
        toast.success('Vídeo em processamento — leva de 2 a 5 minutos. Assim que ficar pronto aparece na aba Histórico!')
        setHistoryRefresh(prev => prev + 1)
        setPrompt('')
        setImageUrl('')
      }
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
      setTab('criar')
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
          <p className="text-[11px] text-white/40 uppercase tracking-wide">VÍDEOS IA</p>
          <h1 className="text-xl font-bold text-white">Image to Video · 720p · 6-15s</h1>
          <p className="text-sm text-white/50">Transforme imagens em vídeos animados com IA</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm font-bold">
          {useBoosterSettings.getState().getCredits('grok_video', 'default') ?? 2} cr/segundo
        </div>
      </div>

      <div className="flex gap-1 bg-surface-300 rounded-xl p-1 max-w-md">
        <button
          onClick={() => setTab('criar')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            tab === 'criar' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'
          }`}
        >Criar</button>
        <button
          onClick={() => setTab('historico')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            tab === 'historico' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'
          }`}
        >Histórico</button>
      </div>

      {tab === 'criar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wide">Prompt</p>
                <span className="text-[10px] text-white/30">{prompt.length}/{MAX_PROMPT}</span>
              </div>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
                  placeholder="Sem falas. Apenas movimentos corporais naturais e expressões faciais autênticas."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none pr-3"
                />
                <button
                  onClick={enhancePrompt}
                  disabled={enhancing || !prompt.trim()}
                  className="absolute right-2 bottom-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neon text-surface-500 text-[11px] font-bold hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {enhancing ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                  {enhancing ? `Gerando ${enhanceElapsed}s` : 'Melhorar'}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Imagem de referência</p>
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
                    <p className="text-sm text-white/70">Adicionar imagem</p>
                    <p className="text-[11px] text-white/40">PNG, JPG até 7MB</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wide">Duração</p>
                <span className="text-sm text-white font-semibold">{duration}s</span>
              </div>
              <input
                type="range"
                min={MIN_DURATION}
                max={MAX_DURATION}
                step={1}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-white/30 mt-1">
                <span>{MIN_DURATION}s</span>
                <span>{MAX_DURATION}s</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || insufficient || !imageUrl || !prompt.trim()}
              className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Enviando…' : `Gerar — ${cost} cr`}
            </button>

            <p className="text-[11px] text-white/40 text-center">
              Saldo: <span className="text-neon font-semibold">{credits}</span> · Custo: <CreditPreview tool="grok_video" opts={{ duration_s: duration }} className="!text-[11px]" />
            </p>
          </div>

          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3 text-sm text-white/70">
            <p className="text-xs text-white/40 uppercase tracking-wide">Como funciona</p>
            <ol className="space-y-2 list-decimal list-inside text-[13px]">
              <li>Suba uma imagem de referência (pessoa, produto, cena)</li>
              <li>Descreva o vídeo que quer gerar — ou clique <span className="text-neon">Melhorar</span> pra IA escrever pra você</li>
              <li>Ajuste a duração ({MIN_DURATION}-{MAX_DURATION}s) — custo é {useBoosterSettings.getState().getCredits('grok_video', 'default') ?? 2} cr/s</li>
              <li>Clique Gerar — debita conforme duração e entra na fila</li>
              <li>Acompanhe o resultado na aba <span className="text-primary-400 font-medium">Histórico</span> (atualiza sozinho a cada 30s)</li>
            </ol>
            <div className="bg-surface-400/50 border border-white/5 rounded-lg p-3 text-[12px]">
              <p className="text-white/60 leading-relaxed"><span className="text-amber-300 font-medium">Dica:</span> cenas naturais com movimentos sutis rendem melhor. Evite descrições com falas, textos ou elementos gráficos.</p>
            </div>
          </div>
        </div>
      ) : (
        <HistoryTab tool="grok_video" mediaType="video" aspectRatio="9:16" refreshTrigger={historyRefresh} />
      )}
    </div>
  )
}
