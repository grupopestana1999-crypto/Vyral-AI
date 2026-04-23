import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import type { Creator } from '../../types/database'

const EMPTY: Partial<Creator> = {
  name: '',
  display_name: '',
  username: '',
  avatar_url: '',
  profile_url: '',
  followers: 0,
  following: 0,
  total_likes: 0,
  total_videos: 0,
  niche: '',
  projected_monthly_sales: 0,
  is_active: true,
}

export function AdminViralCreators() {
  const [items, setItems] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Creator> | null>(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('creators').select('*').order('followers', { ascending: false })
    setItems((data as Creator[]) ?? [])
    setLoading(false)
  }

  async function save() {
    if (!editing?.name || !editing?.username) { toast.error('Preencha nome e username'); return }
    const payload = {
      name: editing.name,
      display_name: editing.display_name || editing.name,
      username: editing.username,
      avatar_url: editing.avatar_url ?? '',
      profile_url: editing.profile_url ?? '',
      followers: Number(editing.followers ?? 0),
      following: Number(editing.following ?? 0),
      total_likes: Number(editing.total_likes ?? 0),
      total_videos: Number(editing.total_videos ?? 0),
      niche: editing.niche || null,
      projected_monthly_sales: Number(editing.projected_monthly_sales ?? 0),
      is_active: editing.is_active ?? true,
    }
    if (isNew) {
      const { error } = await supabase.from('creators').insert(payload)
      if (error) { toast.error('Erro ao criar: ' + error.message); return }
      toast.success('Criador criado!')
    } else {
      const { error } = await supabase.from('creators').update(payload).eq('id', editing.id!)
      if (error) { toast.error('Erro ao atualizar: ' + error.message); return }
      toast.success('Criador atualizado!')
    }
    setEditing(null); setIsNew(false); load()
  }

  async function remove(id: string) {
    if (!confirm('Excluir criador?')) return
    const { error } = await supabase.from('creators').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir'); return }
    toast.success('Criador excluído'); load()
  }

  function fmtNum(n: number) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return String(n)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-white/50">{items.length} criadores virais</p>
        <button
          onClick={() => { setEditing({ ...EMPTY }); setIsNew(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
        >
          <Plus size={14} /> Novo Criador
        </button>
      </div>

      {editing && (
        <div className="bg-surface-300 border border-primary-500/30 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">{isNew ? 'Novo Criador' : 'Editar Criador'}</h3>
            <button onClick={() => { setEditing(null); setIsNew(false) }} className="p-1 text-white/30 hover:text-white cursor-pointer"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Nome completo"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.display_name ?? ''} onChange={e => setEditing({ ...editing, display_name: e.target.value })} placeholder="Display name (opcional)"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.username ?? ''} onChange={e => setEditing({ ...editing, username: e.target.value })} placeholder="@username"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.niche ?? ''} onChange={e => setEditing({ ...editing, niche: e.target.value })} placeholder="Nicho (ex: beleza, fitness)"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.avatar_url ?? ''} onChange={e => setEditing({ ...editing, avatar_url: e.target.value })} placeholder="URL do avatar"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.profile_url ?? ''} onChange={e => setEditing({ ...editing, profile_url: e.target.value })} placeholder="URL do perfil TikTok"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Seguidores</label>
              <input type="number" value={editing.followers ?? 0} onChange={e => setEditing({ ...editing, followers: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Seguindo</label>
              <input type="number" value={editing.following ?? 0} onChange={e => setEditing({ ...editing, following: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Total de likes</label>
              <input type="number" value={editing.total_likes ?? 0} onChange={e => setEditing({ ...editing, total_likes: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Total de vídeos</label>
              <input type="number" value={editing.total_videos ?? 0} onChange={e => setEditing({ ...editing, total_videos: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] text-white/40 block mb-1">Vendas mensais projetadas (R$)</label>
              <input type="number" step="0.01" value={editing.projected_monthly_sales ?? 0} onChange={e => setEditing({ ...editing, projected_monthly_sales: Number(e.target.value) })}
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
        <p className="text-center text-white/30 py-8">Nenhum criador cadastrado</p>
      ) : (
        <div className="space-y-2">
          {items.map(c => (
            <div key={c.id} className="bg-surface-300 border border-white/5 rounded-xl p-4 flex items-center gap-4">
              <img src={c.avatar_url} alt={c.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-surface-400" onError={e => (e.currentTarget.style.display = 'none')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-white truncate">{c.display_name || c.name}</p>
                  <span className="text-[11px] text-white/40">@{c.username}</span>
                  {!c.is_active && <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/50">inativo</span>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40">
                  <span className="flex items-center gap-1"><Users size={10} /> {fmtNum(c.followers)}</span>
                  <span>{fmtNum(c.total_likes)} likes</span>
                  <span>{c.total_videos} vídeos</span>
                  {c.niche && <span>{c.niche}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(c); setIsNew(false) }} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-primary-400 cursor-pointer"><Edit2 size={14} /></button>
                <button onClick={() => remove(c.id)} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-red-400 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
