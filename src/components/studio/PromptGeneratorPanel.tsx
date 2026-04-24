import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ChevronDown, Loader2, Copy, Check, Video } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

export function PromptGeneratorPanel() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState<'5' | '10'>('5')
  const [style, setStyle] = useState<'casual' | 'dramatico' | 'clean'>('clean')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!description.trim()) { toast.error('Descreva o movimento que você quer'); return }
    setLoading(true)
    setResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { description, type: 'video', duration, style }
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      if (data?.prompt) setResult(data.prompt)
      else throw new Error('Resposta inesperada')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function copyResult() {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    toast.success('Prompt copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  function useInVeo() {
    if (!result) return
    navigate(`/booster/veo?prompt=${encodeURIComponent(result)}`)
  }

  return (
    <div className="bg-gradient-to-br from-primary-600/10 to-accent-600/10 border border-primary-500/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Gerar prompt VEO 3.1</p>
            <p className="text-[10px] text-white/50">Transforme essa imagem num vídeo com prompt otimizado</p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div>
            <label className="text-[11px] text-white/60 mb-1 block">Descreva o movimento</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: pessoa segurando o produto e sorrindo pra câmera, depois mostrando ele de perto"
              rows={3}
              className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/60 mb-1 block">Duração</label>
              <div className="flex gap-1">
                {(['5', '10'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer ${
                      duration === d ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                    }`}
                  >{d}s</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-white/60 mb-1 block">Estilo</label>
              <div className="flex gap-1">
                {([['casual', 'Casual'], ['dramatico', 'Dramát.'], ['clean', 'Clean']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setStyle(v)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer ${
                      style === v ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                    }`}
                  >{l}</button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !description.trim()}
            className="w-full py-2.5 rounded-lg bg-neon text-surface-500 text-xs font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? 'Gerando...' : 'Gerar prompt'}
          </button>

          {result && (
            <>
              <pre className="bg-surface-500 border border-white/5 rounded-lg p-3 text-[10px] text-white/80 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                {result}
              </pre>
              <div className="flex gap-2">
                <button
                  onClick={copyResult}
                  className="flex-1 py-2 rounded-lg bg-surface-400 border border-white/10 text-white text-xs font-medium hover:bg-white/5 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                </button>
                <button
                  onClick={useInVeo}
                  className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Video size={12} /> Usar no Veo
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
