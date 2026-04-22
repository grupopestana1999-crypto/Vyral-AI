import { useState, useEffect } from 'react'
import { FileText, Copy, Heart, Image, Video, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'
import { toast } from 'sonner'
import type { PromptTemplate } from '../types/database'

type Filter = 'all' | 'video' | 'image' | 'favorites'

export function TemplatesPage() {
  const { user } = useAuthStore()
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [tmplRes, favRes] = await Promise.all([
      supabase.from('prompt_templates').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      user ? supabase.from('template_favorites').select('template_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ])
    setTemplates(tmplRes.data ?? [])
    setFavorites(new Set((favRes.data ?? []).map((f: { template_id: string }) => f.template_id)))
    setLoading(false)
  }

  async function toggleFavorite(id: string) {
    if (!user) return
    if (favorites.has(id)) {
      await supabase.from('template_favorites').delete().eq('user_id', user.id).eq('template_id', id)
      setFavorites(prev => { const s = new Set(prev); s.delete(id); return s })
    } else {
      await supabase.from('template_favorites').insert({ user_id: user.id, template_id: id })
      setFavorites(prev => new Set(prev).add(id))
    }
  }

  function copyPrompt(id: string, prompt: string) {
    navigator.clipboard.writeText(prompt)
    setCopied(id)
    toast.success('Prompt copiado!')
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = templates.filter(t => {
    if (filter === 'video') return t.type === 'video'
    if (filter === 'image') return t.type === 'image'
    if (filter === 'favorites') return favorites.has(t.id)
    return true
  })

  const FILTERS: { key: Filter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Todos', icon: <FileText size={14} /> },
    { key: 'video', label: 'Vídeos', icon: <Video size={14} /> },
    { key: 'image', label: 'Imagens', icon: <Image size={14} /> },
    { key: 'favorites', label: 'Favoritos', icon: <Heart size={14} /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Templates</h1>
          <p className="text-sm text-white/50">Biblioteca de prompts prontos</p>
        </div>
      </div>

      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
            }`}>{f.icon} {f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 bg-surface-300 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FileText size={48} className="text-white/20 mb-3" />
          <p className="text-white/40">Nenhum template encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden flex flex-col">
              {(t.thumbnail_url || t.media_url) && (
                <div className="relative h-40 bg-surface-400 overflow-hidden">
                  {t.type === 'video' && t.media_url ? (
                    <video src={t.media_url} poster={t.thumbnail_url ?? undefined} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={e => (e.target as HTMLVideoElement).play()} onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0 }} />
                  ) : t.thumbnail_url ? (
                    <img src={t.thumbnail_url} alt={t.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
              )}
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{t.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        t.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>{t.type === 'video' ? 'Vídeo' : 'Imagem'}</span>
                      <span className="text-[10px] text-white/30">{t.category}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleFavorite(t.id)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <Heart size={16} className={favorites.has(t.id) ? 'fill-red-400 text-red-400' : 'text-white/30'} />
                  </button>
                </div>
                {t.description && <p className="text-xs text-white/40">{t.description}</p>}
                <div className="bg-surface-400 rounded-lg p-3 max-h-20 overflow-y-auto">
                  <p className="text-xs text-white/60 font-mono">{t.prompt}</p>
                </div>
                <button onClick={() => copyPrompt(t.id, t.prompt)}
                  className="mt-auto w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary-600/20 text-primary-400 text-sm font-medium hover:bg-primary-600/30 transition-colors cursor-pointer">
                  {copied === t.id ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar Prompt</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
