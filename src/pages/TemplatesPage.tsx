import { useState, useEffect } from 'react'
import { FileText, Copy, Heart, Image as ImageIcon, Video, Check, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'
import { LazyVideo } from '../components/LazyVideo'
import { useFetchList } from '../lib/useFetchList'
import { ErrorState } from '../components/ErrorState'
import { toast } from 'sonner'
import type { PromptTemplate } from '../types/database'

type Filter = 'all' | 'video' | 'image' | 'favorites'

function TemplateMedia({ template }: { template: PromptTemplate }) {
  if (template.type === 'video' && template.media_url) {
    return (
      <LazyVideo
        src={template.media_url}
        poster={template.thumbnail_url ?? undefined}
        className="w-full h-full object-cover"
        fallbackImage={template.thumbnail_url ?? undefined}
        fallbackIcon={<Play size={32} className="text-white/30" />}
      />
    )
  }
  if (template.thumbnail_url) {
    return <img src={template.thumbnail_url} alt={template.title} className="w-full h-full object-cover" loading="lazy" />
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900/40 to-accent-900/40">
      {template.type === 'video' ? <Play size={32} className="text-white/30" /> : <ImageIcon size={32} className="text-white/30" />}
    </div>
  )
}

export function TemplatesPage() {
  const { user } = useAuthStore()
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')
  const [copied, setCopied] = useState<string | null>(null)

  const { data: templates, loading, error, retry } = useFetchList<PromptTemplate>(
    async () => {
      const res = await supabase.from('prompt_templates').select('*').eq('is_active', true).order('created_at', { ascending: false })
      return { data: res.data as PromptTemplate[] | null, error: res.error }
    }
  )

  useEffect(() => {
    if (!user) { setFavorites(new Set()); return }
    supabase.from('template_favorites').select('template_id').eq('user_id', user.id)
      .then(res => setFavorites(new Set((res.data ?? []).map((f: { template_id: string }) => f.template_id))))
  }, [user])

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
    { key: 'image', label: 'Imagens', icon: <ImageIcon size={14} /> },
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
          <p className="text-sm text-white/50">Biblioteca de prompts prontos — clique pra copiar</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
            }`}>{f.icon} {f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[9/16] bg-surface-300 rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FileText size={48} className="text-white/20 mb-3" />
          <p className="text-white/40">Nenhum template encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(t => (
            <div key={t.id} className="group relative bg-surface-300 border border-white/5 rounded-xl overflow-hidden aspect-[9/16] hover:border-primary-500/40 transition-all">
              {/* Mídia ocupa o card inteiro */}
              <div className="absolute inset-0">
                <TemplateMedia template={t} />
              </div>

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

              {/* Badge favorito no canto superior direito */}
              <button
                onClick={() => toggleFavorite(t.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 transition-colors cursor-pointer z-10"
              >
                <Heart size={14} className={favorites.has(t.id) ? 'fill-red-400 text-red-400' : 'text-white/80'} />
              </button>

              {/* Badge tipo canto superior esquerdo */}
              <div className="absolute top-2 left-2 z-10">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur ${
                  t.type === 'video' ? 'bg-blue-500/80 text-white' : 'bg-green-500/80 text-white'
                }`}>{t.type === 'video' ? 'Vídeo' : 'Imagem'}</span>
              </div>

              {/* Info no bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2 z-10">
                <div>
                  <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                  <p className="text-[10px] text-white/60 truncate">{t.category}</p>
                </div>
                <button
                  onClick={() => copyPrompt(t.id, t.prompt)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
                >
                  {copied === t.id ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar Prompt</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
