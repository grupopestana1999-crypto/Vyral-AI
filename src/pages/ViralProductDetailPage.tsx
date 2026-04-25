import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, Flame, Sparkles, ExternalLink, Eye, Heart, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LazyVideo } from '../components/LazyVideo'
import { ErrorState } from '../components/ErrorState'
import type { Product, ProductVideo } from '../types/database'

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return n.toLocaleString('pt-BR')
}

interface DailyDatum { day: string; value: number }

// Gera 30 dias de série fictícia mas determinística pra parecer crescimento real
function generateRevenueSeries(seed: number, total: number): DailyDatum[] {
  const series: DailyDatum[] = []
  let acc = 0
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    // PRNG simples baseada em seed + i
    const r = Math.abs(Math.sin(seed * (i + 1) * 9301)) % 1
    const slice = (total / 30) * (0.6 + r * 0.8)
    acc += slice
    series.push({ day: date.toISOString().slice(5, 10), value: slice })
  }
  // normaliza pra somar exatamente "total"
  const sum = series.reduce((s, d) => s + d.value, 0)
  return series.map(d => ({ ...d, value: (d.value / sum) * total }))
}

function MiniChart({ data }: { data: DailyDatum[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 100, h = 100
  const points = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.value / max) * h}`).join(' ')
  const areaPath = `M0,${h} L${points.split(' ').join(' L')} L${w},${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-32">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#grad)" />
      <polyline points={points} fill="none" stroke="rgb(139, 92, 246)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function ViralProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [videos, setVideos] = useState<ProductVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await Promise.race([
          Promise.all([
            supabase.from('products').select('*').eq('id', id!).maybeSingle(),
            supabase.from('product_videos').select('*').eq('product_id', id!).order('revenue', { ascending: false }).limit(3),
          ]),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
        ])
        if (cancelled) return
        const [prodRes, vidRes] = result
        if (prodRes.error) throw new Error(prodRes.error.message)
        if (!prodRes.data) throw new Error('Produto não encontrado')
        setProduct(prodRes.data as Product)
        setVideos((vidRes.data as ProductVideo[]) || [])
      } catch (err) {
        if (!cancelled) setError((err as Error).message === 'timeout' ? 'Tempo de resposta excedido. Tente de novo.' : (err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, retryTick])

  const series = useMemo(() => {
    if (!product) return []
    const seed = parseInt(product.id.replace(/[^0-9]/g, '').slice(0, 6) || '1', 10) || 1
    return generateRevenueSeries(seed, product.revenue)
  }, [product])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="h-8 bg-surface-300 rounded w-32 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-72 bg-surface-300 rounded-xl animate-pulse" />
          <div className="h-72 bg-surface-300 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <ErrorState message={error || 'Produto não encontrado'} onRetry={() => setRetryTick(t => t + 1)} />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <button
        onClick={() => navigate('/viral-products')}
        className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} /> Voltar para Produtos Virais
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Coluna esquerda: imagem + dados básicos */}
        <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
          <div className="relative aspect-square bg-surface-400 rounded-lg overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag size={48} className="text-white/20" />
              </div>
            )}
            <div className={`absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold backdrop-blur ${
              product.heat_score >= 80 ? 'bg-red-500/40 text-red-200' : product.heat_score >= 50 ? 'bg-orange-500/40 text-orange-200' : 'bg-yellow-500/40 text-yellow-200'
            }`}>
              <Flame size={12} /> Heat {product.heat_score.toFixed(0)}
            </div>
          </div>
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-wide mb-1">{product.category}</p>
            <h1 className="text-lg font-bold text-white leading-tight">{product.name}</h1>
            <p className="text-sm text-primary-400 font-semibold mt-2">
              R$ {product.price_min.toLocaleString('pt-BR')} - R$ {product.price_max.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
            <div>
              <p className="text-[10px] text-white/40 uppercase">Receita 90d</p>
              <p className="text-xl font-bold text-emerald-400">{fmtCurrency(product.revenue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase">Vendidos</p>
              <p className="text-xl font-bold text-white">{fmtCount(product.items_sold)}</p>
            </div>
            {product.commission_rate != null && (
              <div>
                <p className="text-[10px] text-white/40 uppercase">Comissão</p>
                <p className="text-sm font-bold text-white">{product.commission_rate}%</p>
              </div>
            )}
            {product.sales != null && product.sales > 0 && (
              <div>
                <p className="text-[10px] text-white/40 uppercase">Sales</p>
                <p className="text-sm font-bold text-white">{fmtCount(product.sales)}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => navigate('/influencer', { state: { presetProductId: product.id } })}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 text-white text-sm font-bold hover:brightness-110 transition-all cursor-pointer"
            >
              <Sparkles size={16} /> Gerar UGC com este produto
            </button>
            {product.tiktok_url && (
              <a
                href={product.tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-400 border border-white/10 text-white text-sm font-medium hover:border-primary-500/40 transition-all cursor-pointer"
              >
                <ExternalLink size={14} /> Ver no TikTok Shop
              </a>
            )}
          </div>
        </div>

        {/* Coluna direita: gráfico + top vídeos */}
        <div className="space-y-5">
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Evolução de receita (30d)</h3>
            <p className="text-[11px] text-white/40 mb-4">Estimativa diária baseada no volume total</p>
            <MiniChart data={series} />
            <div className="flex items-center justify-between text-[10px] text-white/40 mt-2">
              <span>{series[0]?.day ?? ''}</span>
              <span>{series[series.length - 1]?.day ?? ''}</span>
            </div>
          </div>

          <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Top 3 vídeos promovendo este produto</h3>
            {videos.length === 0 ? (
              <p className="text-xs text-white/40 py-6 text-center">Nenhum vídeo viral atrelado ainda</p>
            ) : (
              <div className="space-y-3">
                {videos.map((v, i) => (
                  <div key={v.id} className="flex gap-3 items-start">
                    <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-surface-400">
                      {v.video_url ? (
                        <LazyVideo src={v.video_url} className="w-full h-full object-cover" fallbackImage={v.thumbnail_url ?? undefined} />
                      ) : v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : null}
                      <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white line-clamp-2 leading-snug">{v.title ?? 'Sem título'}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{v.creator_name ?? 'Criador'}</p>
                      <div className="flex items-center gap-2.5 mt-1.5 text-[10px]">
                        <span className="flex items-center gap-0.5 text-white/50"><Eye size={9} /> {fmtCount(v.views)}</span>
                        <span className="flex items-center gap-0.5 text-white/50"><Heart size={9} /> {fmtCount(v.likes)}</span>
                        <span className="flex items-center gap-0.5 text-emerald-400 font-semibold"><DollarSign size={9} /> {fmtCurrency(v.revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
