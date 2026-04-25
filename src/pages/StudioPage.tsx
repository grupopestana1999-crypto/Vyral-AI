import { useState, useEffect } from 'react'
import { Sparkles, Upload, ChevronDown, ChevronUp, Image, Loader2, Coins, Flame, Package, User, Camera, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'
import { TOOL_CREDITS } from '../types/credits'
import { toast } from 'sonner'
import type { Product, Avatar } from '../types/database'
import { POSES, STYLES, FORMATS, ENHANCEMENTS, SCENARIOS } from '../types/studio'
import { PromptGeneratorPanel } from '../components/studio/PromptGeneratorPanel'
import { GenerationPreview } from '../components/studio/GenerationPreview'

const STUDIO_SESSION_KEY = 'vyral_studio_session'

interface StudioSession {
  status: 'idle' | 'generating' | 'done' | 'error'
  resultUrl: string | null
  errorMessage: string | null
  generatedAt?: number
  productId?: string | null
  productImage?: string | null
  productName?: string | null
}

function Panel({ title, subtitle, icon, children, defaultOpen = false }: {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
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

function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 bg-surface-400 rounded-lg p-1 mb-3">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
            active === t.id ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'
          }`}
        >{t.label}</button>
      ))}
    </div>
  )
}

export function StudioPage() {
  const { user, subscription } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [avatars, setAvatars] = useState<Avatar[]>([])

  // Painel Produto
  const [productTab, setProductTab] = useState<'viral' | 'upload'>('viral')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [uploadedProduct, setUploadedProduct] = useState<string | null>(null)
  // Quando produto tem additional_images, esse é o índice da variação selecionada (-1 = imagem principal)
  const [selectedVariationIdx, setSelectedVariationIdx] = useState<number>(-1)

  // Painel Influencer
  const [influencerTab, setInfluencerTab] = useState<'ready' | 'upload'>('ready')
  const [influencerGender, setInfluencerGender] = useState<'female' | 'male'>('female')
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null)

  // Painel Cena
  const [sceneTab, setSceneTab] = useState<'ready' | 'upload' | 'custom'>('ready')
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [uploadedScene, setUploadedScene] = useState<string | null>(null)
  const [customScene, setCustomScene] = useState('')

  // Painel Ajustes
  const [pose, setPose] = useState('front')
  const [style, setStyle] = useState('casual')
  const [enhancements, setEnhancements] = useState<Set<string>>(new Set(ENHANCEMENTS.filter(e => e.defaultActive).map(e => e.id)))
  const [format, setFormat] = useState('9:16')
  const [additionalInfo, setAdditionalInfo] = useState('')

  // Estado consolidado da sessão de geração — persiste em localStorage
  const [session, setSession] = useState<StudioSession>(() => {
    try {
      const raw = localStorage.getItem(STUDIO_SESSION_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as StudioSession
        if (parsed.status === 'generating') {
          return { status: 'idle', resultUrl: null, errorMessage: null }
        }
        if (parsed.status === 'done') {
          const validUrl = typeof parsed.resultUrl === 'string' && /^https?:\/\//.test(parsed.resultUrl)
          const fresh = parsed.generatedAt && Date.now() - parsed.generatedAt < 24 * 3600_000
          if (!validUrl || !fresh) return { status: 'idle', resultUrl: null, errorMessage: null }
        }
        return parsed
      }
    } catch { /* ignore */ }
    return { status: 'idle', resultUrl: null, errorMessage: null }
  })
  const [todayCount, setTodayCount] = useState(0)
  const generating = session.status === 'generating'

  // Persist session em localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STUDIO_SESSION_KEY, JSON.stringify(session))
    } catch { /* quota / private mode */ }
  }, [session])

  const credits = subscription?.credits_remaining ?? 0
  const cost = TOOL_CREDITS.studio_image

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const result = await Promise.race([
          Promise.all([
            supabase.from('products').select('*').eq('is_active', true).order('heat_score', { ascending: false }).limit(30),
            supabase.from('avatars').select('*').eq('is_active', true),
            supabase.from('daily_image_usage').select('images_generated').eq('user_email', user?.email ?? '').eq('usage_date', new Date().toISOString().split('T')[0]).maybeSingle(),
          ]),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
        ])
        if (cancelled) return
        const [prodRes, avatarRes, usageRes] = result
        if (prodRes.error) throw new Error(prodRes.error.message)
        if (avatarRes.error) throw new Error(avatarRes.error.message)
        if (prodRes.data) setProducts(prodRes.data)
        if (avatarRes.data) setAvatars(avatarRes.data)
        if (usageRes.data) setTodayCount(usageRes.data.images_generated)
      } catch (err) {
        if (!cancelled) {
          const msg = (err as Error).message
          toast.error(msg === 'timeout' ? 'Tempo excedido ao carregar produtos. Recarregue a página.' : 'Erro ao carregar: ' + msg)
        }
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [user?.email])

  function fileToDataUrl(onLoad: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => onLoad(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  function toggleEnhancement(id: string) {
    setEnhancements(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  // Resolve qual imagem do produto usar (variation se selecionada, senão image_url principal)
  function resolveProductImage(): string | null {
    if (uploadedProduct) return uploadedProduct
    if (!selectedProduct) return null
    const variations = (selectedProduct.additional_images ?? []) as string[]
    if (selectedVariationIdx >= 0 && variations[selectedVariationIdx]) return variations[selectedVariationIdx]
    return selectedProduct.image_url
  }

  async function handleGenerate() {
    if (credits < cost) { toast.error('Créditos insuficientes'); return }
    const productSource = resolveProductImage()
    if (!productSource) { toast.error('Selecione um produto ou faça upload'); return }

    setSession({
      status: 'generating',
      resultUrl: null,
      errorMessage: null,
      productId: selectedProduct?.id ?? null,
      productImage: productSource,
      productName: selectedProduct?.name ?? 'Upload',
    })

    const sceneText = selectedScenario ? SCENARIOS.find(s => s.id === selectedScenario)?.promptHint ?? '' : customScene || ''
    const enhancementList = Array.from(enhancements).map(id => ENHANCEMENTS.find(e => e.id === id)?.name).filter(Boolean).join(', ')
    const poseName = POSES.find(p => p.id === pose)?.name
    const styleName = STYLES.find(s => s.id === style)?.name

    try {
      const { data, error } = await supabase.functions.invoke('generate-influencer-image', {
        body: {
          product_image: productSource,
          avatar_image: selectedAvatar?.image_url ?? uploadedAvatar,
          scene: `${sceneText}${additionalInfo ? ' | ' + additionalInfo : ''}`,
          boost_quality: 2,
          format,
          pose: poseName,
          style: styleName,
          enhancements: enhancementList,
          user_email: user?.email,
        },
      })

      if (error) throw error
      if (data?.error) {
        setSession(s => ({ ...s, status: 'error', errorMessage: data.error }))
        toast.error(data.error)
        return
      }
      const url = data?.image_url
      if (typeof url === 'string' && /^https?:\/\//.test(url)) {
        setSession(s => ({ ...s, status: 'done', resultUrl: url, generatedAt: Date.now() }))
        toast.success('Gerado com sucesso!')
        setTodayCount(prev => prev + 1)
      } else {
        setSession(s => ({ ...s, status: 'error', errorMessage: 'Resposta inesperada da IA' }))
        toast.error('Resposta inesperada')
      }
    } catch (err) {
      const msg = (err as Error).message
      setSession(s => ({ ...s, status: 'error', errorMessage: msg }))
      toast.error('Erro: ' + msg)
    }
  }

  function regenerate() {
    setSession({ status: 'idle', resultUrl: null, errorMessage: null })
    void handleGenerate()
  }

  const femaleAvatars = avatars.filter(a => a.gender === 'female')
  const maleAvatars = avatars.filter(a => a.gender === 'male')
  const currentAvatars = influencerGender === 'female' ? femaleAvatars : maleAvatars

  return (
    <div className="max-w-7xl mx-auto">
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
          {/* PAINEL PRODUTO */}
          <Panel title="Produto" subtitle={selectedProduct?.name ?? (uploadedProduct ? 'Upload feito' : 'Escolha um produto')} icon={<Package size={16} />} defaultOpen>
            <Tabs tabs={[{ id: 'viral', label: 'Produtos Virais' }, { id: 'upload', label: 'Upload' }]} active={productTab} onChange={(id) => setProductTab(id as 'viral' | 'upload')} />
            {productTab === 'viral' ? (
              <>
                {products.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-4">Nenhum produto viral cadastrado. Use Upload.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {products.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setUploadedProduct(null); setSelectedVariationIdx(-1) }}
                        className={`relative rounded-lg border-2 p-1 transition-all cursor-pointer ${
                          selectedProduct?.id === p.id ? 'border-primary-500' : 'border-transparent hover:border-white/20'
                        }`}
                      >
                        <div className="relative">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-16 object-cover rounded" loading="lazy" />
                          ) : (
                            <div className="w-full h-16 bg-surface-400 rounded flex items-center justify-center"><Package size={20} className="text-white/20" /></div>
                          )}
                          {p.heat_score >= 70 && (
                            <span className="absolute top-0.5 right-0.5 flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[8px] font-bold bg-red-500/80 text-white">
                              <Flame size={8} /> {p.heat_score.toFixed(0)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/60 truncate mt-1 text-left">{p.name}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Variations: aparece quando o produto selecionado tem additional_images */}
                {selectedProduct && Array.isArray(selectedProduct.additional_images) && selectedProduct.additional_images.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[11px] text-white/60 mb-2">Selecione a variação:</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      <button
                        onClick={() => setSelectedVariationIdx(-1)}
                        className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${selectedVariationIdx === -1 ? 'border-primary-500' : 'border-transparent hover:border-white/20'}`}
                      >
                        <img src={selectedProduct.image_url} alt="Principal" className="w-12 h-12 object-cover" loading="lazy" />
                      </button>
                      {(selectedProduct.additional_images as string[]).map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedVariationIdx(idx)}
                          className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${selectedVariationIdx === idx ? 'border-primary-500' : 'border-transparent hover:border-white/20'}`}
                        >
                          <img src={url} alt={`Variação ${idx + 1}`} className="w-12 h-12 object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 hover:border-primary-500 transition-colors cursor-pointer">
                  <Upload size={16} className="text-white/40" />
                  <span className="text-sm text-white/60">{uploadedProduct ? 'Trocar imagem' : 'Escolher arquivo...'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={fileToDataUrl(v => { setUploadedProduct(v); setSelectedProduct(null) })} />
                </label>
                {uploadedProduct && <img src={uploadedProduct} alt="Upload" className="mt-2 h-20 rounded-lg object-cover" />}
              </div>
            )}
          </Panel>

          {/* PAINEL INFLUENCER */}
          <Panel title="Influencer" subtitle={selectedAvatar?.name ?? (uploadedAvatar ? 'Upload feito' : 'Escolha um avatar')} icon={<User size={16} />}>
            <Tabs tabs={[{ id: 'ready', label: 'Prontos' }, { id: 'upload', label: 'Upload' }]} active={influencerTab} onChange={(id) => setInfluencerTab(id as 'ready' | 'upload')} />
            {influencerTab === 'ready' ? (
              <>
                <Tabs tabs={[{ id: 'female', label: `Feminino (${femaleAvatars.length})` }, { id: 'male', label: `Masculino (${maleAvatars.length})` }]} active={influencerGender} onChange={(id) => setInfluencerGender(id as 'female' | 'male')} />
                {currentAvatars.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-4">Nenhum avatar nesta categoria</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {currentAvatars.map(a => (
                      <button
                        key={a.id}
                        onClick={() => { setSelectedAvatar(a); setUploadedAvatar(null) }}
                        className={`relative rounded-full border-2 overflow-hidden transition-all cursor-pointer bg-surface-400 ${
                          selectedAvatar?.id === a.id ? 'border-primary-500 scale-110' : 'border-transparent hover:border-white/20'
                        }`}
                        style={{ aspectRatio: '1 / 1' }}
                      >
                        <img
                          src={a.image_url}
                          alt={a.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onLoad={(e) => (e.currentTarget as HTMLImageElement).classList.add('opacity-100')}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div>
                <Tabs tabs={[{ id: 'female', label: 'Feminino' }, { id: 'male', label: 'Masculino' }]} active={influencerGender} onChange={(id) => setInfluencerGender(id as 'female' | 'male')} />
                <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 hover:border-primary-500 transition-colors cursor-pointer">
                  <Upload size={16} className="text-white/40" />
                  <span className="text-sm text-white/60">{uploadedAvatar ? 'Trocar foto' : `Subir foto ${influencerGender === 'female' ? 'feminina' : 'masculina'}`}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={fileToDataUrl(v => { setUploadedAvatar(v); setSelectedAvatar(null) })} />
                </label>
                {uploadedAvatar && <img src={uploadedAvatar} alt="Upload" className="mt-2 h-20 rounded-full object-cover" />}
              </div>
            )}
          </Panel>

          {/* PAINEL CENA */}
          <Panel title="Cena" subtitle={selectedScenario ? SCENARIOS.find(s => s.id === selectedScenario)?.name : (customScene ? 'Personalizada' : 'Escolha uma cena')} icon={<Camera size={16} />}>
            <Tabs tabs={[{ id: 'ready', label: 'Prontas' }, { id: 'upload', label: 'Upload' }, { id: 'custom', label: 'Personalizada' }]} active={sceneTab} onChange={(id) => setSceneTab(id as 'ready' | 'upload' | 'custom')} />
            {sceneTab === 'ready' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SCENARIOS.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => { setSelectedScenario(sc.id); setUploadedScene(null); setCustomScene('') }}
                    className={`relative rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
                      selectedScenario === sc.id ? 'border-primary-500' : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <img src={sc.thumbnail} alt={sc.name} className="w-full h-16 object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <p className="absolute bottom-1 left-1 right-1 text-[10px] text-white font-medium text-left truncate">{sc.name}</p>
                  </button>
                ))}
              </div>
            ) : sceneTab === 'upload' ? (
              <div>
                <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 hover:border-primary-500 transition-colors cursor-pointer">
                  <Upload size={16} className="text-white/40" />
                  <span className="text-sm text-white/60">{uploadedScene ? 'Trocar cena' : 'Upload de cena'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={fileToDataUrl(v => { setUploadedScene(v); setSelectedScenario(null) })} />
                </label>
                {uploadedScene && <img src={uploadedScene} alt="Upload" className="mt-2 h-20 rounded-lg object-cover" />}
              </div>
            ) : (
              <textarea
                value={customScene}
                onChange={(e) => { setCustomScene(e.target.value); setSelectedScenario(null); setUploadedScene(null) }}
                placeholder="Descreva o cenário em detalhes... ex: sala moderna com luz natural pela manhã, plantas, sofá cinza"
                className="w-full bg-surface-400 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500 resize-none h-20"
              />
            )}
          </Panel>

          {/* PAINEL AJUSTES */}
          <Panel title="Ajustes" subtitle={`${POSES.find(p => p.id === pose)?.name} · ${STYLES.find(s => s.id === style)?.name} · ${format}`} icon={<SlidersHorizontal size={16} />}>
            <div className="space-y-4">
              {/* POSE */}
              <div>
                <p className="text-xs text-white/50 mb-2">Pose</p>
                <div className="grid grid-cols-3 gap-2">
                  {POSES.map(p => (
                    <button key={p.id} onClick={() => setPose(p.id)}
                      className={`p-2 rounded-lg text-center transition-all cursor-pointer ${
                        pose === p.id ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                      }`}>
                      <div className="text-lg mb-0.5">{p.emoji}</div>
                      <div className="text-[10px] font-medium">{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ESTILO */}
              <div>
                <p className="text-xs text-white/50 mb-2">Estilo</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className={`p-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                        style === s.id ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                      }`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* MELHORIAS */}
              <div>
                <p className="text-xs text-white/50 mb-2">Melhorias</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {ENHANCEMENTS.map(e => {
                    const active = enhancements.has(e.id)
                    return (
                      <button key={e.id} onClick={() => toggleEnhancement(e.id)}
                        className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          active ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'
                        }`}>
                        <span>{e.emoji}</span>
                        <span>{e.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* FORMATO */}
              <div>
                <p className="text-xs text-white/50 mb-2">Formato</p>
                <div className="grid grid-cols-4 gap-2">
                  {FORMATS.map(f => (
                    <button key={f.id} onClick={() => setFormat(f.id)}
                      className={`p-2 rounded-lg text-center transition-all cursor-pointer ${
                        format === f.id ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                      }`}>
                      <div className="text-sm font-medium mb-0.5">{f.name}</div>
                      <div className="text-[9px] text-white/60">{f.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* INFO ADICIONAL */}
              <div>
                <p className="text-xs text-white/50 mb-2">Informações Adicionais</p>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Detalhes extras pra guiar a geração... ex: use cores suaves, destaque o logo do produto"
                  className="w-full bg-surface-400 border border-white/10 rounded-lg p-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500 resize-none h-16"
                />
              </div>
            </div>
          </Panel>
        </div>

        {/* PREVIEW + GERAR */}
        <div className="space-y-4">
          <GenerationPreview
            status={session.status}
            resultUrl={session.resultUrl}
            errorMessage={session.errorMessage}
            onRegenerate={regenerate}
          />

          {session.status === 'done' && session.resultUrl && (
            <PromptGeneratorPanel
              productName={session.productName ?? selectedProduct?.name ?? null}
              productImage={session.productImage ?? null}
              resultImage={session.resultUrl}
            />
          )}

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
            {generating ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} />Gerar Imagem</>}
          </button>
        </div>
      </div>
    </div>
  )
}
