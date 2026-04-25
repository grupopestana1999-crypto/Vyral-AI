import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, ChevronDown, Loader2, Copy, Check, Video, Package,
  Camera, MessageCircle, Wand2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface Props {
  productName?: string | null
  productImage?: string | null
  resultImage?: string | null
}

const PRODUCT_TYPES = [
  { id: 'skincare', label: 'Skincare', emoji: '🧴' },
  { id: 'perfume', label: 'Perfume', emoji: '🌸' },
  { id: 'roupa', label: 'Roupa', emoji: '👕' },
  { id: 'calcado', label: 'Calçado', emoji: '👟' },
  { id: 'acessorio', label: 'Acessório', emoji: '👜' },
  { id: 'tech', label: 'Tech', emoji: '📱' },
  { id: 'suplemento', label: 'Suplemento', emoji: '💊' },
  { id: 'casa', label: 'Casa', emoji: '🏠' },
  { id: 'alimento', label: 'Alimento', emoji: '🍫' },
  { id: 'outro', label: 'Outro', emoji: '📦' },
] as const

const VIDEO_STYLES = [
  { id: 'ugc', label: 'UGC', desc: '~180 chars', emoji: '🎬' },
  { id: 'especialista', label: 'Especialista', desc: '~150 chars', emoji: '🎓' },
  { id: 'vendedor', label: 'Vendedor', desc: '~170 chars', emoji: '💸' },
  { id: 'depoimento', label: 'Depoimento', desc: '~150 chars', emoji: '💬' },
  { id: 'gancho', label: 'Gancho', desc: '~120 chars', emoji: '🪝' },
  { id: 'blogueirinha', label: 'Blogueirinha', desc: '~170 chars', emoji: '💅' },
  { id: 'amigavel', label: 'Amigável', desc: '~165 chars', emoji: '🤗' },
  { id: 'storyteller', label: 'Storyteller', desc: '~180 chars', emoji: '📖' },
  { id: 'rotina', label: 'Rotina', desc: '~150 chars', emoji: '⏰' },
  { id: 'cta', label: 'CTA', desc: '~130 chars', emoji: '👉' },
] as const

const CAMERA_MOVES = [
  { id: 'parada', label: 'Câmera parada', emoji: '📹' },
  { id: 'pov', label: 'POV', emoji: '👁️' },
  { id: 'panoramica', label: 'Panorâmica', emoji: '🎥' },
  { id: 'seguindo-mao', label: 'Seguindo mão', emoji: '✋' },
  { id: 'movimento-mao', label: 'Movimento mão', emoji: '🤚' },
  { id: 'espelho', label: 'No espelho', emoji: '🪞' },
  { id: 'zoom-in', label: 'Zoom in', emoji: '🔎' },
  { id: 'de-baixo', label: 'De baixo', emoji: '⬆️' },
] as const

