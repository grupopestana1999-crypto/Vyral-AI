import { useState } from 'react'
import { Video, Film, Eye, Heart, FileText, Copy, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LazyVideo } from '../components/LazyVideo'
import { useFetchList } from '../lib/useFetchList'
import { ErrorState } from '../components/ErrorState'
import { SystemOnlineBanner } from '../components/SystemOnlineBanner'
import { toast } from 'sonner'
import type { ProductVideo } from '../types/database'

const PERIODS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: 'Todos', value: 0 },
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

function ScriptModal({ video, onClose }: { video: ProductVideo; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const sections: { label: string; value: string | null | undefined }[] = [
    { label: 'Hook', value: video.insight_hook },
    { label: 'Dor', value: video.insight_pain },
    { label: 'Solução', value: video.insight_solution },
    { label: 'CTA', value: video.insight_cta },
    { label: 'Transcrição', value: video.transcription },
  ]

  const fullScript = sections.filter(s => s.value).map(s => `${s.label}:\n${s.value}`).join('\n\n')

  function copyAll() {
    if (!fullScript) return
    navigator.clipboard.writeText(fullScript)
    setCopied(true)
    toast.success('Script copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-300 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-surface-300 border-b border-white/10 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">Script do vídeo viral</p>
            <h3 className="text-sm font-semibold text-white line-clamp-2">{video.title ?? 'Sem título'}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white cursor-pointer flex-shrink-0"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {sections.every(s => !s.value) ? (
            <p className="text-sm text-white/40 text-center py-8">Esse vídeo ainda não tem script catalogado.</p>
          ) : sections.filter(s => s.value).map(s => (
            <div key={s.label}>
              <p className="text-[10px] text-primary-400 uppercase tracking-wide font-bold mb-1">{s.label}</p>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{s.value}</p>
            </div>
          ))}
        </div>
        {fullScript && (
          <div className="sticky bottom-0 bg-surface-300 border-t border-white/10 px-5 py-3">
            <button
              onClick={copyAll}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-bold hover:brightness-110 transition-all cursor-pointer"
            >
              {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar script completo</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ViralVideosPage() {
  const [period, setPeriod] = useState<number>(0)
  const [scriptVideo, setScriptVideo] = useState<ProductVideo | null>(null)

  const { data: videos, loading, error, retry } = useFetchList<ProductVideo>(
    async () => {
      let q = supabase.from('product_videos')
        .select('*, products(id, name, image_url, category)')
        .order('revenue', { ascending: false })
        .limit(150)
      if (period > 0) {
        const since = new Date()
        since.setDate(since.getDate() - period)
        q = q.gte('published_at', since.toISOString())
      }
      const res = await q
      return { data: res.data as ProductVideo[] | null, error: res.error }
    },
    [period]
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Video size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Vídeos Virais</h1>
          <p className="text-sm text-white/50">Os vídeos que mais faturam no TikTok Shop</p>
        </div>
      </div>

      <SystemOnlineBanner
        totalCount={videos.length}
        totalRevenue={videos.reduce((sum, v) => sum + (Number(v.revenue) || 0), 0)}
        countLabel="vídeos"
      />

      <div className="flex gap-2 justify-end">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              period === p.value ? 'bg-accent-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[9/16] bg-surface-300 rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Film size={48} className="text-white/20 mb-3" />
          <p className="text-white/40">Nenhum vídeo encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {videos.map((v, i) => {
            const hasScript = !!(v.insight_hook || v.transcription || v.insight_pain || v.insight_solution || v.insight_cta)
            return (
              <div key={v.id} className="group relative bg-surface-300 border border-white/5 rounded-xl overflow-hidden aspect-[9/16] hover:border-primary-500/40 transition-all">
                <div className="absolute inset-0">
                  {v.video_url ? (
                    <LazyVideo src={v.video_url} poster={v.thumbnail_url ?? undefined} className="w-full h-full" fallbackImage={v.thumbnail_url ?? undefined} interactive />
                  ) : v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900/40 to-accent-900/40"><Film size={32} className="text-white/30" /></div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />

                <div className="absolute top-2 left-2 z-10">
                  <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[10px] font-bold text-white">#{i + 1}</span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 z-10 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-white/70">
                    <span className="flex items-center gap-0.5"><Eye size={10} /> {fmtCount(v.views)}</span>
                    <span className="flex items-center gap-0.5"><Heart size={10} /> {fmtCount(v.likes)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-black/60 backdrop-blur rounded-md px-2 py-1">
                      <p className="text-[8px] text-white/50 uppercase">Vendidos</p>
                      <p className="text-xs font-bold text-white leading-tight">{fmtCount(v.items_sold)}</p>
                    </div>
                    <div className="bg-emerald-500/30 backdrop-blur rounded-md px-2 py-1 border border-emerald-500/30">
                      <p className="text-[8px] text-emerald-200 uppercase">Receita</p>
                      <p className="text-xs font-bold text-emerald-300 leading-tight">{fmtCurrency(v.revenue)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setScriptVideo(v)}
                    disabled={!hasScript}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-primary-600 text-white text-[11px] font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileText size={11} /> {hasScript ? 'Ver script' : 'Sem script'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {scriptVideo && <ScriptModal video={scriptVideo} onClose={() => setScriptVideo(null)} />}
    </div>
  )
}
