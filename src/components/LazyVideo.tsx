import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Play, Volume2 } from 'lucide-react'

interface LazyVideoProps {
  src: string
  className?: string
  poster?: string
  fallbackIcon?: ReactNode
  fallbackImage?: string
  /** Quando true: click no vídeo desmuta + mostra controls nativos. Ideal pra feed de vídeos virais. */
  interactive?: boolean
}

export function LazyVideo({ src, className = '', poster, fallbackIcon, fallbackImage, interactive = false }: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState(false)
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) el.play().catch(() => {})
        // Se foi ativado (com som), pause quando sair de viewport pra evitar áudio sumindo
        else el.pause()
      }),
      { threshold: 0.1 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Se a URL aponta pra imagem estática (PNG/JPG/etc), renderiza como <img> direto
  // ao invés de tentar como vídeo (que daria onError + fallback gradient feio)
  const isImage = !!src && /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(src)
  if (isImage && !err) {
    return <img src={src} className={`${className} object-cover`} alt="" loading="lazy" onError={() => setErr(true)} />
  }

  if (err || !src) {
    if (fallbackImage) {
      return <img src={fallbackImage} className={className} alt="" />
    }
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-primary-900/40 to-accent-900/40 ${className}`}>
        {fallbackIcon ?? <Play size={28} className="text-white/30" />}
      </div>
    )
  }

  function handleClick() {
    if (!interactive) return
    const el = ref.current
    if (!el) return
    if (!activated) {
      el.muted = false
      el.controls = true
      el.currentTime = 0
      el.play().catch(() => {})
      setActivated(true)
    }
  }

  return (
    <div className={`relative ${className}`} onClick={interactive ? handleClick : undefined} style={interactive ? { cursor: 'pointer' } : undefined}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        muted={!activated}
        loop
        playsInline
        preload="none"
        onError={() => setErr(true)}
      />
      {interactive && !activated && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary-600/80 transition-all">
            <Volume2 size={20} className="text-white" />
          </div>
        </div>
      )}
    </div>
  )
}
