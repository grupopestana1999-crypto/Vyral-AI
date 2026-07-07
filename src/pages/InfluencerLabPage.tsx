import { useCallback, useEffect, useRef, useState } from 'react'
import { tryCapModal } from '../lib/handleGenerationError'
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
import { invokeRaw } from '../lib/invokeRaw'
import { ProductNode, AvatarNode, SceneNode, SettingsNode, GenerateNode, ImageNode, PromptNode, EditImageActionNode, GenerateVideoActionNode, MotionActionNode, ScriptNode, NODE_LIBRARY } from '../components/influencer-lab/nodes'
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
  script: ScriptNode,
}

const ACTION_NODE_TYPES = new Set(['generate', 'edit-image', 'video', 'motion', 'script'])

function InfluencerLabInner() {
  const navigate = useNavigate()
  const { subscription, user } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // E53: refs sempre atualizadas pra eliminar stale closure. Bug: Editar Imagem/Imitar
  // Movimento não achavam a imagem conectada por handle porque executeAction/ancestorsOf
  // liam nodes/edges de um closure antigo. Lendo da ref, sempre pega o estado fresco.
  const nodesRef = useRef<Node[]>(nodes)
  const edgesRef = useRef<Edge[]>(edges)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  // Escuta eventos de atualização vindos dos nodes (produto, avatar, cena, settings)
  useEffect(() => {
    function handler(e: Event) {
      const { id, data } = (e as CustomEvent).detail as { id: string; data: Record<string, unknown> }
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
    }
    window.addEventListener('lab-update-node', handler)
    return () => window.removeEventListener('lab-update-node', handler)
  }, [setNodes])

  // Escuta eventos de duplicar e apagar disparados pelos botões no header de cada node
  useEffect(() => {
    function dupHandler(e: Event) {
      const { id } = (e as CustomEvent).detail as { id: string }
      setNodes(nds => {
        const original = nds.find(n => n.id === id)
        if (!original) return nds
        // Strip funções/state runtime pra clone limpo
        const cleanData = Object.fromEntries(
          Object.entries(original.data || {}).filter(([k, v]) => typeof v !== 'function' && k !== 'status' && k !== 'resultUrl' && k !== 'errorMessage' && k !== 'taskId')
        )
        const newNode: Node = {
          ...original,
          id: `${original.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          position: { x: original.position.x + 40, y: original.position.y + 40 },
          data: cleanData,
          selected: false,
        }
        return [...nds, newNode]
      })
    }
    function delHandler(e: Event) {
      const { id } = (e as CustomEvent).detail as { id: string }
      setNodes(nds => nds.filter(n => n.id !== id))
      setEdges(eds => eds.filter(e => e.source !== id && e.target !== id))
    }
    window.addEventListener('lab-duplicate-node', dupHandler)
    window.addEventListener('lab-delete-node', delHandler)
    return () => {
      window.removeEventListener('lab-duplicate-node', dupHandler)
      window.removeEventListener('lab-delete-node', delHandler)
    }
  }, [setNodes, setEdges])

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

  // Coleta ancestrais (BFS reverso) de um node específico.
  // E53: lê de nodesRef/edgesRef (estado fresco) em vez do closure.
  function ancestorsOf(nodeId: string): Node[] {
    const curEdges = edgesRef.current
    const curNodes = nodesRef.current
    const visited = new Set<string>()
    const queue = [nodeId]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      curEdges.filter(e => e.target === current).forEach(e => queue.push(e.source))
    }
    visited.delete(nodeId)
    return Array.from(visited).map(id => curNodes.find(n => n.id === id)).filter(Boolean) as Node[]
  }

  // Determina readiness pra cada tipo de action
  function isActionReady(node: Node): { ready: boolean; hint?: string } {
    const a = ancestorsOf(node.id)
    if (node.type === 'generate') {
      // E52b: Settings agora é OPCIONAL (cliente pediu). Se ausente, usa defaults em executeAction.
      const product = a.find(n => n.type === 'product')
      const avatar = a.find(n => n.type === 'avatar')
      const scene = a.find(n => n.type === 'scene')
      const ok = product && avatar && scene
        && (product.data as { productId?: string; imageUrl?: string }).imageUrl
        && (avatar.data as { avatarId?: string; imageUrl?: string }).imageUrl
        && ((scene.data as { scenarioId?: string; customPrompt?: string }).scenarioId || (scene.data as { customPrompt?: string }).customPrompt)
      return { ready: !!ok, hint: 'Conecte Produto + Influencer + Cena (Ajustes é opcional)' }
    }
    // E52b+E52d: helper pra extrair imageUrl de qualquer ancestor relevante
    // (input nodes OU action nodes que produzem imagem — Gerar Imagem, Editar Imagem)
    function findAncestorImg(): string | undefined {
      for (const n of a) {
        if (n.type === 'image' || n.type === 'product' || n.type === 'avatar') {
          const u = (n.data as { imageUrl?: string }).imageUrl
          if (u) return u
        }
        if (n.type === 'generate' || n.type === 'edit-image') {
          const u = (n.data as { resultUrl?: string }).resultUrl
          if (u) return u
        }
      }
      return undefined
    }
    if (node.type === 'edit-image') {
      // Self-contained: imagem upload no próprio node (selfImageUrl) ou via conexão
      const selfImg = (node.data as { selfImageUrl?: string }).selfImageUrl
      const editPrompt = ((node.data as { editPrompt?: string }).editPrompt || '').trim()
      const editTemplate = (node.data as { editTemplate?: string }).editTemplate
      const ancestorImg = findAncestorImg()
      const hasImage = !!(selfImg || ancestorImg)
      const hasInstruction = !!editTemplate || editPrompt.length > 0
      return { ready: hasImage && hasInstruction, hint: 'Conecte uma imagem ou faça upload + selecione edição' }
    }
    if (node.type === 'video') {
      // Self-contained: prompt no próprio node + imagem (self ou conectada)
      const selfImg = (node.data as { selfImageUrl?: string }).selfImageUrl
      const ancestorImg = findAncestorImg()
      const promptN = a.find(n => n.type === 'prompt')
      const ownPrompt = ((node.data as { ownPrompt?: string }).ownPrompt || '').trim()
      const ancestorPrompt = promptN && ((promptN.data as { prompt?: string }).prompt || '').trim()
      const hasImage = !!(selfImg || ancestorImg)
      const hasPrompt = !!(ownPrompt || ancestorPrompt)
      return { ready: hasImage && hasPrompt, hint: 'Conecte uma imagem + cena/prompt' }
    }
    if (node.type === 'motion') {
      // Self-contained: vídeo de referência no próprio node + imagem do personagem
      const selfImg = (node.data as { selfImageUrl?: string }).selfImageUrl
      const ancestorImg = findAncestorImg()
      const refVideo = (node.data as { referenceVideoUrl?: string }).referenceVideoUrl
      return { ready: !!(selfImg || ancestorImg) && !!refVideo, hint: 'Conecte uma imagem + suba vídeo de referência' }
    }
    if (node.type === 'script') {
      // Self-contained: precisa só de productName preenchido
      const productName = ((node.data as { productName?: string }).productName || '').trim()
      return { ready: productName.length > 0, hint: 'Preencha o nome do produto' }
    }
    return { ready: false }
  }

  async function executeAction(nodeId: string) {
    // E53: resolve o node fresco da ref (não do closure) pra pegar dados/conexões atuais
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (!node) return
    const a = ancestorsOf(node.id)
    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'generating', errorMessage: undefined } } : n))

    try {
      // E52b: removido `await supabase.auth.getSession()` defensivo — invokeRaw
      // (abaixo) lê token do localStorage e não precisa de refresh manual. O
      // getSession era exatamente o padrão que pendurava em sessões longas (E24).

      let endpoint = ''
      let payload: Record<string, unknown> = {}

      if (node.type === 'generate') {
        const product = a.find(n => n.type === 'product')!
        const avatar = a.find(n => n.type === 'avatar')!
        const scene = a.find(n => n.type === 'scene')!
        // E52b: Settings é opcional. Se ausente, usa defaults razoáveis.
        const settings = a.find(n => n.type === 'settings')
        const pd = product.data as { productId?: string; productName?: string; imageUrl?: string }
        const ad = avatar.data as { avatarId?: string; imageUrl?: string; gender?: string }
        const sd = scene.data as { scenarioId?: string; scenarioName?: string; customPrompt?: string }
        const td = (settings?.data ?? {}) as { pose?: string; style?: string; enhancements?: string[]; format?: string; additionalInfo?: string }
        const sceneHint = sd.scenarioId
          ? SCENARIOS.find(s => s.id === sd.scenarioId)?.promptHint || sd.scenarioName
          : sd.customPrompt
        endpoint = 'generate-influencer-image'
        payload = {
          product_image: pd.imageUrl,
          avatar_image: ad.imageUrl,
          scene: sceneHint,
          pose: POSES.find(p => p.id === (td.pose ?? 'frente'))?.name || td.pose || 'Frente',
          style: STYLES.find(s => s.id === (td.style ?? 'casual'))?.name || td.style || 'Casual',
          enhancements: (td.enhancements ?? []).map(e => ENHANCEMENTS.find(x => x.id === e)?.name).filter(Boolean).join(', '),
          format: FORMATS.find(f => f.id === (td.format ?? '9:16'))?.id || td.format || '9:16',
          additionalInfo: td.additionalInfo || '',
        }
      } else if (node.type === 'script') {
        // Gerar Roteiro: chama enhance-prompt com structured input
        const sd = node.data as { productName?: string; tipo?: string; estilo?: string; acao?: string; camera?: string; dialogo?: string; idioma?: string }
        const description = [
          `Produto: ${sd.productName || ''} (Tipo: ${sd.tipo || 'Outro'})`,
          `Estilo de vídeo: ${sd.estilo || 'UGC'}`,
          sd.acao ? `Ação: ${sd.acao}` : '',
          sd.camera ? `Câmera: ${sd.camera}` : '',
          sd.dialogo?.trim() ? `Diálogo sugerido: ${sd.dialogo.trim()}` : '',
          `Idioma: ${sd.idioma || 'Português (BR)'}`,
        ].filter(Boolean).join('\n')
        endpoint = 'enhance-prompt'
        payload = { description, type: 'video', style: sd.estilo || 'ugc' }
      } else {
        // Actions self-contained: edit-image / video / motion. Aceitam dados próprios OU conectados.
        // E52b+E52d: também aceita conectar de Gerar Imagem OU Editar Imagem (lê resultUrl) — permite encadeamento.
        const ancestorImg = a.find(n => {
          if (n.type === 'image' || n.type === 'product' || n.type === 'avatar') return true
          if ((n.type === 'generate' || n.type === 'edit-image') && (n.data as { resultUrl?: string }).resultUrl) return true
          return false
        })
        const promptN = a.find(n => n.type === 'prompt')
        const nd = node.data as { selfImageUrl?: string; selfRefImageUrl?: string; ownPrompt?: string; editPrompt?: string; editTemplate?: string; referenceVideoUrl?: string; mode?: string }
        const ancestorImgUrl = (ancestorImg?.type === 'generate' || ancestorImg?.type === 'edit-image')
          ? (ancestorImg.data as { resultUrl?: string }).resultUrl
          : (ancestorImg?.data as { imageUrl?: string } | undefined)?.imageUrl
        const imgUrl = nd.selfImageUrl || ancestorImgUrl
        const ownPrompt = nd.ownPrompt?.trim()
        const ancestorPrompt = (promptN?.data as { prompt?: string } | undefined)?.prompt?.trim()
        const promptText = ownPrompt || ancestorPrompt || ''

        if (node.type === 'edit-image') {
          endpoint = 'edit-image-inpaint'
          // Constroi prompt combinando template selecionado + detalhes extras
          const TEMPLATE_PROMPTS: Record<string, string> = {
            roupa: 'Substitua a roupa da pessoa por outra peça moderna, mantendo o estilo casual e o ambiente. Mantenha o rosto e a pose iguais.',
            cenario: 'Substitua o fundo/cenário da imagem por um novo ambiente, mantendo a pessoa e o produto exatamente iguais e bem iluminados.',
            influencer: 'Substitua a pessoa por outra(o) influencer com etnia/aparência diferentes, mantendo a roupa, pose e ambiente iguais.',
            pose: 'Mude a pose da pessoa pra uma posição mais natural e dinâmica, mantendo o rosto, roupa e cenário iguais.',
          }
          const templatePrompt = nd.editTemplate ? TEMPLATE_PROMPTS[nd.editTemplate] : ''
          const finalPrompt = [templatePrompt, nd.editPrompt?.trim()].filter(Boolean).join(' ')
          // E52b: passa reference_images quando há foto de referência (necessário pra Trocar
          // Influencer/Pose funcionar — backend v37 espera Replicate face-swap/controlnet-pose)
          const referenceImages = nd.selfRefImageUrl ? [nd.selfRefImageUrl] : []
          payload = { image_url: imgUrl, edit_prompt: finalPrompt || 'Aprimorar a imagem', template_id: nd.editTemplate, reference_images: referenceImages }
        } else if (node.type === 'video') {
          // E52: alinhado com Avatar Vídeos pós-E48d — backend espera resolution: 720p|1080p
          const mode = nd.mode || 'veo-720p'
          if (mode === 'grok') {
            endpoint = 'generate-grok-video'
            payload = { prompt: promptText, image_url: imgUrl }
          } else {
            endpoint = 'generate-veo-video'
            payload = { prompt: promptText, image_url: imgUrl, resolution: mode === 'veo-1080p' ? '1080p' : '720p' }
          }
        } else if (node.type === 'motion') {
          endpoint = 'generate-motion-video'
          payload = { image_url: imgUrl, reference_video_url: nd.referenceVideoUrl, motion_prompt: promptText }
        }
      }

      // E52b: invokeRaw em vez de supabase.functions.invoke — invoke pendura
      // silenciosamente em sessões longas (validado em E24/E31). Cliente reportou
      // Lab nodes "carregando eternamente" — root cause confirmado.
      type LabResponse = { prompt?: string; image_url?: string; task_id?: string; result?: string; error?: string; credits_remaining?: number }
      const invokePromise = invokeRaw<LabResponse>(endpoint, payload)
        .then(r => ({ kind: 'response' as const, data: r.data, error: r.error }))
      const timeoutPromise = new Promise<{ kind: 'timeout' }>(res => setTimeout(() => res({ kind: 'timeout' }), 180_000))
      const result = await Promise.race([invokePromise, timeoutPromise])
      if (result.kind === 'timeout') throw new Error('Tempo excedido. A geração pode estar em andamento — tente de novo daqui a pouco.')
      const { data, error: invokeError } = result
      if (invokeError) throw invokeError
      if (data?.error) { if (tryCapModal(data)) return; throw new Error(data.error) }

      // Script node retorna texto puro (data.prompt). Outros retornam image_url ou task_id.
      if (node.type === 'script' && typeof data?.prompt === 'string') {
        applyCreditsFromResponse(data)
        const promptText = data.prompt
        setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'done', resultText: promptText } } : n))
        toast.success('Roteiro gerado!')
      } else {
        const resultUrl = data?.image_url || (data?.task_id ? undefined : data?.result)
        if (resultUrl) {
          applyCreditsFromResponse(data)
          setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'done', resultUrl } } : n))
          toast.success('Pronto!')
        } else if (data?.task_id) {
          applyCreditsFromResponse(data)
          const taskId = data.task_id
          // E52c: status 'pending' (não 'done') enquanto vídeo está sendo gerado.
          // Realtime subscription abaixo vai atualizar pra 'done' + resultUrl quando
          // backend marcar completed no credit_usage_log.
          setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'pending', resultUrl: undefined, taskId } } : n))
          toast.success('Vídeo na fila — vai aparecer no node em 1-5 min')
        } else {
          throw new Error('Resposta inesperada')
        }
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
      // E53: passa só o id; executeAction resolve o node fresco da ref no clique (sem stale closure)
      return { ...n, data: { ...n.data, onExecute: () => executeAction(n.id), ready, readyHint: hint } }
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length, JSON.stringify(nodes.map(n => ({ id: n.id, data: n.data })))])

  // E52c: Realtime + polling fallback pra nodes com taskId pending (video/motion async).
  // Quando check-kie-task atualiza credit_usage_log pra completed, encontra o node
  // que tem esse external_task_id e seta resultUrl + status='done' direto no canvas.
  useEffect(() => {
    if (!user?.email) return
    const pendingTaskIds = nodes
      .filter(n => (n.data as { status?: string }).status === 'pending' && (n.data as { taskId?: string }).taskId)
      .map(n => (n.data as { taskId?: string }).taskId)
      .filter(Boolean) as string[]
    if (pendingTaskIds.length === 0) return

    // Realtime: instantâneo quando o backend marca completed
    const channel = supabase.channel(`lab-tasks-${user.email}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'credit_usage_log',
        filter: `user_email=eq.${user.email}`,
      }, (payload) => {
        const row = payload.new as { external_task_id?: string; result_url?: string; status?: string }
        if (!row?.external_task_id || !pendingTaskIds.includes(row.external_task_id)) return
        if (row.status === 'completed' && row.result_url) {
          setNodes(nds => nds.map(n => {
            const nd = n.data as { taskId?: string; status?: string }
            if (nd.taskId === row.external_task_id) {
              return { ...n, data: { ...n.data, status: 'done', resultUrl: row.result_url } }
            }
            return n
          }))
          toast.success('Vídeo pronto!')
        } else if (row.status === 'failed') {
          setNodes(nds => nds.map(n => {
            const nd = n.data as { taskId?: string }
            if (nd.taskId === row.external_task_id) {
              return { ...n, data: { ...n.data, status: 'error', errorMessage: 'Geração falhou' } }
            }
            return n
          }))
        }
      })
      .subscribe()

    // Polling fallback (caso Realtime caia) a cada 15s: chama check-kie-task pra cada pending
    const poll = setInterval(async () => {
      const stillPending = nodes
        .filter(n => (n.data as { status?: string }).status === 'pending' && (n.data as { taskId?: string }).taskId)
        .map(n => ({ id: n.id, taskId: (n.data as { taskId?: string }).taskId!, type: n.type }))
      if (stillPending.length === 0) return
      for (const p of stillPending) {
        const toolName = p.type === 'video' ? 'veo_video' : p.type === 'motion' ? 'motion_control' : ''
        try {
          await invokeRaw('check-kie-task', { task_id: p.taskId, tool_name: toolName })
        } catch { /* silent */ }
      }
    }, 15_000)

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [user?.email, nodes, setNodes])

  // Carrega workflow salvo (ou preload do Super Vyral, que tem precedência)
  useEffect(() => {
    // E54: Super Vyral grava um workflow pronto em sessionStorage. Se existir, carrega
    // ele (substituindo o canvas) e remove a chave. Senão, carrega o último salvo.
    try {
      const preload = sessionStorage.getItem('vyral_lab_preload')
      if (preload) {
        sessionStorage.removeItem('vyral_lab_preload')
        const { nodes: n, edges: e } = JSON.parse(preload)
        if (Array.isArray(n) && n.length > 0) {
          setNodes(n); setEdges(e || [])
          toast.success('Workflow carregado! Suba sua imagem e gere cada etapa.')
          return
        }
      }
    } catch { /* ignore */ }
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
              Arraste os nodes, conecte os pontos (⚪) saindo pra direita e chegando na esquerda do próximo. Gerar Imagem precisa de Produto + Avatar + Cena (Ajustes é opcional). Double-click numa ligação pra cancelar.
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
            // E52b: cliente pediu pra cancelar uma ligação dando double-click nela.
            onEdgeDoubleClick={(_, edge) => setEdges(eds => eds.filter(e => e.id !== edge.id))}
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
