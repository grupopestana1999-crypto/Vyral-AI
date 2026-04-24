import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Play } from 'lucide-react'

interface LazyVideoProps {
  src: string
  className?: string
  poster?: string
  fallbackIcon?: ReactNode
  fallbackImage?: string
}

export function LazyVideo({ src, className = '', poster, fallbackIcon, fallbackImage }: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) el.play().catch(() => {})
        else el.pause()
      }),
      { threshold: 0.1 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (err) {
    if (fallbackImage) {
      return <img src={fallbackImage} className={className} alt="" />
    }
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-primary-900/40 to-accent-900/40 ${className}`}>
        {fallbackIcon ?? <Play size={28} className="text-white/30" />}
      </div>
    )
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      onError={() => setErr(true)}
    />
  )
}
