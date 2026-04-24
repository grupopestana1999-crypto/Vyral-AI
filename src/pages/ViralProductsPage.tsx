import { useState, useEffect } from 'react'
import { ShoppingBag, TrendingUp, DollarSign, Flame, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Product } from '../types/database'

const CATEGORIES = ['Todos', 'Beleza', 'Calçados', 'Roupas', 'Perfumes', 'Equipamentos', 'Copos', 'Colares', 'Livros', 'Malas', 'Cama/Mesa']

function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtCurrency(n: number) { return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

export function ViralProductsPage() {
  const [category, setCategory] = useState('Todos')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase.from('products').select('*').eq('is_active', true).order('heat_score', { ascending: false })
      if (category !== 'Todos') q = q.eq('category', category)
      const { data } = await q
      setProducts(data ?? [])
      setLoading(false)
    }
    load()
  }, [category])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <ShoppingBag size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Produtos Virais</h1>
          <p className="text-sm text-white/50">Mineração de produtos virais do TikTok Shop</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              category === c ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface-300 rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Package size={48} className="text-white/20 mb-3" />
          <p className="text-white/40">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all group">
              <div className="relative h-40 bg-surface-400">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-white/10" /></div>
                )}
                <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  p.heat_score >= 80 ? 'bg-red-500/20 text-red-400' : p.heat_score >= 50 ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  <Flame size={10} /> {p.heat_score.toFixed(0)}
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-white line-clamp-2 leading-tight">{p.name}</p>
                <p className="text-xs text-primary-400">R$ {fmt(p.price_min)} - R$ {fmt(p.price_max)}</p>
                <div className="flex items-center justify-between text-[11px] text-white/40 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1"><DollarSign size={10} /> {fmtCurrency(p.revenue)}</span>
                  <span className="flex items-center gap-1"><TrendingUp size={10} /> {fmt(p.items_sold)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
