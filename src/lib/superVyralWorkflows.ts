import type { Node, Edge } from '@xyflow/react'

// E54: Workflows prontos do Super Vyral. Cada um é um arranjo de nodes do Influencer
// Lab que o cliente desenhou. Ao escolher um, gravamos em sessionStorage e o Lab carrega.
// A execução acontece no Lab (node a node) — é o fluxo "em massa" do cliente.

export interface SuperVyralWorkflow {
  id: string
  title: string
  description: string
  emoji: string
  chain: string // preview textual da cadeia
  build: () => { nodes: Node[]; edges: Edge[] }
}

// Helpers de posição: Imagem à esquerda, action nodes empilhados à direita
const IMG_POS = { x: 60, y: 360 }
const ACTION_X = 460
const ACTION_Y = [40, 320, 600, 880]

function imageNode(id: string): Node {
  return { id, type: 'image', position: IMG_POS, data: {} }
}

function editNodes(prefix: string, template: 'cenario' | 'roupa' | 'pose', count: number): Node[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${prefix}-edit-${i + 1}`,
    type: 'edit-image',
    position: { x: ACTION_X, y: ACTION_Y[i] ?? (40 + i * 280) },
    data: { status: 'idle', editTemplate: template },
  }))
}

function edgesFromImage(imgId: string, targets: string[]): Edge[] {
  return targets.map((t, i) => ({ id: `e-${imgId}-${t}-${i}`, source: imgId, target: t, animated: true }))
}

export const SUPER_VYRAL_WORKFLOWS: SuperVyralWorkflow[] = [
  {
    id: 'cenarios_massa',
    title: 'Trocar cenários em massa',
    description: 'Suba uma foto e gere várias versões dela em cenários diferentes de uma vez.',
    emoji: '🌅',
    chain: 'Imagem → 4× Trocar Cenário',
    build: () => {
      const img = imageNode('sv1-img')
      const edits = editNodes('sv1', 'cenario', 4)
      return { nodes: [img, ...edits], edges: edgesFromImage(img.id, edits.map(e => e.id)) }
    },
  },
  {
    id: 'roupas_massa',
    title: 'Trocar roupas em massa',
    description: 'Suba uma foto e gere o mesmo personagem com várias roupas diferentes.',
    emoji: '👕',
    chain: 'Imagem → 4× Trocar Roupa',
    build: () => {
      const img = imageNode('sv2-img')
      const edits = editNodes('sv2', 'roupa', 4)
      return { nodes: [img, ...edits], edges: edgesFromImage(img.id, edits.map(e => e.id)) }
    },
  },
  {
    id: 'videos_massa',
    title: 'Criando vídeos em massa',
    description: 'Suba uma foto e gere vídeos a partir dela — 1 vídeo IA + 4 imitações de movimento.',
    emoji: '🎬',
    chain: 'Imagem → Gerar Vídeo + 4× Imitar Movimento',
    build: () => {
      const img = imageNode('sv3-img')
      const video: Node = { id: 'sv3-video', type: 'video', position: { x: ACTION_X, y: 0 }, data: { status: 'idle', mode: 'veo-720p' } }
      const motions: Node[] = Array.from({ length: 4 }).map((_, i) => ({
        id: `sv3-motion-${i + 1}`,
        type: 'motion',
        position: { x: ACTION_X, y: 260 + i * 260 },
        data: { status: 'idle' },
      }))
      const targets = [video.id, ...motions.map(m => m.id)]
      return { nodes: [img, video, ...motions], edges: edgesFromImage(img.id, targets) }
    },
  },
  {
    id: 'poses_massa',
    title: 'Criando influencers de IA em várias poses',
    description: 'Suba uma foto do influencer e gere ele em várias poses diferentes.',
    emoji: '🤸',
    chain: 'Imagem → 4× Trocar Pose',
    build: () => {
      const img = imageNode('sv4-img')
      const edits = editNodes('sv4', 'pose', 4)
      return { nodes: [img, ...edits], edges: edgesFromImage(img.id, edits.map(e => e.id)) }
    },
  },
]

export const LAB_PRELOAD_KEY = 'vyral_lab_preload'
