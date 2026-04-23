import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Flame } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import type { Product } from '../../types/database'

const EMPTY: Partial<Product> = {
  name: '',
  image_url: '',
  price_min: 0,
  price_max: 0,
  category: '',
  heat_score: 50,
  revenue: 0,
  items_sold: 0,
  sales: 0,
  commission_rate: 10,
  tiktok_url: '',
  is_active: true,
}

export function AdminViralProducts() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Product> | null>(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('heat_score', { ascending: false })
    setItems((data as Product[]) ?? [])
    setLoading(false)
  }

  async function save() {
    if (!editing?.name || !editing?.image_url) { toast.error('Preencha nome e imagem'); return }
    const payload = {
      name: editing.name,
      image_url: editing.image_url,
      price_min: Number(editing.price_min ?? 0),
      price_max: Number(editing.price_max ?? 0),
      category: editing.category ?? 'geral',
      heat_score: Number(editing.heat_score ?? 50),
      revenue: Number(editing.revenue ?? 0),
      items_sold: Number(editing.items_sold ?? 0),
      sales: Number(editing.sales ?? 0),
      commission_rate: Number(editing.commission_rate ?? 10),
      tiktok_url: editing.tiktok_url || null,
      is_active: editing.is_active ?? true,
    }
    if (isNew) {
      const { error } = await supabase.from('products').insert(payload)
      if (error) { toast.error('Erro ao criar: ' + error.message); return }
      toast.success('Produto criado!')
    } else {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id!)
      if (error) { toast.error('Erro ao atualizar: ' + error.message); return }
      toast.success('Produto atualizado!')
    }
    setEditing(null); setIsNew(false); load()
  }

  async function remove(id: string) {
    if (!confirm('Excluir produto?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir'); return }
    toast.success('Produto excluído'); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-white/50">{items.length} produtos virais</p>
        <button
          onClick={() => { setEditing({ ...EMPTY }); setIsNew(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
        >
          <Plus size={14} /> Novo Produto
        </button>
      </div>

      {editing && (
        <div className="bg-surface-300 border border-primary-500/30 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">{isNew ? 'Novo Produto' : 'Editar Produto'}</h3>
            <button onClick={() => { setEditing(null); setIsNew(false) }} className="p-1 text-white/30 hover:text-white cursor-pointer"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Nome"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.category ?? ''} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="Categoria"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.image_url ?? ''} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="URL da imagem"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 sm:col-span-2" />
            <input value={editing.tiktok_url ?? ''} onChange={e => setEditing({ ...editing, tiktok_url: e.target.value })} placeholder="Link TikTok Shop (opcional)"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 sm:col-span-2" />
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Preço mín (R$)</label>
              <input type="number" step="0.01" value={editing.price_min ?? 0} onChange={e => setEditing({ ...editing, price_min: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Preço máx (R$)</label>
              <input type="number" step="0.01" value={editing.price_max ?? 0} onChange={e => setEditing({ ...editing, price_max: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Heat Score (0-100)</label>
              <input type="number" min={0} max={100} value={editing.heat_score ?? 50} onChange={e => setEditing({ ...editing, heat_score: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Comissão (%)</label>
              <input type="number" step="0.01" value={editing.commission_rate ?? 10} onChange={e => setEditing({ ...editing, commission_rate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Vendas (unidades)</label>
              <input type="number" value={editing.sales ?? 0} onChange={e => setEditing({ ...editing, sales: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Revenue total (R$)</label>
              <input type="number" step="0.01" value={editing.revenue ?? 0} onChange={e => setEditing({ ...editing, revenue: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70 sm:col-span-2">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
              Ativo (visível no feed)
            </label>
          </div>
          <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon text-surface-500 font-semibold text-sm hover:brightness-110 cursor-pointer">
            <Save size={14} /> Salvar
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum produto cadastrado</p>
      ) : (
        <div className="space-y-2">
          {items.map(p => (
            <div key={p.id} className="bg-surface-300 border border-white/5 rounded-xl p-4 flex items-center gap-4">
              <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  {!p.is_active && <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/50">inativo</span>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40">
                  <span className="flex items-center gap-1"><Flame size={10} className="text-orange-400" /> {p.heat_score}</span>
                  <span>{p.category}</span>
                  <span>R$ {Number(p.price_min).toFixed(2)} - R$ {Number(p.price_max).toFixed(2)}</span>
                  <span>{p.sales ?? 0} vendas</span>
                  <span>{Number(p.commission_rate ?? 0)}% comissão</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(p); setIsNew(false) }} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-primary-400 cursor-pointer"><Edit2 size={14} /></button>
                <button onClick={() => remove(p.id)} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-red-400 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
