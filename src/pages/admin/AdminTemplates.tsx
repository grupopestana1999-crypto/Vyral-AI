import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import type { PromptTemplate } from '../../types/database'

const EMPTY: Partial<PromptTemplate> = { title: '', category: 'geral', type: 'image', prompt: '', description: '', tags: [] }

export function AdminTemplates() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<PromptTemplate> | null>(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('prompt_templates').select('*').order('created_at', { ascending: false })
    setTemplates(data ?? [])
    setLoading(false)
  }

  async function save() {
    if (!editing?.title || !editing?.prompt) { toast.error('Preencha título e prompt'); return }

    if (isNew) {
      const { error } = await supabase.from('prompt_templates').insert({
        title: editing.title, category: editing.category ?? 'geral', type: editing.type ?? 'image',
        prompt: editing.prompt, description: editing.description ?? '', tags: editing.tags ?? [],
      })
      if (error) { toast.error('Erro ao criar'); return }
      toast.success('Template criado!')
    } else {
      const { error } = await supabase.from('prompt_templates').update({
        title: editing.title, category: editing.category, type: editing.type,
        prompt: editing.prompt, description: editing.description, tags: editing.tags,
      }).eq('id', editing.id!)
      if (error) { toast.error('Erro ao atualizar'); return }
      toast.success('Template atualizado!')
    }
    setEditing(null)
    setIsNew(false)
    load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from('prompt_templates').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir'); return }
    toast.success('Template excluído')
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-white/50">{templates.length} templates</p>
        <button
          onClick={() => { setEditing({ ...EMPTY }); setIsNew(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
        >
          <Plus size={14} /> Novo Template
        </button>
      </div>

      {editing && (
        <div className="bg-surface-300 border border-primary-500/30 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">{isNew ? 'Novo Template' : 'Editar Template'}</h3>
            <button onClick={() => { setEditing(null); setIsNew(false) }} className="p-1 text-white/30 hover:text-white cursor-pointer"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={editing.title ?? ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Título"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <input value={editing.category ?? ''} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="Categoria"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            <select value={editing.type ?? 'image'} onChange={e => setEditing({ ...editing, type: e.target.value as 'image' | 'video' })}
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500">
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
            </select>
            <input value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Descrição"
              className="px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
          </div>
          <textarea value={editing.prompt ?? ''} onChange={e => setEditing({ ...editing, prompt: e.target.value })} placeholder="Prompt..."
            className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 resize-none h-24" />
          <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon text-surface-500 font-semibold text-sm hover:brightness-110 cursor-pointer">
            <Save size={14} /> Salvar
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : templates.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum template cadastrado</p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-surface-300 border border-white/5 rounded-xl p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white">{t.title}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    t.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>{t.type}</span>
                  <span className="text-[10px] text-white/30">{t.category}</span>
                </div>
                <p className="text-xs text-white/40 line-clamp-2 font-mono">{t.prompt}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(t); setIsNew(false) }} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-primary-400 cursor-pointer"><Edit2 size={14} /></button>
                <button onClick={() => remove(t.id)} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-red-400 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
