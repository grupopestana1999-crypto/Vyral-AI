import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Eye, Heart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import type { ProductVideo, Product } from '../../types/database'

const EMPTY: Partial<ProductVideo> = {
  title: '',
  video_url: '',
  thumbnail_url: '',
  tiktok_video_url: '',
  creator_name: '',
  creator_avatar_url: '',
  views: 0,
  likes: 0,
  items_sold: 0,
  revenue: 0,
  product_id: '',
}

export function AdminViralVideos() {
  const [items, setItems] = useState<ProductVideo[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<ProductVideo> | null>(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: videos }, { data: prods }] = await Promise.all([
      supabase.from('product_videos').select('*, products(*)').order('views', { ascending: false }).limit(100),
      supabase.from('products').select('id,name').order('name'),
    ])
    setItems((videos as ProductVideo[]) ?? [])
    setProducts((prods as Product[]) ?? [])
    setLoading(false)
  }

  async function save() {
    if (!editing?.video_url || !editing?.title) { toast.error('Preencha título e URL do vídeo'); return }
    const payload = {
      title: editing.title,
      video_url: editing.video_url,
      thumbnail_url: editing.thumbnail_url ?? '',
      tiktok_video_url: editing.tiktok_video_url || null,
      creator_name: editing.creator_name ?? '',
      creator_avatar_url: editing.creator_avatar_url || null,
      views: Number(editing.views ?? 0),
      likes: Number(editing.likes ?? 0),
      items_sold: Number(editing.items_sold ?? 0),
      revenue: Number(editing.revenue ?? 0),
      product_id: editing.product_id || null,
    }
    if (isNew) {
      const { error } = await supabase.from('product_videos').insert(payload)
      if (error) { toast.error('Erro ao criar: ' + error.message); return }
      toast.success('Vídeo criado!')
    } else {
      const { error } = await supabase.from('product_videos').update(payload).eq('id', editing.id!)
      if (error) { toast.error('Erro ao atualizar: ' + error.message); return }
      toast.success('Vídeo atualizado!')
    }
    setEditing(null); setIsNew(false); load()
  }

  async function remove(id: string) {
    if (!confirm('Excluir vídeo?')) return
    const { error } = await supabase.from('product_videos').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir'); return }
    toast.success('Vídeo excluído'); load()
  }

  function fmtNum(n: number) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return String(n)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-white/50">{items.length} vídeos virais</p>
        <button
          onClick={() => { setEditing({ ...EMPTY }); setIsNew(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
        >
          <Plus size={14} /> Novo Vídeo
        </button>
      </div>

      {editing && (
        <div className="bg-surface-300 border border-primary-500/30 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">{isNew ? 'Novo Vídeo' : 'Editar Vídeo'}</h3>
            <button onClick={() => { setEditing(null); setIsNew(false) }} className="p-1 text-white/30 hover:text-white cursor-pointer"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={editing.title ?? ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Título"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 sm:col-span-2" />
            <input value={editing.video_url ?? ''} onChange={e => setEditing({ ...editing, video_url: e.target.value })} placeholder="URL do vídeo (.mp4)"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 sm:col-span-2" />
            <input value={editing.thumbnail_url ?? ''} onChange={e => setEditing({ ...editing, thumbnail_url: e.target.value })} placeholder="URL da thumbnail"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.tiktok_video_url ?? ''} onChange={e => setEditing({ ...editing, tiktok_video_url: e.target.value })} placeholder="URL TikTok (opcional)"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <select value={editing.product_id ?? ''} onChange={e => setEditing({ ...editing, product_id: e.target.value })}
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 sm:col-span-2">
              <option value="">— Sem produto vinculado —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={editing.creator_name ?? ''} onChange={e => setEditing({ ...editing, creator_name: e.target.value })} placeholder="Nome do criador"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.creator_avatar_url ?? ''} onChange={e => setEditing({ ...editing, creator_avatar_url: e.target.value })} placeholder="Avatar do criador"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Views</label>
              <input type="number" value={editing.views ?? 0} onChange={e => setEditing({ ...editing, views: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Likes</label>
              <input type="number" value={editing.likes ?? 0} onChange={e => setEditing({ ...editing, likes: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Vendidos</label>
              <input type="number" value={editing.items_sold ?? 0} onChange={e => setEditing({ ...editing, items_sold: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Revenue (R$)</label>
              <input type="number" step="0.01" value={editing.revenue ?? 0} onChange={e => setEditing({ ...editing, revenue: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
          </div>
          <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon text-surface-500 font-semibold text-sm hover:brightness-110 cursor-pointer">
            <Save size={14} /> Salvar
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum vídeo cadastrado</p>
      ) : (
        <div className="space-y-2">
          {items.map(v => (
            <div key={v.id} className="bg-surface-300 border border-white/5 rounded-xl p-4 flex items-center gap-4">
              <img src={v.thumbnail_url} alt="" className="w-14 h-20 rounded-lg object-cover flex-shrink-0 bg-surface-400" onError={e => (e.currentTarget.style.display = 'none')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate mb-1">{v.title}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40">
                  <span className="flex items-center gap-1"><Eye size={10} /> {fmtNum(v.views)}</span>
                  <span className="flex items-center gap-1"><Heart size={10} /> {fmtNum(v.likes)}</span>
                  <span>{v.creator_name}</span>
                  {v.items_sold > 0 && <span>{v.items_sold} vendidos</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(v); setIsNew(false) }} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-primary-400 cursor-pointer"><Edit2 size={14} /></button>
                <button onClick={() => remove(v.id)} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-red-400 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
