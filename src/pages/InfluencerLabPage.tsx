import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type ReactFlowInstance,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Zap, Coins } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { ProductNode, AvatarNode, SceneNode, SettingsNode, GenerateNode, ImageNode, PromptNode, EditImageActionNode, GenerateVideoActionNode, MotionActionNode, NODE_LIBRARY } from '../components/influencer-lab/nodes'
import { POSES, STYLES, FORMATS, ENHANCEMENTS, SCENARIOS } from '../types/studio'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'

const nodeTypes = {
  product: ProductNode,
  avatar: AvatarNode,
  scene: SceneNode,
  settings: SettingsNode,
  generate: GenerateNode,
  image: ImageNode,
  prompt: PromptNode,
  'edit-image': EditImageActionNode,
  video: GenerateVideoActionNode,
  motion: MotionActionNode,
}

const ACTION_NODE_TYPES = new Set(['generate', 'edit-image', 'video', 'motion'])

function InfluencerLabInner() {
  const navigate = useNavigate()
  const { subscription } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Escuta eventos de atualização vindos dos nodes (produto, avatar, cena, settings)
  useEffect(() => {
    function handler(e: Event) {
      const { id, data } = (e as CustomEvent).detail as { id: string; data: Record<string, unknown> }
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
    }
    window.addEventListener('lab-update-node', handler)
    return () => window.removeEventListener('lab-update-node', handler)
  }, [setNodes])

  const onConnect = useCallback((conn: Connection) => {
    setEdges(eds => addEdge({ ...conn, animated: true }, eds))
  }, [setEdges])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/reactflow')
    if (!type || !rfInstance) return

    const def = NODE_LIBRARY.find(n => n.type === type)
    if (!def) return

    const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const newNode: Node = {
      id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      position,
      data: { ...def.defaults },
    }
    setNodes(nds => [...nds, newNode])
  }, [rfInstance, setNodes])

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  // Coleta ancestrais (BFS reverso) de um node específico
  function ancestorsOf(nodeId: string): Node[] {
    const visited = new Set<string>()
    const queue = [nodeId]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      edges.filter(e => e.target === current).forEach(e => queue.push(e.source))
    }
    visited.delete(nodeId)
    return Array.from(visited).map(id => nodes.find(n => n.id === id)).filter(Boolean) as Node[]
  }

  // Determina readiness pra cada tipo de action
  function isActionReady(node: Node): { ready: boolean; hint?: string } {
    const a = ancestorsOf(node.id)
    if (node.type === 'generate') {
      const product = a.find(n => n.type === 'product')
      const avatar = a.find(n => n.type === 'avatar')
      const scene = a.find(n => n.type === 'scene')
      const settings = a.find(n => n.type === 'settings')
      const ok = product && avatar && scene && settings
        && (product.data as { productId?: string }).productId
        && (avatar.data as { avatarId?: string }).avatarId
        && ((scene.data as { scenarioId?: string; customPrompt?: string }).scenarioId || (scene.data as { customPrompt?: string }).customPrompt)
      return { ready: !!ok, hint: 'Conecte Produto + Influencer + Cena + Ajustes' }
    }
    if (node.type === 'edit-image' || node.type === 'video' || node.type === 'motion') {
      const image = a.find(n => n.type === 'image' || n.type === 'product' || n.type === 'avatar')
      const promptN = a.find(n => n.type === 'prompt')
      const hasImage = image && (image.data as { imageUrl?: string; productId?: string; avatarId?: string }).imageUrl
      const hasPrompt = promptN && ((promptN.data as { prompt?: string }).prompt || '').trim().length > 0
      return { ready: !!(hasImage && hasPrompt), hint: 'Conecte Imagem + Prompt' }
    }
    return { ready: false }
  }

  async function executeAction(node: Node) {
    const a = ancestorsOf(node.id)
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'generating', errorMessage: undefined } } : n))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      let endpoint = ''
      let payload: Record<string, unknown> = {}

      if (node.type === 'generate') {
        const product = a.find(n => n.type === 'product')!
        const avatar = a.find(n => n.type === 'avatar')!
        const scene = a.find(n => n.type === 'scene')!
        const settings = a.find(n => n.type === 'settings')!
        const pd = product.data as { productId?: string; productName?: string; imageUrl?: string }
        const ad = avatar.data as { avatarId?: string; imageUrl?: string; gender?: string }
        const sd = scene.data as { scenarioId?: string; scenarioName?: string; customPrompt?: string }
        const td = settings.data as { pose: string; style: string; enhancements: string[]; format: string; additionalInfo?: string }
        const sceneHint = sd.scenarioId
          ? SCENARIOS.find(s => s.id === sd.scenarioId)?.promptHint || sd.scenarioName
          : sd.customPrompt
        endpoint = 'generate-influencer-image'
        payload = {
          product_image: pd.imageUrl,
          avatar_image: ad.imageUrl,
          scene: sceneHint,
          pose: POSES.find(p => p.id === td.pose)?.name || td.pose,
          style: STYLES.find(s => s.id === td.style)?.name || td.style,
          enhancements: td.enhancements.map(e => ENHANCEMENTS.find(x => x.id === e)?.name).filter(Boolean).join(', '),
          format: FORMATS.find(f => f.id === td.format)?.id || td.format,
          additionalInfo: td.additionalInfo || '',
        }
      } else {
        // Actions baseados em Image+Prompt: edit-image / video / motion
        const image = a.find(n => n.type === 'image' || n.type === 'product' || n.type === 'avatar')!
        const promptN = a.find(n => n.type === 'prompt')!
        const imgUrl = (image.data as { imageUrl?: string }).imageUrl
        const promptText = (promptN.data as { prompt?: string }).prompt || ''
        if (node.type === 'edit-image') {
          endpoint = 'edit-image-inpaint'
          payload = { image_url: imgUrl, edit_prompt: promptText }
        } else if (node.type === 'video') {
          const mode = (node.data as { mode?: string }).mode || 'veo-lite'
          if (mode === 'grok') {
            endpoint = 'generate-grok-video'
            payload = { prompt: promptText, image_url: imgUrl }
          } else {
            endpoint = 'generate-veo-video'
            payload = { prompt: promptText, image_url: imgUrl, mode: mode === 'veo-fast' ? 'fast' : 'lite' }
          }
        } else if (node.type === 'motion') {
          endpoint = 'generate-motion-video'
          payload = { image_url: imgUrl, motion_prompt: promptText }
        }
      }

      const r = await fetch(`https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify(payload),
      })
      const data = await r.json()
      if (!r.ok || data?.error) throw new Error(data?.error || `Erro ${r.status}`)

      const resultUrl = data?.image_url || (data?.task_id ? undefined : data?.result)
      // Síncrono (image): tem image_url. Async (video/motion): só task_id, vai pra Histórico
      if (resultUrl) {
        applyCreditsFromResponse(data)
        setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'done', resultUrl } } : n))
        toast.success('Pronto!')
      } else if (data?.task_id) {
        applyCreditsFromResponse(data)
        setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'done', resultUrl: undefined, taskId: data.task_id } } : n))
        toast.success('Vídeo na fila — acompanhe em Boosters → Grok IA → Histórico')
      } else {
        throw new Error('Resposta inesperada')
      }
    } catch (err) {
      setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'error', errorMessage: (err as Error).message } } : n))
      toast.error('Erro: ' + (err as Error).message)
    }
  }

  // Injeta callbacks + readiness em todos os action nodes sempre que workflow mudar
  useEffect(() => {
    setNodes(nds => nds.map(n => {
      if (!ACTION_NODE_TYPES.has(n.type ?? '')) return n
      const { ready, hint } = isActionReady(n)
      return { ...n, data: { ...n.data, onExecute: () => executeAction(n), ready, readyHint: hint } }
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length, JSON.stringify(nodes.map(n => ({ id: n.id, data: n.data })))])

  // Persistência leve em localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vyral_lab_workflow')
    if (saved) {
      try {
        const { nodes: n, edges: e } = JSON.parse(saved)
        if (Array.isArray(n) && n.length > 0) { setNodes(n); setEdges(e || []) }
      } catch { /* ignore */ }
    }
  }, [setNodes, setEdges])

  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return
    const timeout = setTimeout(() => {
      try {
        const serializable = nodes.map(n => ({ ...n, data: Object.fromEntries(Object.entries(n.data).filter(([, v]) => typeof v !== 'function')) }))
        localStorage.setItem('vyral_lab_workflow', JSON.stringify({ nodes: serializable, edges }))
      } catch { /* ignore */ }
    }, 400)
    return () => clearTimeout(timeout)
  }, [nodes, edges])

  function clearCanvas() {
    if (!confirm('Limpar todo o workflow?')) return
    setNodes([])
    setEdges([])
    localStorage.removeItem('vyral_lab_workflow')
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white cursor-pointer">
          <ArrowLeft size={14} /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary-600/20 border border-primary-500/30 text-xs">
            <Coins size={12} className="text-neon" />
            <span className="text-neon font-semibold">{credits}</span>
          </div>
          <button onClick={clearCanvas} className="px-2 py-1 text-xs text-white/50 hover:text-red-400 cursor-pointer">Limpar</button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Influencer Lab</h1>
          <p className="text-sm text-white/50">Arraste nodes, conecte os pontos, execute o workflow</p>
        </div>
      </div>

      <div className="flex gap-3" style={{ height: 'calc(100vh - 240px)', minHeight: 600 }}>
        {/* Sidebar com nodes */}
        <aside className="w-48 bg-surface-300 border border-white/5 rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Arraste pra canvas</p>
          {NODE_LIBRARY.map(n => {
            const Icon = n.icon
            return (
              <div
                key={n.type}
                draggable
                onDragStart={e => onDragStart(e, n.type)}
                className="flex items-center gap-2 p-2 rounded-lg bg-surface-400 border border-white/10 cursor-grab active:cursor-grabbing hover:border-primary-500/40"
              >
                <Icon size={14} className={n.color} />
                <span className="text-xs text-white">{n.label}</span>
              </div>
            )
          })}
          <div className="pt-3 mt-3 border-t border-white/5">
            <p className="text-[9px] text-white/40 leading-relaxed">
              Arraste os nodes, conecte os pontos (⚪) saindo pra direita e chegando na esquerda do próximo. O nó Executar precisa ter Produto, Avatar, Cena e Ajustes conectados.
            </p>
          </div>
        </aside>

        {/* Canvas */}
        <div ref={wrapperRef} className="flex-1 bg-surface-400 rounded-xl border border-white/5 overflow-hidden" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            fitView
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#2a2a3a" />
            <Controls className="!bg-surface-300 !border-white/10" />
            <MiniMap className="!bg-surface-300" nodeColor="#8B5CF6" />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}

export function InfluencerLabPage() {
  return (
    <ReactFlowProvider>
      <InfluencerLabInner />
    </ReactFlowProvider>
  )
}
