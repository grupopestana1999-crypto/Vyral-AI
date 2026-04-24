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
import { ProductNode, AvatarNode, SceneNode, SettingsNode, GenerateNode, NODE_LIBRARY } from '../components/influencer-lab/nodes'
import { POSES, STYLES, FORMATS, ENHANCEMENTS, SCENARIOS } from '../types/studio'

const nodeTypes = {
  product: ProductNode,
  avatar: AvatarNode,
  scene: SceneNode,
  settings: SettingsNode,
  generate: GenerateNode,
}

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

  // Resolver o workflow: pegar nó Generate, verificar se tem product/avatar/scene/settings conectados
  function resolveWorkflow() {
    const genNode = nodes.find(n => n.type === 'generate')
    if (!genNode) return null

    const inEdges = edges.filter(e => e.target === genNode.id)
    const connectedNodes = inEdges.map(e => nodes.find(n => n.id === e.source)).filter(Boolean) as Node[]

    const product = connectedNodes.find(n => n.type === 'product')
    const avatar = connectedNodes.find(n => n.type === 'avatar')
    const scene = connectedNodes.find(n => n.type === 'scene')
    const settings = connectedNodes.find(n => n.type === 'settings')

    // Seguir a cadeia ancestral: generate pode ter só settings, settings tem scene, scene tem avatar, avatar tem product.
    // Pra simplificar MVP: faz BFS reverso a partir do generate pra coletar todos os ancestrais.
    const visited = new Set<string>()
    const queue = [genNode.id]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      edges.filter(e => e.target === current).forEach(e => queue.push(e.source))
    }
    const ancestors = Array.from(visited).map(id => nodes.find(n => n.id === id)).filter(Boolean) as Node[]

    const ancestorProduct = product || ancestors.find(n => n.type === 'product')
    const ancestorAvatar = avatar || ancestors.find(n => n.type === 'avatar')
    const ancestorScene = scene || ancestors.find(n => n.type === 'scene')
    const ancestorSettings = settings || ancestors.find(n => n.type === 'settings')

    return {
      product: ancestorProduct,
      avatar: ancestorAvatar,
      scene: ancestorScene,
      settings: ancestorSettings,
      generateNodeId: genNode.id,
    }
  }

  const resolved = resolveWorkflow()
  const ready = !!(resolved?.product && resolved?.avatar && resolved?.scene && resolved?.settings
    && (resolved.product.data as { productId?: string }).productId
    && (resolved.avatar.data as { avatarId?: string }).avatarId
    && ((resolved.scene.data as { scenarioId?: string; customPrompt?: string }).scenarioId || (resolved.scene.data as { customPrompt?: string }).customPrompt))

  async function executeWorkflow() {
    if (!resolved) return
    if (!ready) {
      toast.error('Conecte todos os nodes: Produto + Avatar + Cena + Ajustes ao nó Executar')
      return
    }

    // Atualiza node Generate pra status = generating
    setNodes(nds => nds.map(n => n.id === resolved.generateNodeId ? { ...n, data: { ...n.data, status: 'generating' } } : n))

    try {
      const pd = resolved.product!.data as { productId?: string; productName?: string; imageUrl?: string }
      const ad = resolved.avatar!.data as { avatarId?: string; imageUrl?: string; gender?: string }
      const sd = resolved.scene!.data as { scenarioId?: string; scenarioName?: string; customPrompt?: string }
      const td = resolved.settings!.data as { pose: string; style: string; enhancements: string[]; format: string; additionalInfo?: string }

      const sceneHint = sd.scenarioId
        ? SCENARIOS.find(s => s.id === sd.scenarioId)?.promptHint || sd.scenarioName
        : sd.customPrompt

      const poseName = POSES.find(p => p.id === td.pose)?.name || td.pose
      const styleName = STYLES.find(s => s.id === td.style)?.name || td.style
      const enhancementsNames = td.enhancements.map(e => ENHANCEMENTS.find(x => x.id === e)?.name).filter(Boolean).join(', ')
      const formatId = FORMATS.find(f => f.id === td.format)?.id || td.format

      const payload = {
        product_id: pd.productId,
        product_name: pd.productName,
        product_image_url: pd.imageUrl,
        avatar_id: ad.avatarId,
        avatar_image_url: ad.imageUrl,
        avatar_gender: ad.gender,
        scene: sceneHint,
        pose: poseName,
        style: styleName,
        enhancements: enhancementsNames,
        format: formatId,
        additionalInfo: td.additionalInfo || '',
      }

      const { data, error: fnError } = await supabase.functions.invoke('generate-influencer-image', { body: payload })
      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)

      const outUrl = data?.result || data?.image_url
      if (!outUrl) throw new Error('Resposta inesperada da IA')

      setNodes(nds => nds.map(n => n.id === resolved.generateNodeId ? { ...n, data: { ...n.data, status: 'done', resultUrl: outUrl } } : n))
      toast.success('Workflow executado!')
    } catch (err) {
      setNodes(nds => nds.map(n => n.id === resolved.generateNodeId ? { ...n, data: { ...n.data, status: 'error', errorMessage: (err as Error).message } } : n))
      toast.error('Erro: ' + (err as Error).message)
    }
  }

  // Injeta callbacks no node Generate sempre que workflow mudar
  useEffect(() => {
    setNodes(nds => nds.map(n => n.type === 'generate' ? { ...n, data: { ...n.data, onExecute: executeWorkflow, ready } } : n))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, nodes.length, edges.length])

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
