import { useState } from 'react'

interface Props {
  before: string
  after: string
  alt: string
}

export function BeforeAfterSlider({ before, after, alt }: Props) {
  const [pos, setPos] = useState(50)

  return (
    <div className="relative w-full overflow-hidden rounded-lg select-none">
      <img src={after} alt={alt} className="w-full block" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={before} alt={alt + ' (antes)'} className="block h-full object-cover" style={{ width: `${100 * 100 / pos}%`, maxWidth: 'none' }} />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow">
          <span className="text-black text-[10px] font-bold">⇔</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={e => setPos(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        aria-label="Comparar antes e depois"
      />
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold">ANTES</div>
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold">DEPOIS</div>
    </div>
  )
}