export function PromptGeneratorPanel({ productName, productImage, resultImage }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [productType, setProductType] = useState<string>('outro')
  const [videoStyle, setVideoStyle] = useState<string>('ugc')
  const [cameraMove, setCameraMove] = useState<string>('parada')
  const [customMove, setCustomMove] = useState('')
  const [dialogue, setDialogue] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [usesToday, setUsesToday] = useState<{ used: number; limit: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    setResult(null)
    try {
      const styleLabel = VIDEO_STYLES.find(s => s.id === videoStyle)?.label ?? 'UGC'
      const typeLabel = PRODUCT_TYPES.find(t => t.id === productType)?.label ?? 'Outro'
      const moveLabel = customMove.trim() || (CAMERA_MOVES.find(m => m.id === cameraMove)?.label ?? 'Câmera parada')

      // Monta a description estruturada que será passada ao enhance-prompt
      const description = [
        `Produto: ${productName || 'Produto sem nome'} (${typeLabel})`,
        `Estilo de vídeo: ${styleLabel}`,
        `Movimento de câmera: ${moveLabel}`,
        dialogue.trim() ? `Diálogo sugerido: ${dialogue.trim()}` : 'Sem diálogo customizado (gerar fala natural em PT-BR)',
        productImage ? `Imagem de referência do produto: ${productImage}` : '',
        resultImage ? `Imagem da influencer já gerada: ${resultImage}` : '',
      ].filter(Boolean).join('\n')

      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { description, type: 'video', style: videoStyle, duration: '10' },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      if (data?.prompt) {
        setResult(data.prompt)
        if (typeof data.uses_today === 'number' && typeof data.limit === 'number') {
          setUsesToday({ used: data.uses_today, limit: data.limit })
        }
      } else {
        throw new Error('Resposta inesperada')
      }
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
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* 1. Produto */}
          <Section icon={<Package size={12} />} number={1} title="Produto">
            <p className="text-[11px] text-white/60 mb-1.5">Nome do produto</p>
            <p className="text-xs text-white bg-surface-400 rounded px-3 py-2 truncate mb-2">
              {productName || 'Selecione um produto no Studio primeiro'}
            </p>
            {productImage && (
              <>
                <p className="text-[11px] text-white/60 mb-1.5">Imagem de referência</p>
                <img src={productImage} alt="Produto" className="w-16 h-16 rounded object-cover mb-3" />
              </>
            )}
            <p className="text-[11px] text-white/60 mb-1.5">Tipo de produto</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PRODUCT_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setProductType(t.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    productType === t.id ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* 2. Estilo de Vídeo */}
          <Section icon={<Wand2 size={12} />} number={2} title="Estilo de Vídeo">
            <div className="grid grid-cols-2 gap-1.5">
              {VIDEO_STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setVideoStyle(s.id)}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-left transition-all cursor-pointer ${
                    videoStyle === s.id ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                  }`}
                >
                  <span>{s.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium block leading-tight">{s.label}</span>
                    <span className="text-[9px] text-white/40 block">{s.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* 4. Movimento de Câmera */}
          <Section icon={<Camera size={12} />} number={4} title="Movimento de Câmera">
            <div className="grid grid-cols-2 gap-1.5">
              {CAMERA_MOVES.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setCameraMove(m.id); setCustomMove('') }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    cameraMove === m.id && !customMove ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customMove}
              onChange={e => setCustomMove(e.target.value)}
              placeholder="Ou descreva um movimento customizado..."
              className="mt-2 w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500"
            />
          </Section>

          {/* 5. Diálogo */}
          <Section icon={<MessageCircle size={12} />} number={5} title="Diálogo" badge="Opcional">
            <p className="text-[10px] text-white/40 mb-1.5">
              Se deixar vazio, a IA vai gerar uma fala natural em PT-BR no estilo selecionado.
            </p>
            <textarea
              value={dialogue}
              onChange={e => setDialogue(e.target.value.slice(0, 180))}
              placeholder="Ex: Gente, olha essa textura! Nunca vi nada igual..."
              rows={3}
              className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none"
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>Português (BR)</span>
              <span>{dialogue.length}/180</span>
            </div>
          </Section>

          <button
            onClick={generate}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-neon text-surface-500 text-sm font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading
              ? 'Gerando...'
              : `Gerar Prompt${usesToday ? ` (${usesToday.used}/${usesToday.limit})` : ''}`}
          </button>

          {result && (
            <>
              <pre className="bg-surface-500 border border-white/5 rounded-lg p-3 text-[10px] text-white/80 whitespace-pre-wrap font-mono max-h-72 overflow-y-auto">
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

function Section({ icon, number, title, badge, children }: { icon: React.ReactNode; number: number; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-400/30 rounded-lg p-3 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded bg-primary-600/20 flex items-center justify-center text-primary-300 text-[10px] font-bold">{number}</div>
        <span className="text-primary-300">{icon}</span>
        <h4 className="text-xs font-semibold text-white">{title}</h4>
        {badge && <span className="ml-auto text-[9px] text-white/40 uppercase tracking-wide">{badge}</span>}
      </div>
      {children}
    </div>
  )
}
