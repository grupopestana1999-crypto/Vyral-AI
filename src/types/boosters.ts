export interface BoosterDef {
  id: string
  slug: string
  title: string
  description: string
  videoUrl: string
  /** Custo de referência (mostrado no card). Pra cobrança por segundo, usar `pricingHint` em vez disso. */
  credits: number
  /** Texto curto sobre cobrança quando não é fixa, ex: "2cr/s" ou "10cr/s com áudio". */
  pricingHint?: string
  /** Identificador do tool pra logging (`credit_usage_log.tool_name`, `api_logs.function_name`). */
  tool: string
  edgeFunction?: string
  inputs: BoosterInput[]
  resultType: 'text' | 'image' | 'video' | 'audio' | 'queued'
  isFree?: boolean
  /** Locked = aparece com lock overlay e modal "em breve" / "upgrade plano" no click. */
  locked?: boolean
  /** Plano mínimo pra desbloquear esse booster. Sem valor = qualquer plano pago acessa. */
  minPlan?: 'starter' | 'creator' | 'pro'
  emptyStateText?: string
}

export interface BoosterInput {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'video' | 'audio' | 'radio' | 'url'
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  description?: string
}

// 11 boosters na ordem definida pelo cliente em PDF "Pontuações Finais Vyral AI" (2026-04-27).
// Removidos: Gerador de Prompt standalone, Nano Banana 2, Human Engine.
export const BOOSTERS: BoosterDef[] = [
  // 01 - Creator+
  {
    id: 'influencer-lab',
    slug: 'influencer-lab',
    title: 'Influencer Lab',
    description: 'Workflow visual por nodes pra criar imagens UGC com influencers virtuais',
    videoUrl: 'https://static.higgsfield.ai/explore/soul-character.mp4',
    credits: 2,
    tool: 'influencer_lab',
    minPlan: 'creator',
    inputs: [],
    resultType: 'image',
    isFree: false,
  },
  // 02 - Starter+
  {
    id: 'image-edit',
    slug: 'edit-image',
    title: 'Editar Imagem',
    description: 'Edite imagens com IA: troque roupa, cenário, influencer ou pose',
    videoUrl: 'https://static.higgsfield.ai/explore/Edit-image-video-inpaint.mp4',
    credits: 2,
    tool: 'edit_image',
    edgeFunction: 'edit-image-inpaint',
    minPlan: 'starter',
    inputs: [],
    resultType: 'image',
  },
  // 03 - Pro
  {
    id: 'avatar-video',
    slug: 'avatar-video',
    title: 'Avatar Vídeos',
    description: 'Crie vídeos ultrarrealistas com avatar e áudio sincronizado em segundos',
    videoUrl: 'https://mdueuksfunifyxfqpmdv.supabase.co/storage/v1/object/public/public-media/boosters/veo-preview.png',
    credits: 15,
    pricingHint: 'Lite 15cr / Fast 30cr',
    tool: 'veo_video',
    edgeFunction: 'generate-veo-video',
    minPlan: 'pro',
    inputs: [],
    resultType: 'queued',
  },
  // 04 - Creator+
  {
    id: 'avatar-creator',
    slug: 'avatar-creator',
    title: 'Avatar Creator',
    description: 'Crie seu influencer personalizado com ajustes de pele, corpo e cabelo',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/bb9d59e1-0493-4031-a97d-27fc7f660c89.mp4',
    credits: 2,
    tool: 'avatar_creator',
    edgeFunction: 'avatar-creator',
    minPlan: 'creator',
    inputs: [],
    resultType: 'image',
  },
  // 05 - Pro
  {
    id: 'motion-control',
    slug: 'motion',
    title: 'Imitar Movimento',
    description: 'Anime um personagem com base em vídeo de referência (dança/gestos)',
    videoUrl: 'https://static.higgsfield.ai/kling-motion-control-square.mp4',
    credits: 6,
    pricingHint: '6cr/s 720p · 9cr/s 1080p',
    tool: 'motion_control',
    edgeFunction: 'generate-motion-video',
    minPlan: 'pro',
    inputs: [],
    resultType: 'queued',
  },
  // 06 - Creator+
  {
    id: 'skin-enhancer',
    slug: 'pele-ultra',
    title: 'Pele Ultra Realista',
    description: 'Aprimore texturas da pele com realismo extremo',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/bb9d59e1-0493-4031-a97d-27fc7f660c89.mp4',
    credits: 4,
    tool: 'skin_enhancer',
    edgeFunction: 'skin-enhancer',
    minPlan: 'creator',
    inputs: [],
    resultType: 'image',
  },
  // 07 - Starter+
  {
    id: 'videos-ia',
    slug: 'videos-ia',
    title: 'Vídeos IA',
    description: 'Transforme imagens em vídeos animados com IA',
    videoUrl: 'https://mdueuksfunifyxfqpmdv.supabase.co/storage/v1/object/public/public-media/boosters/grok-preview.png',
    credits: 2,
    pricingHint: '2cr/s',
    tool: 'grok_video',
    edgeFunction: 'generate-grok-video',
    minPlan: 'starter',
    inputs: [],
    resultType: 'queued',
  },
  // 08 - Pro
  {
    id: 'filmes-ia',
    slug: 'filmes-ia',
    title: 'Filmes IA',
    description: 'Vídeos cinematográficos com áudio nativo e multi-frame (Kling 3.0)',
    videoUrl: 'https://static.higgsfield.ai/kling-3/kling-3.mp4',
    credits: 7,
    pricingHint: '7cr/s sem áudio · 10cr/s com áudio',
    tool: 'kling_3',
    edgeFunction: 'generate-kling3-video',
    minPlan: 'pro',
    inputs: [],
    resultType: 'queued',
  },
  // 09 - Starter+
  {
    id: 'sora-remover',
    slug: 'sora-remover',
    title: 'Sora Remover',
    description: 'Remova a marca d\'água dos vídeos do Sora 2',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/bb9d59e1-0493-4031-a97d-27fc7f660c89.mp4',
    credits: 20,
    tool: 'sora_remover',
    edgeFunction: 'sora-watermark-remover',
    minPlan: 'starter',
    inputs: [],
    resultType: 'video',
  },
  // 10 - Pro
  {
    id: 'voice-clone',
    slug: 'clonagem-voz',
    title: 'Clonagem de Voz',
    description: 'Clone uma voz e gere falas personalizadas com ela',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/bb9d59e1-0493-4031-a97d-27fc7f660c89.mp4',
    credits: 5,
    pricingHint: '5cr / 1000 chars',
    tool: 'voice_clone',
    edgeFunction: 'text-to-speech',
    minPlan: 'pro',
    inputs: [],
    resultType: 'audio',
  },
  // 11 - Starter+
  {
    id: 'transcribe-audio',
    slug: 'transcricao',
    title: 'Transcrição de Áudio',
    description: 'Transforme áudio em texto rapidamente',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/bb9d59e1-0493-4031-a97d-27fc7f660c89.mp4',
    credits: 2,
    pricingHint: '2cr / minuto',
    tool: 'transcribe_audio',
    edgeFunction: 'transcribe-audio',
    minPlan: 'starter',
    inputs: [],
    resultType: 'text',
  },
]

export const BOOSTER_BY_SLUG = Object.fromEntries(BOOSTERS.map(b => [b.slug, b]))
