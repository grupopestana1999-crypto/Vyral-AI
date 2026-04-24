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
    credits: 5,
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
    videoUrl: 'https://static.higgsfield.ai/explore/lipsync-studio.mp4',
    credits: 55,
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
    credits: 5,
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
    videoUrl: 'https://static.higgsfield.ai/explore/prompt-generator.mp4',
    credits: 0,
    tool: 'prompt_generator',
    edgeFunction: 'enhance-prompt',
    inputs: [
      { key: 'description', label: 'Descreva o que você quer criar', type: 'textarea', placeholder: 'Ex: mulher jovem segurando creme facial em banheiro iluminado', required: true, description: '5 gerações grátis por dia' },
      { key: 'type', label: 'Tipo', type: 'radio', options: [{ value: 'image', label: 'Imagem' }, { value: 'video', label: 'Vídeo' }] },
    ],
    resultType: 'text',
    isFree: true,
    locked: true,
  },
  {
    id: 'nano-banana',
    slug: 'nano-banana',
    title: 'Nano Banana Pro',
    description: 'Crie imagens incríveis com prompts de texto',
    videoUrl: 'https://static.higgsfield.ai/explore/nano-banana-pro-2.mp4',
    credits: 5,
    tool: 'nano_banana_pro',
    edgeFunction: 'generate-influencer-image',
    inputs: [
      { key: 'scene', label: 'Descreva a cena', type: 'textarea', placeholder: 'Ex: influencer em estúdio com iluminação profissional', required: true },
    ],
    resultType: 'image',
    locked: true,
  },
  {
    id: 'nano-banana-2',
    slug: 'nano-banana-2',
    title: 'Nano Banana 2',
    description: 'Geração avançada com referências e Google Search',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/bb9d59e1-0493-4031-a97d-27fc7f660c89.mp4',
    credits: 15,
    tool: 'nano_banana_2',
    edgeFunction: 'generate-nano-banana-2',
    inputs: [
      { key: 'prompt', label: 'Prompt', type: 'textarea', required: true },
      { key: 'reference_image', label: 'Imagem de referência (opcional)', type: 'image' },
    ],
    resultType: 'image',
    locked: true,
  },
  {
    id: 'veo-video',
    slug: 'veo',
    title: 'Veo 3.1',
    description: 'Vídeos ultra-realistas com áudio nativo',
    videoUrl: 'https://static.higgsfield.ai/explore/lipsync-studio.mp4',
    credits: 90,
    tool: 'veo_video',
    edgeFunction: 'generate-veo-video',
    inputs: [
      { key: 'prompt', label: 'Descrição do vídeo', type: 'textarea', placeholder: 'Ex: mulher dançando em sala moderna, 5 segundos', required: true },
      { key: 'image_url', label: 'Imagem inicial (opcional)', type: 'image' },
    ],
    resultType: 'queued',
    locked: true,
  },
  {
    id: 'motion-control',
    slug: 'motion',
    title: 'Imitar Movimento',
    description: 'Controle preciso de movimentos de personagens',
    videoUrl: 'https://static.higgsfield.ai/kling-motion-control-square.mp4',
    credits: 55,
    tool: 'motion_control',
    edgeFunction: 'generate-motion-video',
    inputs: [
      { key: 'image_url', label: 'Imagem do personagem', type: 'image', required: true },
      { key: 'motion_prompt', label: 'Movimento desejado', type: 'textarea', placeholder: 'Ex: acenar com a mão direita', required: true },
    ],
    resultType: 'queued',
    locked: true,
  },
  {
    id: 'human-engine',
    slug: 'human-engine',
    title: 'Human Engine',
    description: 'Transfira movimentos pra um personagem — imagem + descrição do movimento',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/16af5e9e-270f-4b0f-b1c2-0c448c5d31ef.mp4',
    credits: 35,
    tool: 'human_engine',
    edgeFunction: 'generate-motion-video',
    inputs: [
      { key: 'image_url', label: 'Imagem do personagem', type: 'image', required: true },
      { key: 'motion_prompt', label: 'Descreva o movimento desejado', type: 'textarea', placeholder: 'Ex: andando na rua olhando pra câmera e sorrindo', required: true },
    ],
    resultType: 'queued',
    locked: true,
  },
  {
    id: 'avatar-builder',
    slug: 'avatar',
    title: 'Avatar Builder',
    description: 'Crie influencers virtuais ultra-realistas direto no Studio IA',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/eeb5eb4f-f5a1-4462-8b10-a65e95c1332c.mp4',
    credits: 5,
    tool: 'studio_redirect',
    inputs: [],
    resultType: 'image',
    locked: true,
  },
  {
    id: 'kling3-video',
    slug: 'kling',
    title: 'Kling 3.0',
    description: 'Vídeos cinematográficos com áudio e multi-frame',
    videoUrl: 'https://static.higgsfield.ai/kling-3/kling-3.mp4',
    credits: 55,
    tool: 'kling_3',
    edgeFunction: 'generate-kling3-video',
    inputs: [
      { key: 'prompt', label: 'Prompt do vídeo', type: 'textarea', required: true },
      { key: 'image_url', label: 'Imagem inicial (opcional)', type: 'image' },
    ],
    resultType: 'queued',
    locked: true,
  },
  {
    id: 'skin-enhancer',
    slug: 'skin',
    title: 'Pele Ultra Realista',
    description: 'Aprimore texturas de pele com realismo extremo',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/fb84f803-64b0-4259-b9a3-b2fc57073da4.mp4',
    credits: 5,
    tool: 'skin_enhancer',
    edgeFunction: 'edit-image-inpaint',
    inputs: [
      { key: 'image_url', label: 'Imagem para aprimorar', type: 'image', required: true },
    ],
    resultType: 'image',
    locked: true,
  },
  {
    id: 'sora-remover',
    slug: 'sora',
    title: 'Sora Remover',
    description: 'Remova a marca d\'água dos vídeos Sora 2',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/7655f6d8-6f18-493f-9990-488c447b42de.mp4',
    credits: 20,
    tool: 'sora_remover',
    edgeFunction: 'sora-watermark-remover',
    inputs: [
      { key: 'video_url', label: 'URL do vídeo Sora', type: 'text', placeholder: 'Cole a URL do vídeo', required: true },
    ],
    resultType: 'queued',
    locked: true,
  },
]

export const BOOSTER_BY_SLUG = Object.fromEntries(BOOSTERS.map(b => [b.slug, b]))
