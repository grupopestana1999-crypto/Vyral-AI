import { useState, useEffect } from 'react'
import { Video, Eye, Heart, DollarSign, Film } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LazyVideo } from '../components/LazyVideo'
import type { ProductVideo } from '../types/database'

const CATEGORIES = ['Todos', 'Beleza', 'Calçados', 'Roupas', 'Perfumes', 'Equipamentos', 'Copos', 'Colares']
const PERIODS = [{ label: '7 dias', value: 7 }, { label: '30 dias', value: 30 }, { label: 'Todos', value: 0 }]

function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtCurrency(n: number) { return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

export function ViralVideosPage() {
  const [category, setCategory] = useState('Todos')
  const [period, setPeriod] = useState(0)
  const [videos, setVideos] = useState<ProductVideo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase.from('product_videos')
        .select('*, products(id, name, image_url, category)')
        .order('revenue', { ascending: false })
        .limit(150)

      if (period > 0) {
        const since = new Date()
        since.setDate(since.getDate() - period)
        q = q.gte('published_at', since.toISOString())
      }

      const { data } = await q
      // Filtragem por categoria no cliente pra tolerar rows sem product_id linkado.
      const filtered = category === 'Todos'
        ? (data ?? [])
        : (data ?? []).filter(v => (v.products as { category?: string } | null)?.category === category)
      setVideos(filtered)
      setLoading(false)
    }
    load()
  }, [category, period])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Video size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Vídeos Virais</h1>
          <p className="text-sm text-white/50">Os vídeos que mais faturam no TikTok Shop</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                category === c ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
              }`}>{c}</button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                period === p.value ? 'bg-accent-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
              }`}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-surface-300 rounded-xl h-72 animate-pulse" />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Film size={48} className="text-white/20 mb-3" />
          <p className="text-white/40">Nenhum vídeo encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(v => (
            <div key={v.id} className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all">
              <div className="relative h-44 bg-surface-400">
                {v.video_url ? (
                  <LazyVideo src={v.video_url} poster={v.thumbnail_url ?? undefined} className="w-full h-full object-cover" fallbackImage={v.thumbnail_url ?? undefined} />
                ) : v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={v.title ?? ''} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Film size={32} className="text-white/10" /></div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-white line-clamp-2 leading-tight">{v.title ?? 'Sem título'}</p>
                <div className="flex items-center gap-2">
                  {v.creator_avatar_url && <img src={v.creator_avatar_url} alt="" className="w-5 h-5 rounded-full" loading="lazy" />}
                  <span className="text-xs text-white/40">{v.creator_name ?? (v.products as { name?: string } | null)?.name ?? 'Criador'}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-white/40 pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1"><Eye size={10} /> {fmt(v.views)}</span>
                  <span className="flex items-center gap-1"><Heart size={10} /> {fmt(v.likes)}</span>
                  <span className="flex items-center gap-1 ml-auto text-neon"><DollarSign size={10} /> {fmtCurrency(v.revenue)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
