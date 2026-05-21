import { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Package, User, Image as ImageIcon, Sliders, Sparkles, Loader2, CheckCircle2, Upload, Wand2, Pencil, Film, Activity, MessageSquare, Copy as CopyIcon, Trash2, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeRaw } from '../../lib/invokeRaw'
import { POSES, STYLES, FORMATS, ENHANCEMENTS, SCENARIOS } from '../../types/studio'
import type { Product, Avatar } from '../../types/database'
import { resizeImageFile } from '../../lib/imageUtils'
import { applyCreditsFromResponse } from '../../lib/applyCreditsResponse'

interface LabNodeContext {
  onOpenEditor?: (nodeId: string) => void
}

const baseNodeClass = 'rounded-xl bg-surface-300 border border-white/10 shadow-lg min-w-[220px] max-w-[260px]'

// Botões duplicar/apagar pro header de cada node — disparam eventos que InfluencerLabPage escuta
function NodeHeaderActions({ id }: { id: string }) {
  function dispatch(eventName: string, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    window.dispatchEvent(new CustomEvent(eventName, { detail: { id } }))
  }
  return (
    <div className="flex items-center gap-1 ml-auto">
      <button onClick={e => dispatch('lab-duplicate-node', e)} title="Duplicar" className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white cursor-pointer">
        <CopyIcon size={11} />
      </button>
      <button onClick={e => dispatch('lab-delete-node', e)} title="Apagar" className="p-1 rounded hover:bg-red-500/20 text-white/50 hover:text-red-300 cursor-pointer">
        <Trash2 size={11} />
      </button>
    </div>
  )
}

