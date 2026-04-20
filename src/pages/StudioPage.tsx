import { useState, useEffect } from 'react'
import { Sparkles, Upload, ChevronDown, ChevronUp, Image, Loader2, Coins } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'
import { TOOL_CREDITS } from '../types/credits'
import { toast } from 'sonner'
import type { Product, Avatar } from '../types/database'

interface PanelProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function Panel({ title, subtitle, icon, children, defaultOpen = false }: PanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center text-primary-400">
          {icon}
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
        </div>
        {open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-white/5 pt-4">{children}</div>}
    </div>
  )
}

export function StudioPage() {
  const { user, subscription } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [scene, setScene] = useState('')
  const [boostQuality, setBoostQuality] = useState(1)
  const [format, setFormat] = useState('9:16')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [todayCount, setTodayCount] = useState(0)

  const credits = subscription?.credits_remaining ?? 0
  const cost = TOOL_CREDITS.studio_image

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [prodRes, avatarRes, usageRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('heat_score', { ascending: false }).limit(20),
      supabase.from('avatars').select('*').eq('is_active', true),
      supabase.from('daily_image_usage').select('images_generated').eq('user_email', user?.email ?? '').eq('usage_date', new Date().toISOString().split('T')[0]).maybeSingle(),
    ])
    if (prodRes.data) setProducts(prodRes.data)
    if (avatarRes.data) setAvatars(avatarRes.data)
    if (usageRes.data) setTodayCount(usageRes.data.images_generated)
  }

  async function handleGenerate() {
    if (credits < cost) {
      toast.error('Créditos insuficientes')
      return
    }
    if (!selectedProduct && !uploadedImage) {
      toast.error('Selecione um produto ou faça upload de uma imagem')
      return
    }

    setGenerating(true)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('generate-influencer-image', {
        body: {
          product_image: selectedProduct?.image_url ?? uploadedImage,
          avatar_image: selectedAvatar?.image_url ?? null,
          scene,
          boost_quality: boostQuality,
          format,
          user_email: user?.email,
        },
      })

      if (error) throw error
      if (data?.image_url) {
        setResult(data.image_url)
        toast.success('Imagem gerada com sucesso!')
        setTodayCount(prev => prev + 1)
      } else {
        toast.error(data?.error ?? 'Erro ao gerar imagem')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setGenerating(false)
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setUploadedImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Studio IA</h1>
          <p className="text-sm text-white/50">Crie imagens e vídeos UGC ultra-realistas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-3">
          <Panel title="Produto" icon={<Image size={16} />} defaultOpen>
            <div className="space-y-3">
              {products.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setUploadedImage(null) }}
                      className={`rounded-lg border-2 p-1 transition-all cursor-pointer ${
                        selectedProduct?.id === p.id ? 'border-primary-500' : 'border-transparent hover:border-white/20'
                      }`}
                    >
                      <img src={p.image_url ?? ''} alt={p.name} className="w-full h-16 object-cover rounded" />
                      <p className="text-[10px] text-white/60 truncate mt-1">{p.name}</p>
                    </button>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 hover:border-primary-500 transition-colors cursor-pointer">
                <Upload size={16} className="text-white/40" />
                <span className="text-sm text-white/40">Ou faça upload de uma imagem</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {uploadedImage && (
                <img src={uploadedImage} alt="Upload" className="h-20 rounded-lg object-cover" />
              )}
            </div>
          </Panel>

          <Panel title="Influencer" subtitle={selectedAvatar?.name ?? 'Escolha um avatar'} icon={<Sparkles size={16} />}>
            {avatars.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {avatars.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAvatar(a)}
                    className={`rounded-full border-2 overflow-hidden transition-all cursor-pointer ${
                      selectedAvatar?.id === a.id ? 'border-primary-500 scale-110' : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <img src={a.image_url} alt={a.name} className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/30">Nenhum avatar disponível ainda</p>
            )}
          </Panel>

          <Panel title="Cena" icon={<Image size={16} />}>
            <textarea
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="Descreva o cenário... ex: sala moderna com iluminação natural"
              className="w-full bg-surface-400 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500 resize-none h-20"
            />
          </Panel>

          <Panel title="Ajustes" subtitle={`${boostQuality} boost · ${format}`} icon={<Sparkles size={16} />}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Boost de Qualidade</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  value={boostQuality}
                  onChange={(e) => setBoostQuality(Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>Normal</span><span>Alto</span><span>Ultra</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Formato</label>
                <div className="flex gap-2">
                  {['9:16', '1:1', '16:9'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        format === f ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-300 border border-white/5 rounded-xl p-6 min-h-[400px] flex items-center justify-center">
            {result ? (
              <img src={result} alt="Gerado" className="w-full rounded-lg" />
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-600/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={24} className="text-primary-400" />
                </div>
                <p className="text-white/50 font-medium">Seu conteúdo aparecerá aqui</p>
                <p className="text-white/30 text-sm">Configure e gere sua imagem</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-white/50">
            <div className="flex items-center gap-1">
              <Image size={14} />
              <span>Hoje: <span className="text-white font-semibold">{todayCount}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <Coins size={14} className="text-neon" />
              <span className="text-neon font-semibold">{cost} créditos</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || credits < cost}
            className="w-full py-3.5 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Sparkles size={18} />
                Gerar Imagem
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
