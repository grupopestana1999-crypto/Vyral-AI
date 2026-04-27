import { useState } from 'react'
import { Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import { TOOL_CREDITS, TOOL_LABELS } from '../../types/credits'
import { toast } from 'sonner'

export function AdminBoosters() {
  const [disabled, setDisabled] = useState<Set<string>>(new Set())

  function toggle(toolId: string) {
    setDisabled(prev => {
      const next = new Set(prev)
      if (next.has(toolId)) {
        next.delete(toolId)
        toast.success(`${TOOL_LABELS[toolId]} ativado`)
      } else {
        next.add(toolId)
        toast.success(`${TOOL_LABELS[toolId]} desativado`)
      }
      return next
    })
  }

  const tools = Object.entries(TOOL_CREDITS)

  return (
    <div className="space-y-2">
      {tools.map(([id, credits]) => {
        const isDisabled = disabled.has(id)
        const label = TOOL_LABELS[id] ?? id
        return (
          <div key={id} className="flex items-center justify-between bg-surface-300 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Zap size={16} className={isDisabled ? 'text-white/20' : 'text-primary-400'} />
              <div>
                <p className={`text-sm font-medium ${isDisabled ? 'text-white/30 line-through' : 'text-white'}`}>{label}</p>
                <p className="text-[10px] text-white/30">{credits === 0 ? 'FREE (10 lifetime)' : `${credits} créditos`}</p>
              </div>
            </div>
            <button onClick={() => toggle(id)} className="cursor-pointer">
              {isDisabled
                ? <ToggleLeft size={28} className="text-white/20" />
                : <ToggleRight size={28} className="text-green-400" />
              }
            </button>
          </div>
        )
      })}
    </div>
  )
}
