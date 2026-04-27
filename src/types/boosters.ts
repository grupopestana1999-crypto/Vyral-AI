export interface BoosterDef {
  id: string
  slug: string
  title: string
  description: string
  videoUrl: string
  credits: number
  tool: keyof typeof import('./credits').TOOL_CREDITS | 'studio_redirect' | 'influencer_lab'
  edgeFunction?: string
  inputs: BoosterInput[]
  resultType: 'text' | 'image' | 'video' | 'queued'
  isFree?: boolean
  locked?: boolean
  emptyStateText?: string
}

export interface BoosterInput {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'video' | 'radio'
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  description?: string
}

// 13 boosters com vídeos de preview da iaTikShop CDN
export const BOOSTERS: BoosterDef[] = [
  {
    id: 'influencer-lab',
    slug: 'influencer-lab',
    title: 'Influencer Lab',
    description: 'Workflow visual por nodes pra criar imagens UGC com influencers virtuais',
    videoUrl: 'https://static.higgsfield.ai/explore/soul-character.mp4',
    credits: 1,
    tool: 'influencer_lab',
    inputs: [],
    resultType: 'image',
    isFree: false,
  },
  {
    id: 'grok-video',
    slug: 'grok',
    title: 'Grok IA',
    description: 'Transforme imagens em vídeos com Grok AI',
    videoUrl: 'https://mdueuksfunifyxfqpmdv.supabase.co/storage/v1/object/public/public-media/boosters/grok-preview.png',
    credits: 5,
    tool: 'grok_video',
    edgeFunction: 'generate-grok-video',
    inputs: [
      { key: 'prompt', label: 'Descreva o vídeo que deseja criar', type: 'textarea', placeholder: 'Ex: pessoa segurando o produto e sorrindo pra câmera', required: true },
      { key: 'image_url', label: 'Imagem de referência', type: 'image', required: true },
    ],
    resultType: 'queued',
    emptyStateText: 'Crie vídeos a partir de uma imagem usando o Grok IA',
  },
  {
    id: 'image-edit',
    slug: 'edit-image',
    title: 'Editar Imagem',
    description: 'Substitua objetos em imagens com IA',
    videoUrl: 'https://static.higgsfield.ai/explore/Edit-image-video-inpaint.mp4',
    credits: 1,
    tool: 'edit_image',
    edgeFunction: 'edit-image-inpaint',
    inputs: [
      { key: 'image_url', label: 'Imagem original', type: 'image', required: true },
      { key: 'edit_prompt', label: 'O que você quer editar?', type: 'textarea', placeholder: 'Ex: trocar fundo por praia ao entardecer', required: true },
      { key: 'mask_prompt', label: 'Área a editar (opcional)', type: 'text', placeholder: 'Ex: fundo' },
    ],
    resultType: 'image',
  },
  {
    id: 'prompt-generator',
    slug: 'prompt',
    title: 'Gerador de Prompt',
    description: 'Comandos JSON otimizados para geração de imagem/vídeo',
    videoUrl: 'https://mdueuksfunifyxfqpmdv.supabase.co/storage/v1/object/public/public-media/boosters/prompt-preview.png',
    credits: 0,
    tool: 'prompt_generator',
    edgeFunction: 'enhance-prompt',
    inputs: [
      { key: 'description', label: 'Descreva o que você quer criar', type: 'textarea', placeholder: 'Ex: mulher jovem segurando creme facial em banheiro iluminado', required: true, description: '10 gerações grátis (vida toda) · depois 1 crédito por uso' },
      { key: 'type', label: 'Tipo', type: 'radio', options: [{ value: 'image', label: 'Imagem' }, { value: 'video', label: 'Vídeo' }] },
    ],
    resultType: 'text',
    isFree: true,
  },
  {
    id: 'nano-banana-2',
    slug: 'nano-banana-2',
    title: 'Nano Banana 2',
    description: 'Geração avançada com referências e Google Search',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/bb9d59e1-0493-4031-a97d-27fc7f660c89.mp4',
    credits: 5,
    tool: 'nano_banana_2',
    edgeFunction: 'generate-nano-banana-2',
    inputs: [
      { key: 'prompt', label: 'Prompt', type: 'textarea', required: true },
      { key: 'reference_image', label: 'Imagem de referência (opcional)', type: 'image' },
    ],
    resultType: 'image',
  },
  {
    id: 'veo-video',
    slug: 'veo',
    title: 'Veo 3.1',
    description: 'Vídeos ultra-realistas com áudio nativo (Lite 5 / Fast 8)',
    videoUrl: 'https://mdueuksfunifyxfqpmdv.supabase.co/storage/v1/object/public/public-media/boosters/veo-preview.png',
    credits: 5,
    tool: 'veo_video',
    edgeFunction: 'generate-veo-video',
    inputs: [
      { key: 'prompt', label: 'Descrição do vídeo', type: 'textarea', placeholder: 'Ex: mulher dançando em sala moderna, 5 segundos', required: true },
      { key: 'image_url', label: 'Imagem inicial (opcional)', type: 'image' },
      { key: 'mode', label: 'Qualidade', type: 'radio', options: [{ value: 'lite', label: 'Lite — 720p (5 créd)' }, { value: 'fast', label: 'Fast — 720p (8 créd)' }] },
    ],
    resultType: 'queued',
  },
  {
    id: 'motion-control',
    slug: 'motion',
    title: 'Controle de Movimento',
    description: 'Kling 3.0 video-to-video: replica movimentos de um vídeo de referência',
    videoUrl: 'https://static.higgsfield.ai/kling-motion-control-square.mp4',
    credits: 30,
    tool: 'motion_control',
    edgeFunction: 'generate-motion-video',
    inputs: [
      { key: 'image_url', label: 'Imagem do personagem', type: 'image', required: true },
      { key: 'motion_prompt', label: 'Movimento desejado', type: 'textarea', placeholder: 'Ex: acenar com a mão direita', required: true },
    ],
    resultType: 'queued',
  },
  {
    id: 'kling3-video',
    slug: 'kling',
    title: 'Kling 3.0',
    description: 'Vídeos cinematográficos com áudio e multi-frame',
    videoUrl: 'https://static.higgsfield.ai/kling-3/kling-3.mp4',
    credits: 30,
    tool: 'kling_3',
    edgeFunction: 'generate-kling3-video',
    inputs: [
      { key: 'prompt', label: 'Prompt do vídeo', type: 'textarea', required: true },
      { key: 'image_url', label: 'Imagem inicial (opcional)', type: 'image' },
    ],
    resultType: 'queued',
  },
]

export const BOOSTER_BY_SLUG = Object.fromEntries(BOOSTERS.map(b => [b.slug, b]))