export function ProductNode({ id, data, selected }: NodeProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  // E52b: cliente pediu tab Upload (igual AvatarNode)
  const [tab, setTab] = useState<'galeria' | 'upload'>('galeria')
  const [busy, setBusy] = useState(false)
  const d = data as { productId?: string; productName?: string; imageUrl?: string }

  useEffect(() => {
    if (open && tab === 'galeria' && products.length === 0 && !loading) {
      setLoading(true)
      setLoadError(null)
      supabase.from('products').select('*').eq('is_active', true).order('heat_score', { ascending: false }).limit(30)
        .then(({ data, error }) => {
          if (error) setLoadError(error.message || 'Erro ao carregar produtos')
          else setProducts((data as Product[]) || [])
          setLoading(false)
        })
    }
  }, [open, tab, products.length, loading])

  function select(p: Product) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { productId: p.id, productName: p.name, imageUrl: p.image_url } } }))
    setOpen(false)
  }

  // E52b: upload livre — cliente sobe foto do produto direto no node
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try {
      const url = await resizeImageFile(file, 1280, 0.85)
      window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { productId: 'upload', productName: 'Produto customizado', imageUrl: url } } }))
      setOpen(false)
    } finally { setBusy(false); e.target.value = '' }
  }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <Package size={14} className="text-orange-400" />
        <span className="text-xs font-semibold text-white">Produto</span>
        <NodeHeaderActions id={id} />
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
        <div className="nodrag nowheel absolute left-full top-0 ml-2 w-72 max-h-96 overflow-y-auto bg-surface-400 border border-white/10 rounded-xl shadow-2xl p-2 z-50">
          <div className="flex gap-1 mb-2">
            <button onClick={() => setTab('galeria')} className={`flex-1 py-1 rounded text-[10px] ${tab === 'galeria' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Galeria</button>
            <button onClick={() => setTab('upload')} className={`flex-1 py-1 rounded text-[10px] ${tab === 'upload' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Upload</button>
          </div>
          {tab === 'upload' ? (
            <label className="flex flex-col items-center gap-2 py-8 rounded border border-dashed border-white/20 hover:border-orange-500/50 cursor-pointer">
              {busy ? <Loader2 size={18} className="text-orange-400 animate-spin" /> : <Upload size={18} className="text-orange-400" />}
              <span className="text-[10px] text-white/60">{busy ? 'Enviando…' : 'Subir foto do produto'}</span>
              <span className="text-[9px] text-white/30">PNG, JPG até 7MB</span>
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          ) : loading ? (
            <div className="flex items-center justify-center py-6 text-[10px] text-white/40 gap-1.5"><Loader2 size={12} className="animate-spin text-primary-400" /> Carregando…</div>
          ) : loadError ? (
            <p className="text-[10px] text-red-400 text-center py-4 px-2">Erro: {loadError}</p>
          ) : products.length === 0 ? (
            <p className="text-[10px] text-white/50 text-center py-4">Nenhum produto cadastrado ainda. Cadastre em Radar de Oportunidades ou use a aba Upload.</p>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {products.map(p => (
                <button key={p.id} onClick={() => select(p)} className="p-1 rounded hover:bg-white/5 cursor-pointer">
                  <img src={p.image_url} alt="" className="w-full aspect-square rounded object-cover" />
                  <p className="text-[9px] text-white/60 mt-0.5 truncate">{p.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-orange-400 !w-2 !h-2" />
    </div>
  )
}

// AvatarNode (ex-"Influencer"): renomeado pra "Avatar" + tab Galeria/Upload
export function AvatarNode({ id, data, selected }: NodeProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'galeria' | 'upload'>('galeria')
  const [gender, setGender] = useState<'female' | 'male'>('female')
  const [busy, setBusy] = useState(false)
  const d = data as { avatarId?: string; avatarName?: string; imageUrl?: string; gender?: 'female' | 'male' }

  useEffect(() => {
    if (open && tab === 'galeria' && avatars.length === 0 && !loading) {
      setLoading(true)
      setLoadError(null)
      supabase.from('avatars').select('*').eq('is_active', true).limit(40)
        .then(({ data, error }) => {
          if (error) setLoadError(error.message || 'Erro ao carregar avatares')
          else setAvatars((data as Avatar[]) || [])
          setLoading(false)
        })
    }
  }, [open, tab, avatars.length, loading])

  function select(a: Avatar) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { avatarId: a.id, avatarName: a.name, imageUrl: a.image_url, gender: a.gender } } }))
    setOpen(false)
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try {
      const url = await resizeImageFile(file, 1024, 0.85)
      window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { avatarId: 'upload', avatarName: 'Avatar customizado', imageUrl: url } } }))
      setOpen(false)
    } finally { setBusy(false); e.target.value = '' }
  }

  const filtered = avatars.filter(a => a.gender === gender)

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-pink-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <User size={14} className="text-pink-400" />
        <span className="text-xs font-semibold text-white">Avatar</span>
        <NodeHeaderActions id={id} />
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
        <div className="nodrag nowheel absolute left-full top-0 ml-2 w-72 max-h-96 overflow-y-auto bg-surface-400 border border-white/10 rounded-xl shadow-2xl p-2 z-50">
          <div className="flex gap-1 mb-2">
            <button onClick={() => setTab('galeria')} className={`flex-1 py-1 rounded text-[10px] ${tab === 'galeria' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Galeria</button>
            <button onClick={() => setTab('upload')} className={`flex-1 py-1 rounded text-[10px] ${tab === 'upload' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Upload</button>
          </div>
          {tab === 'galeria' ? (
            <>
              <div className="flex gap-1 mb-2">
                <button onClick={() => setGender('female')} className={`flex-1 py-1 rounded text-[10px] ${gender === 'female' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Feminino</button>
                <button onClick={() => setGender('male')} className={`flex-1 py-1 rounded text-[10px] ${gender === 'male' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Masculino</button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-6 text-[10px] text-white/40 gap-1.5"><Loader2 size={12} className="animate-spin text-primary-400" /> Carregando…</div>
              ) : loadError ? (
                <p className="text-[10px] text-red-400 text-center py-4 px-2">Erro: {loadError}</p>
              ) : filtered.length === 0 ? (
                <p className="text-[10px] text-white/50 text-center py-4">Nenhum avatar {gender === 'female' ? 'feminino' : 'masculino'} disponível. Suba uma foto na aba Upload.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {filtered.map(a => (
                    <button key={a.id} onClick={() => select(a)} className="p-1 rounded hover:bg-white/5 cursor-pointer">
                      <img src={a.image_url} alt="" className="w-full aspect-square rounded object-cover" />
                      <p className="text-[9px] text-white/60 mt-0.5 truncate">{a.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <label className="flex flex-col items-center gap-2 py-8 rounded border border-dashed border-white/20 hover:border-primary-500/50 cursor-pointer">
              {busy ? <Loader2 size={18} className="text-primary-400 animate-spin" /> : <Upload size={18} className="text-pink-400" />}
              <span className="text-[10px] text-white/60">{busy ? 'Enviando…' : 'Subir foto'}</span>
              <span className="text-[9px] text-white/30">PNG, JPG até 7MB</span>
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-pink-400 !w-2 !h-2" />
    </div>
  )
}

// SceneNode: tabs Prontas / Personalizada / Upload (NEW: tab Upload de foto do ambiente)
export function SceneNode({ id, data, selected }: NodeProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'ready' | 'custom' | 'upload'>('ready')
  const [busy, setBusy] = useState(false)
  const d = data as { scenarioId?: string; scenarioName?: string; customPrompt?: string; sceneImageUrl?: string }

  function selectReady(s: { id: string; name: string }) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { scenarioId: s.id, scenarioName: s.name, customPrompt: undefined, sceneImageUrl: undefined } } }))
    setOpen(false)
  }
  function saveCustom(prompt: string) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { scenarioId: undefined, scenarioName: 'Personalizada', customPrompt: prompt, sceneImageUrl: undefined } } }))
  }
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try {
      const url = await resizeImageFile(file, 1280, 0.85)
      window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { scenarioId: undefined, scenarioName: 'Foto do ambiente', customPrompt: undefined, sceneImageUrl: url } } }))
      setOpen(false)
    } finally { setBusy(false); e.target.value = '' }
  }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <ImageIcon size={14} className="text-emerald-400" />
        <span className="text-xs font-semibold text-white">Cena</span>
        <NodeHeaderActions id={id} />
      </div>
      <div className="p-3">
        {d.scenarioName || d.customPrompt || d.sceneImageUrl ? (
          <button onClick={() => setOpen(true)} className="w-full text-left cursor-pointer">
            {d.sceneImageUrl && <img src={d.sceneImageUrl} alt="" className="w-full rounded mb-1 object-cover" />}
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
        <div className="nodrag nowheel absolute left-full top-0 ml-2 w-72 max-h-96 overflow-y-auto bg-surface-400 border border-white/10 rounded-xl shadow-2xl p-2 z-50">
          <div className="flex gap-1 mb-2">
            <button onClick={() => setTab('ready')} className={`flex-1 py-1 rounded text-[10px] ${tab === 'ready' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Prontas</button>
            <button onClick={() => setTab('custom')} className={`flex-1 py-1 rounded text-[10px] ${tab === 'custom' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Descrever</button>
            <button onClick={() => setTab('upload')} className={`flex-1 py-1 rounded text-[10px] ${tab === 'upload' ? 'bg-primary-600 text-white' : 'text-white/50'}`}>Upload</button>
          </div>
          {tab === 'ready' && (
            <div className="grid grid-cols-2 gap-1">
              {SCENARIOS.map(s => (
                <button key={s.id} onClick={() => selectReady(s)} className="p-1 rounded hover:bg-white/5 cursor-pointer text-left">
                  <img src={s.thumbnail} alt="" className="w-full aspect-square rounded object-cover" />
                  <p className="text-[9px] text-white/80 mt-0.5 truncate">{s.name}</p>
                </button>
              ))}
            </div>
          )}
          {tab === 'custom' && (
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
          {tab === 'upload' && (
            <label className="flex flex-col items-center gap-2 py-8 rounded border border-dashed border-white/20 hover:border-primary-500/50 cursor-pointer">
              {busy ? <Loader2 size={18} className="text-primary-400 animate-spin" /> : <Upload size={18} className="text-emerald-400" />}
              <span className="text-[10px] text-white/60">{busy ? 'Enviando…' : 'Subir foto do ambiente'}</span>
              <span className="text-[9px] text-white/30">PNG, JPG até 7MB</span>
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
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

  function toggleEnh(eid: string) {
    const next = d.enhancements.includes(eid) ? d.enhancements.filter(e => e !== eid) : [...d.enhancements, eid]
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
        <NodeHeaderActions id={id} />
      </div>
      <button onClick={() => setOpen(o => !o)} className="w-full p-3 text-left cursor-pointer">
        <p className="text-[10px] text-white/60">{poseName} · {styleName} · {formatName}</p>
        <p className="text-[9px] text-white/40">{d.enhancements.length} melhoria(s) ativa(s)</p>
        <p className="text-[9px] text-primary-400 mt-0.5">{open ? 'Fechar' : 'Editar'}</p>
      </button>
      {open && (
        <div className="nodrag nowheel absolute left-full top-0 ml-2 w-80 max-h-[420px] overflow-y-auto bg-surface-400 border border-white/10 rounded-xl shadow-2xl p-3 z-50 space-y-3">
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

export function GenerateNode({ id, data, selected }: NodeProps) {
  const d = data as { status: string; resultUrl?: string; onExecute?: () => void; ready?: boolean }

  // E52b: cliente pediu opção de baixar o resultado direto do node
  async function downloadResult() {
    if (!d.resultUrl) return
    try {
      const r = await fetch(d.resultUrl)
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `vyral-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(d.resultUrl, '_blank')
    }
  }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-violet-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <Sparkles size={14} className="text-violet-400" />
        <span className="text-xs font-semibold text-white">Gerar Imagem</span>
        <NodeHeaderActions id={id} />
      </div>
      <div className="p-3 space-y-2">
        <button
          onClick={() => d.onExecute?.()}
          disabled={d.status === 'generating' || !d.ready}
          className="w-full py-2 rounded-lg bg-neon text-surface-500 text-xs font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
        >
          {d.status === 'generating' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {d.status === 'generating' ? 'Gerando...' : d.status === 'done' ? 'Regerar' : 'Gerar Imagem'}
        </button>
        {!d.ready && d.status !== 'done' && (
          <p className="text-[9px] text-yellow-400/80 text-center">Conecte Produto + Avatar + Cena (Ajustes opcional)</p>
        )}
        {d.status === 'done' && d.resultUrl && (
          <div className="space-y-1">
            <img src={d.resultUrl} alt="Resultado" className="w-full rounded" />
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 text-[10px] text-green-400">
                <CheckCircle2 size={10} /> Gerado
              </div>
              <button
                onClick={downloadResult}
                className="flex items-center gap-1 px-2 py-1 rounded bg-primary-600/30 text-primary-300 text-[10px] font-medium hover:bg-primary-600/50 cursor-pointer"
              >
                <Upload size={10} className="rotate-180" /> Baixar
              </button>
            </div>
          </div>
        )}
        {d.status === 'error' && (
          <p className="text-[9px] text-red-400 text-center">Erro. Tente novamente.</p>
        )}
      </div>
      {/* E52b: Handle de saída pra poder ligar o resultado a Editar Imagem / Gerar Vídeo */}
      <Handle type="source" position={Position.Right} className="!bg-violet-400 !w-2 !h-2" />
    </div>
  )
}

// ImageNode: upload livre de imagem (não atrelado a produto/avatar)
export function ImageNode({ id, data, selected }: NodeProps) {
  const d = data as { imageUrl?: string }
  const [busy, setBusy] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try {
      const url = await resizeImageFile(file, 1280, 0.85)
      window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { imageUrl: url } } }))
    } finally { setBusy(false); e.target.value = '' }
  }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <ImageIcon size={14} className="text-cyan-400" />
        <span className="text-xs font-semibold text-white">Imagem</span>
        <NodeHeaderActions id={id} />
      </div>
      <div className="p-3">
        {d.imageUrl ? (
          <label className="block cursor-pointer">
            <img src={d.imageUrl} alt="" className="w-full rounded object-cover" />
            <p className="text-[9px] text-primary-400 mt-1 text-center">Trocar imagem</p>
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        ) : (
          <label className="w-full flex flex-col items-center gap-1.5 py-4 rounded-lg border border-dashed border-white/20 hover:border-primary-500/50 cursor-pointer">
            {busy ? <Loader2 size={16} className="text-primary-400 animate-spin" /> : <Upload size={16} className="text-cyan-400" />}
            <span className="text-[10px] text-white/60">{busy ? 'Subindo…' : 'Subir imagem'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-2 !h-2" />
    </div>
  )
}

// PromptNode: prompt livre + botão melhorar
export function PromptNode({ id, data, selected }: NodeProps) {
  const d = data as { prompt?: string }
  const [enhancing, setEnhancing] = useState(false)
  const [val, setVal] = useState(d.prompt || '')

  function save(v: string) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { prompt: v } } }))
  }

  async function enhance() {
    if (!val.trim()) return
    setEnhancing(true)
    try {
      // E52b: invokeRaw + max_chars (era invoke broken pattern, cliente reportou "carregando eternamente")
      const { data, error } = await invokeRaw<{ prompt?: string; truncated?: boolean; credits_remaining?: number }>('enhance-prompt', {
        description: val, type: 'video', max_chars: 800,
      })
      if (error || !data?.prompt) return
      applyCreditsFromResponse(data)
      setVal(data.prompt.slice(0, 800)); save(data.prompt.slice(0, 800))
    } finally { setEnhancing(false) }
  }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      {/* E52c: Handle target — cliente pediu Foto→Prompt→Gerar Imagem (encadear) */}
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <MessageSquare size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-white">Prompt</span>
        <NodeHeaderActions id={id} />
      </div>
      <div className="p-3 space-y-2">
        <textarea
          value={val}
          onChange={e => setVal(e.target.value.slice(0, 800))}
          onBlur={() => save(val)}
          placeholder="Descreva o que você quer…"
          rows={4}
          className="nodrag w-full p-2 bg-surface-400 border border-white/10 rounded text-[11px] text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-primary-500"
        />
        <button
          onClick={enhance}
          disabled={enhancing || !val.trim()}
          className="w-full flex items-center justify-center gap-1 py-1 rounded bg-neon text-surface-500 text-[10px] font-bold hover:brightness-110 disabled:opacity-40 cursor-pointer"
        >
          {enhancing ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
          Melhorar
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-2 !h-2" />
    </div>
  )
}

// EditImageActionNode: self-contained — foto principal + foto referência + 4 templates + textarea + botão Editar
export function EditImageActionNode({ id, data, selected }: NodeProps) {
  const d = data as { status?: string; resultUrl?: string; errorMessage?: string; onExecute?: () => void; ready?: boolean; selfImageUrl?: string; selfRefImageUrl?: string; editTemplate?: string; editPrompt?: string }
  const [busy, setBusy] = useState(false)
  const [busyRef, setBusyRef] = useState(false)
  const status = d.status || 'idle'

  function update(patch: Record<string, unknown>) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: patch } }))
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try {
      const url = await resizeImageFile(file, 1280, 0.85)
      update({ selfImageUrl: url })
    } finally { setBusy(false); e.target.value = '' }
  }

  // E52b: cliente reportou que faltava upload da imagem REFERÊNCIA pra Trocar Influencer/Pose
  async function onRefFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusyRef(true)
    try {
      const url = await resizeImageFile(file, 1280, 0.85)
      update({ selfRefImageUrl: url })
    } finally { setBusyRef(false); e.target.value = '' }
  }

  const templates = [
    { id: 'roupa', label: 'Trocar Roupa', icon: '👕' },
    { id: 'cenario', label: 'Trocar Cenário', icon: '🌅' },
    { id: 'influencer', label: 'Trocar Influencer', icon: '👤' },
    { id: 'pose', label: 'Trocar Pose', icon: '🤸' },
  ]
  // E52c: cliente pediu slot de referência também pra Trocar Roupa e Cenário (pra subir a roupa/cenário desejado)
  const refHint: Record<string, string> = {
    roupa: 'Suba a foto da roupa desejada',
    cenario: 'Suba a foto do cenário desejado',
    influencer: 'Suba a foto do rosto desejado',
    pose: 'Suba a foto com a pose desejada',
  }
  const refLabel = d.editTemplate ? (refHint[d.editTemplate] || 'Suba uma referência (opcional)') : 'Suba uma referência (opcional)'

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-fuchsia-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <Pencil size={14} className="text-fuchsia-400" />
        <span className="text-xs font-semibold text-white">Editar Imagem</span>
        <NodeHeaderActions id={id} />
      </div>
      <div className="p-3 space-y-2">
        <div>
          <p className="text-[9px] text-white/40 uppercase tracking-wide mb-1">Imagem principal</p>
          <label className="block cursor-pointer">
            {d.selfImageUrl ? (
              <img src={d.selfImageUrl} alt="" className="w-full rounded object-cover aspect-square" />
            ) : (
              <div className="w-full flex flex-col items-center gap-1 py-4 rounded border border-dashed border-white/20 hover:border-fuchsia-500/50">
                {busy ? <Loader2 size={14} className="text-fuchsia-400 animate-spin" /> : <Upload size={14} className="text-fuchsia-400" />}
                <span className="text-[9px] text-white/50">⚠ Conecte uma imagem ou suba aqui</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        </div>

        {/* E52c+E52d: slot de referência em tamanho reduzido (cliente pediu menor) */}
        <div>
          <p className="text-[9px] text-white/40 uppercase tracking-wide mb-1">Imagem referência</p>
          <label className="block cursor-pointer">
            {d.selfRefImageUrl ? (
              <img src={d.selfRefImageUrl} alt="" className="w-20 mx-auto rounded object-contain" />
            ) : (
              <div className="w-full flex flex-col items-center gap-1 py-3 rounded border border-dashed border-amber-500/30 hover:border-amber-500/60">
                {busyRef ? <Loader2 size={14} className="text-amber-400 animate-spin" /> : <Upload size={14} className="text-amber-400" />}
                <span className="text-[9px] text-amber-300">{refLabel}</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onRefFile} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-1">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => update({ editTemplate: t.id })}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium cursor-pointer ${d.editTemplate === t.id ? 'bg-fuchsia-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'}`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <textarea
          value={d.editPrompt || ''}
          onChange={e => update({ editPrompt: e.target.value.slice(0, 400) })}
          placeholder="Detalhes extras (opcional)..."
          rows={2}
          className="nodrag w-full p-1.5 bg-surface-400 border border-white/10 rounded text-[10px] text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-primary-500"
        />

        <button
          onClick={() => d.onExecute?.()}
          disabled={status === 'generating' || !d.ready}
          className="w-full py-1.5 rounded bg-neon text-surface-500 text-[11px] font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
        >
          {status === 'generating' ? <Loader2 size={11} className="animate-spin" /> : <Pencil size={11} />}
          {status === 'generating' ? 'Editando…' : 'Editar'}
        </button>
        <p className="text-[9px] text-white/40 text-center">2 cr · nano-banana</p>
        {status === 'done' && d.resultUrl && (
          <div className="space-y-1">
            <img src={d.resultUrl} alt="" className="w-full rounded" />
            {/* E52d: botão Baixar pedido pelo cliente — alguns navegadores não baixavam direto do <img> */}
            <button
              onClick={async () => {
                if (!d.resultUrl) return
                try {
                  const r = await fetch(d.resultUrl)
                  const blob = await r.blob()
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = `vyral-edit-${Date.now()}.png`
                  a.click()
                  URL.revokeObjectURL(a.href)
                } catch {
                  window.open(d.resultUrl, '_blank')
                }
              }}
              className="w-full flex items-center justify-center gap-1 py-1 rounded bg-fuchsia-600/30 text-fuchsia-200 text-[10px] font-medium hover:bg-fuchsia-600/50 cursor-pointer"
            >
              <Upload size={10} className="rotate-180" /> Baixar imagem
            </button>
          </div>
        )}
        {status === 'error' && <p className="text-[9px] text-red-400 text-center">{d.errorMessage || 'Erro'}</p>}
      </div>
      {/* E52d: Handle de saída pra poder encadear o resultado da edição em outro node */}
      <Handle type="source" position={Position.Right} className="!bg-fuchsia-400 !w-2 !h-2" />
    </div>
  )
}

// GenerateVideoActionNode: self-contained com prompt + dropdown modelo + 2 avisos visíveis
// E52: alinhado com Avatar Vídeos pós-E48d — Veo 3.1 Lite 720p (15cr) ou 1080p (20cr) + Grok (2cr/s)
export function GenerateVideoActionNode({ id, data, selected }: NodeProps) {
  const d = data as { status?: string; resultUrl?: string; errorMessage?: string; onExecute?: () => void; ready?: boolean; mode?: 'veo-720p' | 'veo-1080p' | 'grok'; selfImageUrl?: string; ownPrompt?: string }
  const [busy, setBusy] = useState(false)
  const mode = d.mode || 'veo-720p'
  const status = d.status || 'idle'

  function update(patch: Record<string, unknown>) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: patch } }))
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try {
      const url = await resizeImageFile(file, 1280, 0.85)
      update({ selfImageUrl: url })
    } finally { setBusy(false); e.target.value = '' }
  }

  const credits = mode === 'veo-1080p' ? 20 : mode === 'grok' ? 2 : 15
  const modeLabel = mode === 'veo-1080p' ? 'Veo 3.1 Lite 1080p — 20 créditos' : mode === 'grok' ? 'Grok IA — 2 cr/s' : 'Veo 3.1 Lite 720p — 15 créditos'

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-blue-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <Film size={14} className="text-blue-400" />
        <span className="text-xs font-semibold text-white">Gerar Vídeo</span>
        <NodeHeaderActions id={id} />
      </div>
      <div className="p-3 space-y-2">
        {/* Slot imagem (self ou conectado) */}
        <label className="block cursor-pointer">
          {d.selfImageUrl ? (
            <img src={d.selfImageUrl} alt="" className="w-full rounded object-cover" />
          ) : (
            <div className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded border border-dashed border-white/15 hover:border-blue-500/50">
              <Upload size={11} className="text-white/30" />
              <span className="text-[9px] text-white/40">⚠ Conecte um node com imagem</span>
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>

        {/* Slot prompt (self ou conectado) */}
        <div className="px-2 py-1.5 rounded border border-white/10 bg-surface-400/50">
          <p className="text-[9px] text-white/40 mb-1">⚠ Conecte uma cena ou escreva abaixo</p>
        </div>

        <div>
          <p className="text-[9px] text-white/40 mb-1">PROMPT</p>
          <textarea
            value={d.ownPrompt || ''}
            onChange={e => update({ ownPrompt: e.target.value.slice(0, 800) })}
            placeholder="Descreva o vídeo que quer gerar..."
            rows={3}
            className="nodrag w-full p-1.5 bg-surface-400 border border-white/10 rounded text-[10px] text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <p className="text-[9px] text-white/40 mb-1">MODELO</p>
          <select
            value={mode}
            onChange={e => update({ mode: e.target.value })}
            className="nodrag w-full p-1.5 bg-surface-400 border border-blue-500/40 rounded text-[10px] text-white focus:outline-none focus:border-blue-500"
          >
            <option value="veo-720p">🎬 Veo 3.1 Lite 720p — 15 cr</option>
            <option value="veo-1080p">🎬 Veo 3.1 Lite 1080p — 20 cr</option>
            <option value="grok">⚡ Grok IA — 2 cr/s</option>
          </select>
        </div>

        {busy && <Loader2 size={12} className="text-primary-400 animate-spin mx-auto" />}

        <button
          onClick={() => d.onExecute?.()}
          disabled={status === 'generating' || status === 'pending' || !d.ready}
          className="w-full py-1.5 rounded bg-neon text-surface-500 text-[11px] font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
        >
          {status === 'generating' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {status === 'generating' ? 'Enviando…' : status === 'pending' ? 'Processando…' : status === 'done' ? 'Regerar' : 'Gerar'}
        </button>
        <p className="text-[9px] text-white/40 text-center">{modeLabel}{mode !== 'grok' ? ` (${credits} cr)` : ''}</p>
        {/* E52c: vídeo final inline ou loading com mensagem clara + custo */}
        {status === 'pending' && (
          <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3 text-center space-y-1.5">
            <Loader2 size={20} className="animate-spin text-amber-400 mx-auto" />
            <p className="text-[10px] text-amber-200 font-medium">Seu vídeo está sendo processado</p>
            <p className="text-[9px] text-white/60 leading-relaxed">Isso pode levar de 1 a 5 minutos e ele aparecerá aqui em seguida.</p>
            <p className="text-[9px] text-amber-300 font-semibold pt-1 border-t border-amber-500/20">Custo: {credits} {mode === 'grok' ? 'cr/s' : 'cr'}</p>
          </div>
        )}
        {status === 'done' && d.resultUrl && <video src={d.resultUrl} controls className="w-full rounded" />}
        {status === 'done' && !d.resultUrl && <p className="text-[9px] text-amber-400 text-center">Em processamento — recarregue daqui a pouco</p>}
        {status === 'error' && <p className="text-[9px] text-red-400 text-center">{d.errorMessage || 'Erro'}</p>}
      </div>
    </div>
  )
}

// MotionActionNode: self-contained — slot imagem + upload vídeo ref + textarea opcional + botão
export function MotionActionNode({ id, data, selected }: NodeProps) {
  const d = data as { status?: string; resultUrl?: string; errorMessage?: string; onExecute?: () => void; ready?: boolean; selfImageUrl?: string; referenceVideoUrl?: string; ownPrompt?: string }
  const [busy, setBusy] = useState(false)
  const status = d.status || 'idle'

  function update(patch: Record<string, unknown>) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: patch } }))
  }

  async function onImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try {
      const url = await resizeImageFile(file, 1280, 0.85)
      update({ selfImageUrl: url })
    } finally { setBusy(false); e.target.value = '' }
  }

  async function onVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 30 * 1024 * 1024) { alert('Vídeo muito grande (max 30MB)'); e.target.value = ''; return }
    // Pra evitar bater limite ~6MB do edge fn body, sobe pro Storage e armazena URL pública.
    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('sessão expirada')
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
      const filename = `motion-uploads/${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('public-media').upload(filename, file, { contentType: file.type, upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('public-media').getPublicUrl(filename)
      if (pub?.publicUrl) update({ referenceVideoUrl: pub.publicUrl })
    } catch (err) {
      alert('Erro ao subir vídeo: ' + (err as Error).message)
    } finally { setBusy(false); e.target.value = '' }
  }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-rose-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <Activity size={14} className="text-rose-400" />
        <span className="text-xs font-semibold text-white">Imitar Movimento</span>
        <NodeHeaderActions id={id} />
      </div>
      <div className="p-3 space-y-2">
        {/* Slot imagem do personagem (self ou conectado) */}
        <label className="block cursor-pointer">
          {d.selfImageUrl ? (
            <img src={d.selfImageUrl} alt="" className="w-full rounded object-cover aspect-square" />
          ) : (
            <div className="w-full flex items-center gap-1.5 px-2 py-2 rounded border border-dashed border-white/15 hover:border-rose-500/50">
              <Upload size={11} className="text-white/30" />
              <span className="text-[9px] text-white/40">⚠ Conecte um node com imagem</span>
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onImageFile} />
        </label>

        {/* E52c: vídeo de referência em tamanho reduzido (cliente pediu) */}
        <div>
          <p className="text-[9px] text-white/40 uppercase tracking-wide mb-1">Vídeo de referência</p>
          <label className="block cursor-pointer">
            {d.referenceVideoUrl ? (
              <video src={d.referenceVideoUrl} className="w-24 rounded mx-auto" muted playsInline />
            ) : (
              <div className="flex flex-col items-center gap-1 py-3 rounded border border-dashed border-white/20 hover:border-rose-500/50">
                {busy ? <Loader2 size={14} className="text-rose-400 animate-spin" /> : <Upload size={14} className="text-rose-400" />}
                <span className="text-[9px] text-white/60">{busy ? 'Enviando…' : 'Upload vídeo referência'}</span>
                <span className="text-[9px] text-white/30">MP4 até 30MB</span>
              </div>
            )}
            <input type="file" accept="video/*" className="hidden" onChange={onVideoFile} />
          </label>
        </div>

        <div>
          <p className="text-[9px] text-white/40 mb-1">PROMPT (OPCIONAL)</p>
          <textarea
            value={d.ownPrompt || ''}
            onChange={e => update({ ownPrompt: e.target.value.slice(0, 400) })}
            placeholder="Detalhes adicionais..."
            rows={2}
            className="nodrag w-full p-1.5 bg-surface-400 border border-white/10 rounded text-[10px] text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-primary-500"
          />
        </div>

        <button
          onClick={() => d.onExecute?.()}
          disabled={status === 'generating' || status === 'pending' || !d.ready}
          className="w-full py-1.5 rounded bg-neon text-surface-500 text-[11px] font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
        >
          {status === 'generating' ? <Loader2 size={11} className="animate-spin" /> : <Activity size={11} />}
          {status === 'generating' ? 'Enviando…' : status === 'pending' ? 'Processando…' : status === 'done' ? 'Regerar' : 'Imitar Movimento'}
        </button>
        <p className="text-[9px] text-white/40 text-center">6 cr/s 720p · Kling Motion</p>
        {/* E52c: vídeo final inline ou loading com mensagem clara */}
        {status === 'pending' && (
          <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3 text-center space-y-1.5">
            <Loader2 size={20} className="animate-spin text-amber-400 mx-auto" />
            <p className="text-[10px] text-amber-200 font-medium">Seu vídeo está sendo processado</p>
            <p className="text-[9px] text-white/60 leading-relaxed">Isso pode levar de 1 a 5 minutos e ele aparecerá aqui em seguida.</p>
            <p className="text-[9px] text-amber-300 font-semibold pt-1 border-t border-amber-500/20">Custo: 6 cr/s</p>
          </div>
        )}
        {status === 'done' && d.resultUrl && <video src={d.resultUrl} controls className="w-full rounded" />}
        {status === 'done' && !d.resultUrl && <p className="text-[9px] text-amber-400 text-center">Processando — recarregue daqui a pouco</p>}
        {status === 'error' && <p className="text-[9px] text-red-400 text-center">{d.errorMessage || 'Erro'}</p>}
      </div>
    </div>
  )
}

// ScriptNode (NEW): Gerar Roteiro — structured input chama enhance-prompt e devolve texto
export function ScriptNode({ id, data, selected }: NodeProps) {
  const d = data as { status?: string; resultText?: string; errorMessage?: string; onExecute?: () => void; ready?: boolean; productName?: string; tipo?: string; estilo?: string; acao?: string; camera?: string; dialogo?: string; idioma?: string }
  const status = d.status || 'idle'

  function update(patch: Record<string, unknown>) {
    window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: patch } }))
  }

  return (
    <div className={`${baseNodeClass} ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-violet-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-400 rounded-t-xl">
        <FileText size={14} className="text-violet-400" />
        <span className="text-xs font-semibold text-white">Gerar Roteiro</span>
        <NodeHeaderActions id={id} />
      </div>
      <div className="p-3 space-y-2">
        <input
          type="text"
          value={d.productName || ''}
          onChange={e => update({ productName: e.target.value.slice(0, 80) })}
          placeholder="Nome do produto…"
          className="nodrag w-full px-2 py-1.5 bg-surface-400 border border-violet-500/40 rounded text-[10px] text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500"
        />

        <FieldSelect id={id} label="Tipo" field="tipo" value={d.tipo} options={[
          { v: 'outro', l: '📦 Outro' }, { v: 'skincare', l: '🧴 Skincare' }, { v: 'roupa', l: '👕 Roupa' },
          { v: 'tech', l: '📱 Tech' }, { v: 'alimento', l: '🍫 Alimento' }, { v: 'casa', l: '🏠 Casa' },
        ]} />

        <FieldSelect id={id} label="Estilo" field="estilo" value={d.estilo || 'ugc'} options={[
          { v: 'ugc', l: '🎬 UGC' }, { v: 'especialista', l: '🎓 Especialista' }, { v: 'vendedor', l: '💸 Vendedor' },
          { v: 'depoimento', l: '💬 Depoimento' }, { v: 'gancho', l: '🪝 Gancho' }, { v: 'storyteller', l: '📖 Storyteller' },
        ]} />

        <FieldSelect id={id} label="Ação" field="acao" value={d.acao} options={[
          { v: '', l: 'Selecionar...' }, { v: 'usando', l: 'Usando o produto' }, { v: 'mostrando', l: 'Mostrando' },
          { v: 'depoimento', l: 'Depoimento' }, { v: 'comparando', l: 'Comparando' },
        ]} />

        <FieldSelect id={id} label="Câmera" field="camera" value={d.camera} options={[
          { v: '', l: 'Selecionar...' }, { v: 'parada', l: '📹 Parada' }, { v: 'pov', l: '👁️ POV' },
          { v: 'panoramica', l: '🎥 Panorâmica' }, { v: 'zoom-in', l: '🔎 Zoom in' },
        ]} />

        <div>
          <p className="text-[9px] text-white/40 mb-1">Diálogo <span className="text-white/30">opcional</span></p>
          <textarea
            value={d.dialogo || ''}
            onChange={e => update({ dialogo: e.target.value.slice(0, 200) })}
            placeholder="Ex: Gente, olha isso..."
            rows={2}
            className="nodrag w-full p-1.5 bg-surface-400 border border-white/10 rounded text-[10px] text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-violet-500"
          />
        </div>

        <FieldSelect id={id} label="Idioma" field="idioma" value={d.idioma || 'pt-BR'} options={[
          { v: 'pt-BR', l: '🇧🇷 Português (BR)' }, { v: 'en', l: '🇺🇸 English' }, { v: 'es', l: '🇪🇸 Español' },
        ]} />

        <button
          onClick={() => d.onExecute?.()}
          disabled={status === 'generating' || !d.ready}
          className="w-full py-1.5 rounded bg-neon text-surface-500 text-[11px] font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
        >
          {status === 'generating' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {status === 'generating' ? 'Gerando…' : 'Gerar Prompt'}
        </button>
        <p className="text-[9px] text-white/40 text-center">10 grátis lifetime · 1 cr depois</p>

        {status === 'done' && d.resultText && (
          <div className="space-y-1">
            <div className="bg-surface-400 border border-white/5 rounded p-2 max-h-32 overflow-y-auto nodrag nowheel">
              <p className="text-[10px] text-white/80 whitespace-pre-wrap">{d.resultText}</p>
            </div>
            {/* E52c: botão Copiar pedido pelo cliente */}
            <button
              onClick={() => {
                if (d.resultText) {
                  navigator.clipboard.writeText(d.resultText)
                  // Feedback visual rápido via state local
                  const btn = document.activeElement as HTMLButtonElement
                  if (btn) {
                    const orig = btn.textContent
                    btn.textContent = '✓ Copiado'
                    setTimeout(() => { btn.textContent = orig }, 1500)
                  }
                }
              }}
              className="w-full flex items-center justify-center gap-1 py-1 rounded bg-violet-600/30 text-violet-200 text-[10px] font-medium hover:bg-violet-600/50 cursor-pointer"
            >
              <CopyIcon size={10} /> Copiar roteiro
            </button>
          </div>
        )}
        {status === 'error' && <p className="text-[9px] text-red-400 text-center">{d.errorMessage || 'Erro'}</p>}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-violet-400 !w-2 !h-2" />
    </div>
  )
}

function FieldSelect({ id, label, field, value, options }: { id: string; label: string; field: string; value?: string; options: { v: string; l: string }[] }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-[9px] text-white/40 w-12 flex-shrink-0">{label}</p>
      <select
        value={value || ''}
        onChange={e => window.dispatchEvent(new CustomEvent('lab-update-node', { detail: { id, data: { [field]: e.target.value } } }))}
        className="nodrag flex-1 px-2 py-1 bg-surface-400 border border-white/10 rounded text-[10px] text-white focus:outline-none focus:border-violet-500"
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )
}

export const NODE_LIBRARY: { type: string; label: string; icon: typeof Package; color: string; defaults: Record<string, unknown>; group: 'input' | 'action' }[] = [
  // Inputs
  { type: 'product', label: 'Produto', icon: Package, color: 'text-orange-400', defaults: {}, group: 'input' },
  { type: 'avatar', label: 'Avatar', icon: User, color: 'text-pink-400', defaults: {}, group: 'input' },
  { type: 'scene', label: 'Cena', icon: ImageIcon, color: 'text-emerald-400', defaults: {}, group: 'input' },
  { type: 'settings', label: 'Ajustes', icon: Sliders, color: 'text-sky-400', defaults: { pose: 'front', style: 'casual', enhancements: ['skin', 'sharpness', 'anti_ai', 'hands'], format: '9:16' }, group: 'input' },
  { type: 'image', label: 'Imagem', icon: ImageIcon, color: 'text-cyan-400', defaults: {}, group: 'input' },
  { type: 'prompt', label: 'Prompt', icon: MessageSquare, color: 'text-amber-400', defaults: { prompt: '' }, group: 'input' },
  // Actions
  { type: 'generate', label: 'Gerar Imagem', icon: Sparkles, color: 'text-violet-400', defaults: { status: 'idle' }, group: 'action' },
  { type: 'edit-image', label: 'Editar Imagem', icon: Pencil, color: 'text-fuchsia-400', defaults: { status: 'idle' }, group: 'action' },
  { type: 'video', label: 'Gerar Vídeo', icon: Film, color: 'text-blue-400', defaults: { status: 'idle', mode: 'veo-lite' }, group: 'action' },
  { type: 'motion', label: 'Imitar Movimento', icon: Activity, color: 'text-rose-400', defaults: { status: 'idle' }, group: 'action' },
  { type: 'script', label: 'Gerar Roteiro', icon: FileText, color: 'text-violet-400', defaults: { status: 'idle', estilo: 'ugc', idioma: 'pt-BR' }, group: 'action' },
]

export { type LabNodeContext }
