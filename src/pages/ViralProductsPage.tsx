import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Flame, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useFetchList } from '../lib/useFetchList'
import { ErrorState } from '../components/ErrorState'
import { SystemOnlineBanner } from '../components/SystemOnlineBanner'
import type { Product } from '../types/database'

// Filtros baseados em PREFIXO da categoria — bate com nomes longos do banco.
// Ex: filtro "Beleza" pega "Beleza e Cuidados Pessoais".
const FILTERS = [
  { label: 'Todos', match: null },
  { label: 'Beleza', match: 'beleza' },
  { label: 'Roupas', match: 'roupas' },
  { label: 'Calçados', match: 'calçados' },
  { label: 'Perfumes', match: 'perfume' },
  { label: 'Cama/Banho', match: 'cama' },
  { label: 'Cozinha', match: 'cozinha' },
  { label: 'Copos', match: 'copos' },
  { label: 'Colares', match: 'colares' },
  { label: 'Malas', match: 'malas' },
  { label: 'Equipamentos', match: 'equipamentos' },
  { label: 'Livros', match: 'livros' },
  { label: 'Saúde', match: 'saúde' },
] as const

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

export function ViralProductsPage() {
  const navigate = useNavigate()
  const [filterIdx, setFilterIdx] = useState(0)

  const { data: allProducts, loading, error, retry } = useFetchList<Product>(
    async () => {
      const res = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('revenue', { ascending: false })
      return { data: res.data as Product[] | null, error: res.error }
    }
  )

  const filter = FILTERS[filterIdx]
  const products = useMemo(() => {
    if (!filter.match) return allProducts
    return allProducts.filter(p => (p.category || '').toLowerCase().startsWith(filter.match))
  }, [allProducts, filter.match])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <ShoppingBag size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Produtos Virais</h1>
          <p className="text-sm text-white/50">Os mais vendidos do TikTok Shop</p>
        </div>
      </div>

      <SystemOnlineBanner
        totalCount={allProducts.length}
        totalRevenue={allProducts.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0)}
        countLabel="produtos"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setFilterIdx(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              filterIdx === i ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface-300 rounded-xl h-72 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Package size={48} className="text-white/20 mb-3" />
          <p className="text-white/40">Nenhum produto encontrado nesta categoria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p, i) => (
            <button
              key={p.id}
              onClick={() => navigate(`/viral-products/${p.id}`)}
              className="text-left bg-surface-300 border border-white/5 rounded-xl overflow-hidden hover:border-primary-500/40 transition-all group cursor-pointer flex flex-col"
            >
              <div className="relative h-44 bg-surface-400">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-white/10" /></div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[10px] font-bold text-white">
                  #{i + 1}
                </div>
                <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  p.heat_score >= 80 ? 'bg-red-500/30 text-red-300' : p.heat_score >= 50 ? 'bg-orange-500/30 text-orange-300' : 'bg-yellow-500/30 text-yellow-300'
                }`}>
                  <Flame size={10} /> {p.heat_score.toFixed(0)}
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wide shadow-lg">
                    R$ {p.price_min.toLocaleString('pt-BR')}-R$ {p.price_max.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <p className="text-sm font-semibold text-white line-clamp-2 leading-tight min-h-[2.5em]">{p.name}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide">{p.category}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 mt-auto">
                  <div>
                    <p className="text-[9px] text-white/40 uppercase">Receita</p>
                    <p className="text-sm font-bold text-emerald-400">{fmtCurrency(p.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40 uppercase">Vendidos</p>
                    <p className="text-sm font-bold text-white">{fmtCount(p.sales || p.items_sold)}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
