import { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Package, User, Image as ImageIcon, Sliders, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { POSES, STYLES, FORMATS, ENHANCEMENTS, SCENARIOS } from '../../types/studio'
import type { Product, Avatar } from '../../types/database'

interface LabNodeContext {
  onOpenEditor?: (nodeId: string) => void
}

const baseNodeClass = 'rounded-xl bg-surface-300 border border-white/10 shadow-lg min-w-[220px] max-w-[260px]'

export function ProductNode({ id, data, selected }: NodeProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [open, setOpen] = useState(false)
  const d = data as { productId?: string; productName?: string; imageUrl?: string }

  useEffect(() => {
    if (open && products.length === 0) {
      supabase.from('products').select('*').eq('is_active', true).order('heat_score', { ascending: false }).limit(30)
        .then(({ data }) => setProducts((data as Product[]) || []))
    }
  }, [open, products.length])

  function select(p: Product) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { productId: p.id, productName: p.name, imageUrl: p.image_url } } }))
    setOpen(false)
  }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <Package size={14} className="text-orange-400" />
        <span className="text-xs font-semibold text-white">Produto</span>
      </div>
      <div className="p-3">
        {d.productName ? (
          <button onClick={() => setOpen(true)} className="w-full flex gap-2 items-center text-left cursor-pointer">
            {d.imageUrl && <img src={d.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white truncate">{d.productName}</p>
              <p className="text-[9px] text-primary-400">Trocar</p>
            </div>
          </button>
        ) : (
          <button onClick={() => setOpen(true)} className="w-full text-xs text-white/60 py-3 rounded-lg border border-dashed border-white/20 hover:border-primary-500/50 cursor-pointer">
            Escolher produto
          </button>
        )}
      </div>
      {open && (
        <div className="nodrag absolute left-full top-0 ml-2 w-72 max-h-96 overflow-y-auto bg-surface-400 border border-white/10 rounded-xl shadow-2xl p-2 z-50">
          <p className="text-[10px] text-white/40 px-2 py-1">Produtos virais</p>
          {products.map(p => (
            <button key={p.id} onClick={() => select(p)} className="w-full flex gap-2 items-center p-2 rounded hover:bg-white/5 cursor-pointer text-left">
              <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
              <span className="text-[11px] text-white line-clamp-2">{p.name}</span>
            </button>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-orange-400 !w-2 !h-2" />
    </div>
  )
}

export function AvatarNode({ id, data, selected }: NodeProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [open, setOpen] = useState(false)
  const [gender, setGender] = useState<'female' | 'male'>('female')
  const d = data as { avatarId?: string; avatarName?: string; imageUrl?: string; gender?: 'female' | 'male' }

  useEffect(() => {
    if (open && avatars.length === 0) {
      supabase.from('avatars').select('*').eq('is_active', true)
        .then(({ data }) => setAvatars((data as Avatar[]) || []))
    }
  }, [open, avatars.length])

  function select(a: Avatar) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { avatarId: a.id, avatarName: a.name, imageUrl: a.image_url, gender: a.gender } } }))
    setOpen(false)
  }

  const filtered = avatars.filter(a => a.gender === gender)

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-pink-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <User size={14} className="text-pink-400" />
        <span className="text-xs font-semibold text-white">Influencer</span>
      </div>
      <div className="p-3">
        {d.avatarName ? (
          <button onClick={() => setOpen(true)} className="w-full flex gap-2 items-center text-left cursor-pointer">
            {d.imageUrl && <img src={d.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white truncate">{d.avatarName}</p>
              <p className="text-[9px] text-primary-400">Trocar</p>
            </div>
          </button>
        ) : (
          <button onClick={() => setOpen(true)} className="w-full text-xs text-white/60 py-3 rounded-lg border border-dashed border-white/20 hover:border-primary-500/50 cursor-pointer">
            Escolher avatar
          </button>
        )}
      </div>
      {open && (
        <div className="nodrag absolute left-full top-0 ml-2 w-72 max-h-96 overflow-y-auto bg-surface-400 border border-white/10 rounded-xl shadow-2xl p-2 z-50">
          <div className="flex gap-1 mb-2">
            <button onClick={() => setGender('female')} className={`flex-1 py-1 rounded text-[10px] ${gender === 'female' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Feminino</button>
            <button onClick={() => setGender('male')} className={`flex-1 py-1 rounded text-[10px] ${gender === 'male' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Masculino</button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {filtered.map(a => (
              <button key={a.id} onClick={() => select(a)} className="p-1 rounded hover:bg-white/5 cursor-pointer">
                <img src={a.image_url} alt="" className="w-full aspect-square rounded object-cover" />
                <p className="text-[9px] text-white/60 mt-0.5 truncate">{a.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-pink-400 !w-2 !h-2" />
    </div>
  )
}

export function SceneNode({ id, data, selected }: NodeProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'ready' | 'custom'>('ready')
  const d = data as { scenarioId?: string; scenarioName?: string; customPrompt?: string }

  function selectReady(s: { id: string; name: string }) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { scenarioId: s.id, scenarioName: s.name, customPrompt: undefined } } }))
    setOpen(false)
  }
  function saveCustom(prompt: string) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { scenarioId: undefined, scenarioName: 'Personalizada', customPrompt: prompt } } }))
  }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <ImageIcon size={14} className="text-emerald-400" />
        <span className="text-xs font-semibold text-white">Cena</span>
      </div>
      <div className="p-3">
        {d.scenarioName || d.customPrompt ? (
          <button onClick={() => setOpen(true)} className="w-full text-left cursor-pointer">
            <p className="text-[11px] text-white truncate">{d.scenarioName || 'Personalizada'}</p>
            {d.customPrompt && <p className="text-[9px] text-white/50 line-clamp-2">{d.customPrompt}</p>}
            <p className="text-[9px] text-primary-400 mt-0.5">Trocar</p>
          </button>
        ) : (
          <button onClick={() => setOpen(true)} className="w-full text-xs text-white/60 py-3 rounded-lg border border-dashed border-white/20 hover:border-primary-500/50 cursor-pointer">
            Escolher cena
          </button>
        )}
      </div>
      {open && (
        <div className="nodrag absolute left-full top-0 ml-2 w-72 max-h-96 overflow-y-auto bg-surface-400 border border-white/10 rounded-xl shadow-2xl p-2 z-50">
          <div className="flex gap-1 mb-2">
            <button onClick={() => setTab('ready')} className={`flex-1 py-1 rounded text-[10px] ${tab === 'ready' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Prontas</button>
            <button onClick={() => setTab('custom')} className={`flex-1 py-1 rounded text-[10px] ${tab === 'custom' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Personalizada</button>
          </div>
          {tab === 'ready' ? (
            <div className="grid grid-cols-2 gap-1">
              {SCENARIOS.map(s => (
                <button key={s.id} onClick={() => selectReady(s)} className="p-1 rounded hover:bg-white/5 cursor-pointer text-left">
                  <img src={s.thumbnail} alt="" className="w-full aspect-square rounded object-cover" />
                  <p className="text-[9px] text-white/80 mt-0.5 truncate">{s.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <textarea
                defaultValue={d.customPrompt || ''}
                onBlur={e => saveCustom(e.target.value)}
                placeholder="Descreva a cena que você quer..."
                rows={5}
                className="w-full p-2 bg-surface-300 border border-white/10 rounded text-xs text-white resize-none"
              />
              <p className="text-[9px] text-white/40 mt-1">Clica fora pra salvar</p>
            </div>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-emerald-400 !w-2 !h-2" />
    </div>
  )
}

export function SettingsNode({ id, data, selected }: NodeProps) {
  const [open, setOpen] = useState(false)
  const d = data as { pose: string; style: string; enhancements: string[]; format: string; additionalInfo?: string }

  function update(patch: Partial<typeof d>) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { ...d, ...patch } } }))
  }

  function toggleEnh(id: string) {
    const next = d.enhancements.includes(id) ? d.enhancements.filter(e => e !== id) : [...d.enhancements, id]
    update({ enhancements: next })
  }

  const poseName = POSES.find(p => p.id === d.pose)?.name || '—'
  const styleName = STYLES.find(s => s.id === d.style)?.name || '—'
  const formatName = FORMATS.find(f => f.id === d.format)?.name || '—'

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-sky-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <Sliders size={14} className="text-sky-400" />
        <span className="text-xs font-semibold text-white">Ajustes</span>
      </div>
      <button onClick={() => setOpen(o => !o)} className="w-full p-3 text-left cursor-pointer">
        <p className="text-[10px] text-white/60">{poseName} · {styleName} · {formatName}</p>
        <p className="text-[9px] text-white/40">{d.enhancements.length} melhoria(s) ativa(s)</p>
        <p className="text-[9px] text-primary-400 mt-0.5">{open ? 'Fechar' : 'Editar'}</p>
      </button>
      {open && (
        <div className="nodrag absolute left-full top-0 ml-2 w-80 max-h-[420px] overflow-y-auto bg-surface-400 border border-white/10 rounded-xl shadow-2xl p-3 z-50 space-y-3">
          <div>
            <p className="text-[10px] text-white/40 mb-1">Pose</p>
            <div className="grid grid-cols-3 gap-1">
              {POSES.map(p => (
                <button key={p.id} onClick={() => update({ pose: p.id })} className={`p-1 rounded text-[9px] ${d.pose === p.id ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/60 hover:text-white'}`}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-white/40 mb-1">Estilo</p>
            <div className="grid grid-cols-3 gap-1">
              {STYLES.map(s => (
                <button key={s.id} onClick={() => update({ style: s.id })} className={`p-1 rounded text-[9px] ${d.style === s.id ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/60 hover:text-white'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-white/40 mb-1">Melhorias</p>
            <div className="grid grid-cols-3 gap-1">
              {ENHANCEMENTS.map(e => (
                <button key={e.id} onClick={() => toggleEnh(e.id)} className={`p-1 rounded text-[9px] ${d.enhancements.includes(e.id) ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/60 hover:text-white'}`}>
                  {e.emoji} {e.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-white/40 mb-1">Formato</p>
            <div className="grid grid-cols-2 gap-1">
              {FORMATS.map(f => (
                <button key={f.id} onClick={() => update({ format: f.id })} className={`p-1 rounded text-[9px] ${d.format === f.id ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/60 hover:text-white'}`}>
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-white/40 mb-1">Informações adicionais</p>
            <textarea
              defaultValue={d.additionalInfo || ''}
              onBlur={e => update({ additionalInfo: e.target.value })}
              placeholder="Detalhes extras pra IA..."
              rows={2}
              className="w-full p-1.5 bg-surface-300 border border-white/10 rounded text-[10px] text-white resize-none"
            />
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-sky-400 !w-2 !h-2" />
    </div>
  )
}

export function GenerateNode({ data, selected }: NodeProps) {
  const d = data as { status: string; resultUrl?: string; onExecute?: () => void; ready?: boolean }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-violet-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <Sparkles size={14} className="text-violet-400" />
        <span className="text-xs font-semibold text-white">Executar</span>
      </div>
      <div className="p-3 space-y-2">
        <button
          onClick={() => d.onExecute?.()}
          disabled={d.status === 'generating' || !d.ready}
          className="w-full py-2 rounded-lg bg-neon text-surface-500 text-xs font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
        >
          {d.status === 'generating' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {d.status === 'generating' ? 'Gerando...' : d.status === 'done' ? 'Rodar de novo' : 'Executar workflow'}
        </button>
        {!d.ready && d.status !== 'done' && (
          <p className="text-[9px] text-yellow-400/80 text-center">Conecte Produto + Avatar + Cena + Ajustes</p>
        )}
        {d.status === 'done' && d.resultUrl && (
          <div className="space-y-1">
            <img src={d.resultUrl} alt="Resultado" className="w-full rounded" />
            <div className="flex items-center gap-1 text-[10px] text-green-400">
              <CheckCircle2 size={10} /> Gerado
            </div>
          </div>
        )}
        {d.status === 'error' && (
          <p className="text-[9px] text-red-400 text-center">Erro. Tente novamente.</p>
        )}
      </div>
    </div>
  )
}

export const NODE_LIBRARY: { type: string; label: string; icon: typeof Package; color: string; defaults: Record<string, unknown> }[] = [
  { type: 'product', label: 'Produto', icon: Package, color: 'text-orange-400', defaults: {} },
  { type: 'avatar', label: 'Influencer', icon: User, color: 'text-pink-400', defaults: {} },
  { type: 'scene', label: 'Cena', icon: ImageIcon, color: 'text-emerald-400', defaults: {} },
  { type: 'settings', label: 'Ajustes', icon: Sliders, color: 'text-sky-400', defaults: { pose: 'front', style: 'casual', enhancements: ['skin', 'sharpness', 'anti_ai', 'hands'], format: '9:16' } },
  { type: 'generate', label: 'Executar', icon: Sparkles, color: 'text-violet-400', defaults: { status: 'idle' } },
]

export { type LabNodeContext }
