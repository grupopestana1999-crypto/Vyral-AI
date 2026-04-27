import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Coins, Loader2, Upload, Sparkles, Download, Image as ImageIcon, Plus, X, Shirt, Palette, User, MoveDiagonal } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { BOOSTER_BY_SLUG } from '../types/boosters'
import { TOOL_CREDITS } from '../types/credits'

const CREDITS = TOOL_CREDITS.edit_image

const TEMPLATES = [
  { id: 'roupa', label: 'Trocar Roupa', icon: Shirt, prompt: 'Substitua a roupa da pessoa por outra peça moderna, mantendo o estilo casual e o ambiente. Mantenha o rosto e a pose iguais.' },
  { id: 'cenario', label: 'Trocar Cenário', icon: Palette, prompt: 'Substitua o fundo/cenário da imagem por um novo ambiente, mantendo a pessoa e o produto exatamente iguais e bem iluminados.' },
  { id: 'influencer', label: 'Trocar Influencer', icon: User, prompt: 'Substitua a pessoa por outra(o) influencer com etnia/aparência diferentes, mantendo a roupa, pose e ambiente iguais.' },
  { id: 'pose', label: 'Trocar Pose', icon: MoveDiagonal, prompt: 'Mude a pose da pessoa pra uma posição mais natural e dinâmica, mantendo o rosto, roupa e cenário iguais.' },
] as const

const FORMATS = [
  { id: '9:16', label: 'Vertical', sub: '9:16' },
  { id: '1:1', label: 'Quadrado', sub: '1:1' },
  { id: '3:4', label: 'Retrato', sub: '3:4' },
  { id: '16:9', label: 'Horizontal', sub: '16:9' },
] as const

type TemplateId = typeof TEMPLATES[number]['id']
type FormatId = typeof FORMATS[number]['id']

