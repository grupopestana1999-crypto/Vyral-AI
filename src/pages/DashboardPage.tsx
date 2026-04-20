import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb, Gift, ShoppingBag, Video, Users, TrendingUp, Eye, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Product, ProductVideo, Creator } from '../types/database'

const TIPS = [
  { title: 'Regra do 3-5-7 pra Trocar Produto', tag: 'Estratégia', text: 'Faça 3-5 vídeos com abordagens diferentes antes de desistir de um produto. Se após 7 vídeos não vendeu nada, troque.' },
  { title: 'Use o Studio IA para criar UGC', tag: 'Produtividade', text: 'Combine produtos virais com influencers virtuais para gerar conteúdo UGC ultra-realista em segundos.' },
  { title: 'Analise os Vídeos Virais', tag: 'Análise', text: 'Observe os hooks, dores e CTAs dos vídeos que mais faturam. Replique o padrão no seu conteúdo.' },
  { title: 'Compre créditos extras quando precisar', tag: 'Créditos', text: 'Use os pacotes avulsos para não ficar sem créditos nos momentos mais importantes de produção.' },
  { title: 'Indique amigos e ganhe créditos', tag: 'Referral', text: 'Cada indicação pode render até 300 créditos extras dependendo do seu plano.' },
  { title: 'Foque em categorias com alta demanda', tag: 'Tendência', text: 'Beleza, Roupas e Equipamentos costumam ter os melhores resultados no TikTok Shop.' },
]

function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtCurrency(n: number) { return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

export function DashboardPage() {
  const [tipIdx, setTipIdx] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [videos, setVideos] = useState<ProductVideo[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function load() {
      const [p, v, c] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('heat_score', { ascending: false }).limit(3),
        supabase.from('product_videos').select('*').order('revenue', { ascending: false }).limit(3),
        supabase.from('creators').select('*').eq('is_active', true).order('projected_monthly_sales', { ascending: false }).limit(3),
      ])
      if (p.data) setProducts(p.data)
      if (v.data) setVideos(v.data)
      if (c.data) setCreators(c.data)
      setLoading(false)
    }
    load()
  }, [])

  const tip = TIPS[tipIdx]

  return (
    <div className="space-y-6">
      {/* Dica do Dia */}
      <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-white/40 uppercase tracking-wide">Dica do dia</p>
              <span className="px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400 text-[10px] font-medium">{tip.tag}</span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">{tip.title}</p>
            <p className="text-sm text-white/50">{tip.text}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setTipIdx(i => (i - 1 + TIPS.length) % TIPS.length)} className="p-1 rounded hover:bg-white/5 text-white/30 cursor-pointer"><ChevronLeft size={16} /></button>
            <button onClick={() => setTipIdx(i => (i + 1) % TIPS.length)} className="p-1 rounded hover:bg-white/5 text-white/30 cursor-pointer"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Ganhe créditos grátis */}
      <Link to="/referral" className="block bg-gradient-to-r from-primary-600/20 to-accent-600/20 border border-primary-500/20 rounded-xl p-4 hover:border-primary-500/40 transition-colors">
        <div className="flex items-center gap-3">
          <Gift size={20} className="text-primary-400" />
          <div>
            <p className="text-sm font-semibold text-white">Ganhe créditos grátis</p>
            <p className="text-xs text-white/50">Convide e ganhe +600 créditos</p>
          </div>
        </div>
      </Link>

      {/* Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Top Produtos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-primary-400" />
              <h3 className="text-sm font-semibold text-white">Top Produtos</h3>
            </div>
            <Link to="/viral-products" className="text-xs text-primary-400 hover:text-primary-300">Ver Todos</Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-16 bg-surface-300 rounded-lg animate-pulse" />)
            ) : products.length === 0 ? (
              <p className="text-sm text-white/30 py-4 text-center">Nenhum produto encontrado</p>
            ) : products.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-surface-300 border border-white/5 rounded-lg p-3">
                <span className="text-sm font-bold text-primary-400 w-5">{i + 1}</span>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-surface-400 flex items-center justify-center"><ShoppingBag size={16} className="text-white/20" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{p.name}</p>
                  <div className="flex items-center gap-3 text-[11px] text-white/40">
                    <span><DollarSign size={10} className="inline" /> {fmtCurrency(p.revenue)}</span>
                    <span><TrendingUp size={10} className="inline" /> {fmt(p.items_sold)} vendidos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Vídeos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Video size={16} className="text-primary-400" />
              <h3 className="text-sm font-semibold text-white">Top Vídeos</h3>
            </div>
            <Link to="/viral-videos" className="text-xs text-primary-400 hover:text-primary-300">Ver Todos</Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-16 bg-surface-300 rounded-lg animate-pulse" />)
            ) : videos.length === 0 ? (
              <p className="text-sm text-white/30 py-4 text-center">Nenhum vídeo encontrado</p>
            ) : videos.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3 bg-surface-300 border border-white/5 rounded-lg p-3">
                <span className="text-sm font-bold text-primary-400 w-5">{i + 1}</span>
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={v.title ?? ''} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-surface-400 flex items-center justify-center"><Video size={16} className="text-white/20" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{v.title ?? 'Sem título'}</p>
                  <div className="flex items-center gap-3 text-[11px] text-white/40">
                    <span><Eye size={10} className="inline" /> {fmt(v.views)}</span>
                    <span><DollarSign size={10} className="inline" /> {fmtCurrency(v.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Criadores */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary-400" />
              <h3 className="text-sm font-semibold text-white">Top Criadores</h3>
            </div>
            <Link to="/viral-creators" className="text-xs text-primary-400 hover:text-primary-300">Ver Todos</Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-16 bg-surface-300 rounded-lg animate-pulse" />)
            ) : creators.length === 0 ? (
              <p className="text-sm text-white/30 py-4 text-center">Nenhum criador encontrado</p>
            ) : creators.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 bg-surface-300 border border-white/5 rounded-lg p-3">
                <span className="text-sm font-bold text-primary-400 w-5">{i + 1}</span>
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-400 flex items-center justify-center"><Users size={16} className="text-white/20" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">@{c.username ?? c.name}</p>
                  <div className="flex items-center gap-3 text-[11px] text-white/40">
                    <span>{fmt(c.followers)} seguidores</span>
                    <span><DollarSign size={10} className="inline" /> {fmtCurrency(c.projected_monthly_sales)}/mês</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
