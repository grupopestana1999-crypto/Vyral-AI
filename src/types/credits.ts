export const CREDIT_VALUE_BRL = 0.05
export const USD_TO_BRL = 5.50

// Custos finais confirmados pelo cliente em 2026-04-27 (PDF "Pontuações Finais Vyral AI"):
// Vários boosters mudaram de cobrança fixa para por segundo. Sempre que tiver `_per_s` no nome, é unidade por segundo.
// Studio IA: 2cr (1ª grátis); Editar 2cr; Avatar Vídeos Lite=15/Fast=30 fixo;
// Imitar Movimento: 6/9 cr/s (720/1080); Vídeos IA (Grok): 2cr/s; Filmes IA (Kling): 7 sem áudio/10 com áudio cr/s;
// Sora: 20cr fixo; Clonagem voz: 5cr/1000chars; Transcrição: 2cr/min; Pele Ultra: 4cr; Avatar Creator: 2cr.
export const TOOL_CREDITS = {
  studio_image: 2,              // 1ª grátis (controle via daily_image_usage)
  edit_image: 2,
  veo_video: 15,                // Avatar Vídeos Lite (fixo)
  veo_video_fast: 30,           // Avatar Vídeos Fast (fixo)
  avatar_creator: 2,            // NEW - Pele/Corpo/Cabelo
  skin_enhancer: 4,             // NEW - Pele Ultra Realista
  motion_control_per_s_720: 6,  // Imitar Movimento 720p
  motion_control_per_s_1080: 9, // Imitar Movimento 1080p
  grok_video_per_s: 2,          // Vídeos IA por segundo
  kling_3_per_s_with_audio: 10, // Filmes IA com áudio
  kling_3_per_s_no_audio: 7,    // Filmes IA sem áudio
  sora_remover: 20,             // fixo
  voice_clone_per_1k: 5,        // Clonagem voz por 1000 chars
  transcribe_audio_per_min: 2,  // Transcrição por minuto
  prompt_generator: 0,          // FREE 10 lifetime, depois 1/uso
} as const

// Aliases legados pra retro-compat com chamadas existentes (StudioPage usa `studio_image`, etc).
// Estes mapeiam pro tool key real; serão limpos quando todas as páginas migrarem.
export const TOOL_CREDITS_LEGACY: Record<string, number> = {
  motion_control: 6,            // default 720p; edge function recalcula
  kling_3: 7,                   // default sem áudio; edge function recalcula
  grok_video: 2,                // default 1s mínimo; edge function recalcula
  nano_banana_pro: 2,           // mapeia pro avatar_creator
}

export const TOOL_LABELS: Record<string, string> = {
  studio_image: 'Studio IA',
  edit_image: 'Editar Imagem',
  veo_video: 'Avatar Vídeos',
  avatar_creator: 'Avatar Creator',
  skin_enhancer: 'Pele Ultra Realista',
  motion_control: 'Imitar Movimento',
  grok_video: 'Vídeos IA',
  kling_3: 'Filmes IA',
  sora_remover: 'Sora Remover',
  voice_clone: 'Clonagem de Voz',
  transcribe_audio: 'Transcrição de Áudio',
  prompt_generator: 'Gerador de Prompt',
}

export const FREE_LIFETIME_PROMPTS = 10
export const PROMPT_OVERAGE_CREDITS = 1
export const STUDIO_FREE_FIRST = 1  // 1ª imagem grátis no Studio
export const STUDIO_DAILY_LIMIT = 20

// Calcula custo dinâmico baseado no tool e parâmetros (duração, qualidade, áudio, chars).
// Frontend usa pra preview "Gerar — X cr"; edge function usa pra debit real (autoritativo no backend).
export interface CreditCalcOpts {
  duration_s?: number
  quality?: '720p' | '1080p'
  audio?: boolean
  chars?: number
  veo_mode?: 'lite' | 'fast'
}
export function calcCredits(tool: string, opts: CreditCalcOpts = {}): number {
  switch (tool) {
    case 'grok_video': {
      const sec = Math.max(1, opts.duration_s ?? 5)
      return Math.ceil(sec * TOOL_CREDITS.grok_video_per_s)
    }
    case 'kling_3': {
      const sec = Math.max(1, opts.duration_s ?? 5)
      const rate = opts.audio ? TOOL_CREDITS.kling_3_per_s_with_audio : TOOL_CREDITS.kling_3_per_s_no_audio
      return Math.ceil(sec * rate)
    }
    case 'motion_control': {
      const sec = Math.max(1, opts.duration_s ?? 5)
      const rate = opts.quality === '1080p' ? TOOL_CREDITS.motion_control_per_s_1080 : TOOL_CREDITS.motion_control_per_s_720
      return Math.ceil(sec * rate)
    }
    case 'veo_video': {
      return opts.veo_mode === 'fast' ? TOOL_CREDITS.veo_video_fast : TOOL_CREDITS.veo_video
    }
    case 'voice_clone': {
      const chars = Math.max(1, opts.chars ?? 0)
      return Math.ceil(chars / 1000 * TOOL_CREDITS.voice_clone_per_1k)
    }
    case 'transcribe_audio': {
      const sec = Math.max(1, opts.duration_s ?? 60)
      return Math.ceil(sec / 60 * TOOL_CREDITS.transcribe_audio_per_min)
    }
    case 'studio_image':
    case 'edit_image':
    case 'avatar_creator':
    case 'skin_enhancer':
    case 'sora_remover':
      return TOOL_CREDITS[tool]
    default:
      return (TOOL_CREDITS as Record<string, number>)[tool] ?? 0
  }
}

// Gating por plano: cliente perguntou no PDF "conseguimos liberar boosters por compra".
// Implementação: cada booster declara `min_plan` em boosters.ts; este helper compara.
const PLAN_RANK: Record<string, number> = { starter: 1, creator: 2, pro: 3 }
export function canAccessBooster(userPlan: string | null | undefined, boosterMinPlan?: string): boolean {
  if (!boosterMinPlan) return !!userPlan
  if (!userPlan) return false
  return (PLAN_RANK[userPlan] ?? 0) >= (PLAN_RANK[boosterMinPlan] ?? 0)
}

// PLANS deriva de HOTMART_OFFERS pra ter UMA única fonte da verdade.
import { HOTMART_OFFERS } from '../lib/hotmart'

export const PLANS = {
  starter: { name: 'Starter', price: HOTMART_OFFERS.starter.price, credits: HOTMART_OFFERS.starter.credits },
  creator: { name: 'Creator', price: HOTMART_OFFERS.creator.price, credits: HOTMART_OFFERS.creator.credits },
  pro: { name: 'Pro', price: HOTMART_OFFERS.pro.price, credits: HOTMART_OFFERS.pro.credits },
} as const

export const CREDIT_PACKAGES = [
  { id: 'fast', name: 'Fast', price: 19.90, credits: 150 },
  { id: 'beginner', name: 'Beginner', price: 49.90, credits: 500 },
  { id: 'worker', name: 'Worker', price: 99.90, credits: 1200 },
  { id: 'ultra', name: 'Ultra', price: 249.90, credits: 3200 },
] as const

export const CUSTOM_PACKAGE_RATE = { price: 14.90, credits: 100 }

export const REFERRAL_CREDITS: Record<string, number> = {
  starter: 100,
  creator: 200,
  pro: 300,
}
