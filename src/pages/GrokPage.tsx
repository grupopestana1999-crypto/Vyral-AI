import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Coins, Loader2, Upload, Sparkles, Wand2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { HistoryTab } from '../components/boosters/HistoryTab'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'

const CREDITS = 5
const MAX_PROMPT = 800

type Tab = 'criar' | 'historico'

export function GrokPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [tab, setTab] = useState<Tab>('criar')
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [enhancing, setEnhancing] = useState(false)

  const insufficient = credits < CREDITS

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
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')
      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({ description: prompt, type: 'video' }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) {
        toast.error(data?.error || `Erro ${r.status}`)
        return
      }
      if (typeof data?.prompt === 'string') {
        applyCreditsFromResponse(data)
        setPrompt(data.prompt.slice(0, MAX_PROMPT))
        const used = typeof data.uses_lifetime === 'number' ? data.uses_lifetime : data.uses_today
        const limit = typeof data.lifetime_limit === 'number' ? data.lifetime_limit : data.limit
        toast.success(data.over_limit ? 'Prompt melhorado (1 crédito)' : `Prompt melhorado (${used}/${limit} grátis · vida toda)`)
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
    if (insufficient) { toast.error('Créditos insuficientes'); return }

    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')
      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/generate-grok-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({ prompt, image_url: imageUrl }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) {
        toast.error(data?.error || `Erro ${r.status}`)
        return
      }
      if (data?.task_id) {
        applyCreditsFromResponse(data)
        toast.success('Vídeo entrou na fila — acompanhe na aba Histórico')
        setTab('historico')
        setPrompt('')
        setImageUrl('')
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
          <p className="text-[11px] text-white/40 uppercase tracking-wide">GROK AI</p>
          <h1 className="text-xl font-bold text-white">Image to Video · 720p · 10s</h1>
          <p className="text-sm text-white/50">Transforme uma imagem em vídeo cinematográfico</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm font-bold">
          <Coins size={14} /> {CREDITS} créditos
        </div>
      </div>

      {/* Tabs */}
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
          {/* Esquerda: Prompt */}
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40 uppercase tracking-wide">Prompt</p>
              <span className="text-[10px] text-white/30">{prompt.length}/{MAX_PROMPT}</span>
            </div>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
                placeholder="Sem falas. Apenas movimentos corporais naturais e expressões faciais autênticas. Sem texto, legenda, overlay, emoji, marca d'água ou elemento gráfico na tela."
                rows={6}
                className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none pr-3"
              />
              <button
                onClick={enhancePrompt}
                disabled={enhancing || !prompt.trim()}
                className="absolute right-2 bottom-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neon text-surface-500 text-[11px] font-bold hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
              >
                {enhancing ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                Melhorar
              </button>
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

            <button
              onClick={handleGenerate}
              disabled={generating || insufficient || !imageUrl || !prompt.trim()}
              className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Enviando…' : `Gerar (${CREDITS} créditos)`}
            </button>

            <p className="text-[11px] text-white/40 text-center">Saldo: <span className="text-neon font-semibold">{credits}</span> créditos</p>
          </div>

          {/* Direita: instruções/preview */}
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3 text-sm text-white/70">
            <p className="text-xs text-white/40 uppercase tracking-wide">Como funciona</p>
            <ol className="space-y-2 list-decimal list-inside text-[13px]">
              <li>Suba uma imagem de referência (pessoa, produto, cena)</li>
              <li>Descreva o vídeo que quer gerar — ou clique <span className="text-neon">Melhorar</span> pra a IA escrever pra você</li>
              <li>Clique Gerar — debita 5 créditos e entra na fila</li>
              <li>Acompanhe o resultado na aba <span className="text-primary-400 font-medium">Histórico</span> (atualiza sozinho a cada 30s)</li>
            </ol>
            <div className="bg-surface-400/50 border border-white/5 rounded-lg p-3 text-[12px]">
              <p className="text-white/60 leading-relaxed"><span className="text-amber-300 font-medium">Dica:</span> evite descrições com falas, textos ou elementos gráficos. O Grok rende mais com cenas naturais e movimentos sutis.</p>
            </div>
          </div>
        </div>
      ) : (
        <HistoryTab tool="grok_video" mediaType="video" />
      )}
    </div>
  )
}
