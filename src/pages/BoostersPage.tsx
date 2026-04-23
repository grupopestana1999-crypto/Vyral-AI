import { useNavigate } from 'react-router-dom'
import { Zap, Coins, ArrowRight, Play } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { BOOSTERS } from '../types/boosters'
import { useRef, useEffect, useState } from 'react'

function BoosterVideo({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => (e.isIntersecting ? el.play().catch(() => {}) : el.pause())),
      { threshold: 0.1 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  if (err) return <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900/40 to-accent-900/40"><Play size={28} className="text-white/30" /></div>
  return <video ref={ref} src={url} className="w-full h-full object-cover" muted loop autoPlay playsInline preload="metadata" onError={() => setErr(true)} />
}

export function BoostersPage() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Boosters</h1>
            <p className="text-sm text-white/50">Ferramentas premium de IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-600/20 border border-primary-500/30">
          <Coins size={16} className="text-neon" />
          <span className="text-sm font-semibold text-neon">{credits}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {BOOSTERS.map(b => (
          <button
            key={b.id}
            onClick={() => navigate(b.tool === 'studio_redirect' ? '/influencer' : `/booster/${b.slug}`)}
            className="group relative aspect-[4/5] bg-surface-300 border border-white/5 rounded-xl overflow-hidden text-left hover:border-primary-500/40 transition-all cursor-pointer"
          >
            {/* Vídeo preview em loop ocupando todo o card */}
            <div className="absolute inset-0">
              <BoosterVideo url={b.videoUrl} />
            </div>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

            {/* Badge custo canto superior direito */}
            <div className="absolute top-2 right-2 z-10">
              {b.isFree || b.credits === 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-green-500/90 text-white text-[10px] font-bold">FREE</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-primary-600/90 text-white text-[10px] font-bold backdrop-blur">{b.credits} cr</span>
              )}
            </div>

            {/* Info no bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
              <h3 className="text-sm font-bold text-white mb-0.5 truncate">{b.title}</h3>
              <p className="text-[11px] text-white/70 line-clamp-2 mb-2">{b.description}</p>
              <div className="flex items-center gap-1 text-[11px] text-primary-300 font-semibold">
                Usar <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
