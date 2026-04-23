import { useState, useRef, useEffect } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Coins, Loader2, Upload, Play, Sparkles } from 'lucide-react'
import { BOOSTER_BY_SLUG, type BoosterInput } from '../types/boosters'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

function BoosterVideo({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState(false)
  useEffect(() => { ref.current?.play().catch(() => {}) }, [])
  if (err) return <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900/40 to-accent-900/40"><Play size={40} className="text-white/30" /></div>
  return <video ref={ref} src={url} className="w-full h-full object-cover" muted loop autoPlay playsInline preload="metadata" onError={() => setErr(true)} />
}

function ImageInput({ input, value, onChange }: { input: BoosterInput; value: string; onChange: (v: string) => void }) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
  }
  return (
    <div>
      <label className="text-sm text-white/70 mb-1.5 block">{input.label}{input.required && ' *'}</label>
      <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 hover:border-primary-500 transition-colors cursor-pointer">
        <Upload size={16} className="text-white/40" />
        <span className="text-sm text-white/60">{value ? 'Trocar imagem' : 'Escolher arquivo...'}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {value && <img src={value} alt="Preview" className="mt-2 h-24 rounded-lg object-cover" />}
    </div>
  )
}

function TextInput({ input, value, onChange }: { input: BoosterInput; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-white/70 mb-1.5 block">{input.label}{input.required && ' *'}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={input.placeholder}
        className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500"
      />
      {input.description && <p className="text-[10px] text-white/40 mt-1">{input.description}</p>}
    </div>
  )
}

function TextareaInput({ input, value, onChange }: { input: BoosterInput; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-white/70 mb-1.5 block">{input.label}{input.required && ' *'}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={input.placeholder}
        rows={3}
        className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500 resize-none"
      />
      {input.description && <p className="text-[10px] text-white/40 mt-1">{input.description}</p>}
    </div>
  )
}

function RadioInput({ input, value, onChange }: { input: BoosterInput; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-white/70 mb-1.5 block">{input.label}</label>
      <div className="flex gap-2">
        {input.options?.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              value === opt.value ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BoosterDetailPage() {
  const { tool } = useParams<{ tool: string }>()
  const booster = tool ? BOOSTER_BY_SLUG[tool] : undefined
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    booster?.inputs.forEach(i => { init[i.key] = i.type === 'radio' && i.options?.[0] ? i.options[0].value : '' })
    return init
  })
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ type: 'text' | 'image' | 'video' | 'queued'; data: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!booster) return <Navigate to="/booster" replace />
  if (booster.tool === 'studio_redirect') return <Navigate to="/influencer" replace />

  const credits = subscription?.credits_remaining ?? 0
  const hasInsufficientCredits = booster.credits > 0 && credits < booster.credits

  async function handleGenerate() {
    if (!booster) return
    // Validate required inputs
    for (const input of booster.inputs) {
      if (input.required && !values[input.key]?.trim()) {
        toast.error(`Preencha: ${input.label}`)
        return
      }
    }

    if (!booster.edgeFunction) {
      setError('Esta ferramenta estará disponível em breve. Em desenvolvimento.')
      return
    }

    setGenerating(true)
    setError(null)
    setResult(null)

    try {
      const payload: Record<string, string> = { ...values }
      if (booster.slug === 'skin') {
        payload.edit_prompt = 'enhance skin texture with ultra realism, detailed pores, natural skin tones, cinematic lighting, 8k quality'
      }
      const { data, error: fnError } = await supabase.functions.invoke(booster.edgeFunction, { body: payload })
      if (fnError) throw new Error(fnError.message)

      if (data?.error) {
        setError(data.error + (data.details ? ` (${data.details})` : ''))
        return
      }

      if (booster.resultType === 'text' && data?.prompt) {
        setResult({ type: 'text', data: data.prompt })
      } else if (data?.result) {
        setResult({ type: booster.resultType, data: data.result })
      } else if (data?.task_id) {
        setResult({ type: 'queued', data: `Task ID: ${data.task_id}. Você será notificado quando ficar pronto.` })
      } else if (data?.image_url) {
        setResult({ type: 'image', data: data.image_url })
      } else if (data?.status === 'queued') {
        setResult({ type: 'queued', data: 'Seu item entrou na fila. Você será notificado em breve.' })
      } else {
        setError('Resposta inesperada da IA. Tente novamente.')
      }
      toast.success('Gerado!')
    } catch (err) {
      setError((err as Error).message)
      toast.error('Erro ao gerar')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      {/* Header com vídeo de preview */}
      <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden">
        <div className="absolute inset-0">
          <BoosterVideo url={booster.videoUrl} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-end p-5">
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-primary-400" />
                <span className="text-xs text-white/60 uppercase tracking-wide">Booster</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{booster.title}</h1>
              <p className="text-sm text-white/70">{booster.description}</p>
            </div>
            <div className="text-right">
              {booster.isFree || booster.credits === 0 ? (
                <span className="px-3 py-1.5 rounded-full bg-green-500/90 text-white text-sm font-bold">FREE</span>
              ) : (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-600/90 text-white text-sm font-bold">
                  <Coins size={14} /> {booster.credits}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Form */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Configurações</h3>
          {booster.inputs.length === 0 ? (
            <p className="text-sm text-white/40">Nenhuma configuração adicional. Clique em Gerar.</p>
          ) : booster.inputs.map(input => {
            const val = values[input.key] || ''
            const onChange = (v: string) => setValues(prev => ({ ...prev, [input.key]: v }))
            if (input.type === 'image' || input.type === 'video') return <ImageInput key={input.key} input={input} value={val} onChange={onChange} />
            if (input.type === 'textarea') return <TextareaInput key={input.key} input={input} value={val} onChange={onChange} />
            if (input.type === 'radio') return <RadioInput key={input.key} input={input} value={val} onChange={onChange} />
            return <TextInput key={input.key} input={input} value={val} onChange={onChange} />
          })}

          {hasInsufficientCredits && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              Créditos insuficientes. Você tem {credits}, mas precisa de {booster.credits}.
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || hasInsufficientCredits}
            className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Gerando...' : 'Gerar'}
          </button>
        </div>

        {/* Preview do resultado */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 min-h-[300px] flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-4">Resultado</h3>
          {error ? (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <div>
                <p className="text-red-400 text-sm mb-1">❌ {error}</p>
                <p className="text-[11px] text-white/40">Se créditos foram debitados, foram estornados automaticamente.</p>
              </div>
            </div>
          ) : result ? (
            result.type === 'text' ? (
              <pre className="flex-1 text-sm text-white/80 whitespace-pre-wrap font-mono bg-surface-400 rounded-lg p-4 overflow-auto">{result.data}</pre>
            ) : result.type === 'image' ? (
              <img src={result.data} alt="Gerado" className="max-h-[400px] rounded-lg object-contain mx-auto" onError={() => setError('Imagem não carregou')} />
            ) : result.type === 'queued' ? (
              <div className="flex-1 flex items-center justify-center text-center p-4">
                <div>
                  <Loader2 size={32} className="text-primary-400 mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-white">{result.data}</p>
                </div>
              </div>
            ) : (
              <video src={result.data} controls className="max-h-[400px] rounded-lg mx-auto" />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <div className="w-14 h-14 rounded-full bg-primary-600/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={22} className="text-primary-400" />
                </div>
                <p className="text-white/50 text-sm">Seu resultado aparecerá aqui</p>
                <p className="text-white/30 text-xs mt-1">Preencha as configurações e clique em Gerar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