export function EditImagePage() {
  const navigate = useNavigate()
  const booster = BOOSTER_BY_SLUG['edit-image']
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [mainImage, setMainImage] = useState<string>('')
  const [refImages, setRefImages] = useState<string[]>([])
  const [template, setTemplate] = useState<TemplateId | null>(null)
  const [format, setFormat] = useState<FormatId>('9:16')
  const [editPrompt, setEditPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const insufficient = credits < CREDITS

  async function handleMainFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await resizeImageFile(file, 1280, 0.85)
      setMainImage(data); setResultUrl(null); setError(null)
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally { e.target.value = '' }
  }

  async function handleRefFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (refImages.length >= 3) { toast.error('Máximo de 3 referências'); return }
    try {
      const data = await resizeImageFile(file, 1024, 0.8)
      setRefImages(prev => [...prev, data])
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally { e.target.value = '' }
  }

  function pickTemplate(id: TemplateId) {
    setTemplate(id)
    const t = TEMPLATES.find(x => x.id === id)
    if (t && !editPrompt.trim()) setEditPrompt(t.prompt)
  }

  async function handleGenerate() {
    if (!mainImage) { toast.error('Suba a imagem para editar'); return }
    if (!editPrompt.trim()) { toast.error('Descreva a edição ou escolha um template'); return }

    setGenerating(true); setError(null); setResultUrl(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/edit-image-inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({
          image_url: mainImage,
          edit_prompt: editPrompt,
          mask_prompt: template ?? undefined,
          format,
        }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) {
        setError(data?.error || `Erro ${r.status}`)
        return
      }
      const out = data?.image_url || data?.result
      if (typeof out === 'string' && /^https?:\/\//.test(out)) {
        setResultUrl(out)
        toast.success('Imagem editada!')
      } else {
        setError('Resposta inesperada da IA. Tente novamente.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function downloadImage() {
    if (!resultUrl) return
    try {
      const res = await fetch(resultUrl)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `editada-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(resultUrl, '_blank')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{booster?.title ?? 'Editar Imagem'}</h1>
          <p className="text-sm text-white/50">{booster?.description ?? 'Substitua roupas, cenários, influencer ou poses com IA'}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm font-bold">
          <Coins size={14} /> {CREDITS} créditos
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* COLUNA ESQUERDA: imagem principal */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-wide">Imagem principal</p>

          <label className="block">
            {mainImage ? (
              <div className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer group">
                <img src={mainImage} alt="Original" className="w-full object-cover max-h-[480px]" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all">
                  <span className="text-white/0 group-hover:text-white text-sm font-medium flex items-center gap-2"><Upload size={14} /> Trocar imagem</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 cursor-pointer transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary-600/20 flex items-center justify-center">
                  <Upload size={20} className="text-primary-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/80 font-medium">Suba a imagem para editar</p>
                  <p className="text-[11px] text-white/40">PNG, JPG até 7MB</p>
                </div>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleMainFile} />
          </label>
        </div>

        {/* COLUNA DIREITA: opções */}
        <div className="space-y-4">
          {/* Referências opcionais */}
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wide">Referências (opcional)</p>
            <div className="flex gap-2 flex-wrap">
              {refImages.map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                  <img src={img} alt={`ref ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setRefImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white/80 hover:text-white cursor-pointer"
                  ><X size={10} /></button>
                </div>
              ))}
              {refImages.length < 3 && (
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 flex items-center justify-center cursor-pointer transition-colors">
                  <Plus size={18} className="text-white/40" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleRefFile} />
                </label>
              )}
            </div>
          </div>

          {/* Template de edição */}
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wide">Template de edição</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => {
                const Icon = t.icon
                const active = template === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => pickTemplate(t.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      active ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white border border-white/5'
                    }`}
                  >
                    <Icon size={14} className={active ? 'text-white' : 'text-primary-400'} />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Formato */}
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wide">Formato</p>
            <div className="grid grid-cols-4 gap-2">
              {FORMATS.map(f => {
                const active = format === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`p-2.5 rounded-lg text-center transition-all cursor-pointer ${
                      active ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white border border-white/5'
                    }`}
                  >
                    <div className="text-sm font-medium">{f.label}</div>
                    <div className="text-[10px] opacity-70">{f.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Descreva a edição */}
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wide">Descreva a edição</p>
            <textarea
              value={editPrompt}
              onChange={e => setEditPrompt(e.target.value)}
              placeholder="Selecione um template acima ou descreva a edição manualmente"
              rows={4}
              className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none"
            />
            {insufficient && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                Créditos insuficientes. Você tem {credits}, precisa de {CREDITS}.
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating || insufficient || !mainImage || !editPrompt.trim()}
              className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Editando...' : `Gerar (${CREDITS} créditos)`}
            </button>
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Resultado</p>
        {error ? (
          <div className="text-center py-10">
            <p className="text-red-400 text-sm mb-1">{error}</p>
            <p className="text-[11px] text-white/40">Se créditos foram debitados, foram estornados automaticamente.</p>
          </div>
        ) : generating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 size={28} className="text-primary-400 animate-spin" />
            <p className="text-sm text-white/60">A IA está editando...</p>
            <p className="text-[11px] text-white/30">pode levar 10-50 segundos</p>
          </div>
        ) : resultUrl ? (
          <div className="space-y-3 max-w-3xl mx-auto">
            <img src={resultUrl} alt="Resultado" className="w-full rounded-lg" />
            <button
              onClick={downloadImage}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:brightness-110 transition-all cursor-pointer"
            >
              <Download size={14} /> Baixar imagem
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-primary-600/10 flex items-center justify-center mx-auto mb-3">
              <ImageIcon size={20} className="text-primary-400" />
            </div>
            <p className="text-sm text-white/50">Sua imagem editada aparece aqui</p>
            <p className="text-[11px] text-white/30 mt-1">Suba a imagem, escolha um template e clique Gerar</p>
          </div>
        )}
      </div>

    </div>
  )
}
