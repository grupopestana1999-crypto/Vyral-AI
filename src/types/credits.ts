export const CREDIT_VALUE_BRL = 0.05
export const USD_TO_BRL = 5.50

// Custos finais confirmados pelo cliente em 2026-04-27 (PDF "Pontuações Finais Vyral AI"):
// Vários boosters mudaram de cobrança fixa para por segundo. Sempre que tiver `_per_s` no nome, é unidade por segundo.
// Studio IA: 2cr (1ª grátis); Editar 2cr; Avatar Vídeos Lite=15/Fast=30 fixo;
// Imitar Movimento: 6/9 cr/s (720/1080); Vídeos IA (Grok): 2cr/s; Filmes IA (Kling): 7 sem áudio/10 com áudio cr/s;
// Sora: 20cr fixo; Clonagem voz: 5cr/1000chars; Transcrição: 2cr/min; Pele Ultra: 50cr (Clarity Pro 4K, E51); Avatar Creator: 2cr.
export const TOOL_CREDITS = {
  studio_image: 2,              // 1ª grátis (controle via daily_image_usage)
  edit_image: 2,
  veo_video: 15,                // Avatar Vídeos Lite (fixo)
  veo_video_fast: 30,           // Avatar Vídeos Fast (fixo)
  avatar_creator: 2,            // NEW - Pele/Corpo/Cabelo
  skin_enhancer: 50,            // E51: Clarity Pro 4K — cobre $0.50 USD custo Replicate
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
// Lê de booster_settings (admin pode editar em runtime). Fallback pra TOOL_CREDITS hardcoded se store ainda não carregou.
import { useBoosterSettings } from '../stores/booster-settings-store'

export interface CreditCalcOpts {
  duration_s?: number
  quality?: '720p' | '1080p'
  audio?: boolean
  chars?: number
  veo_mode?: 'lite' | 'fast'
  resolution?: '720p' | '1080p'
}

function dbCredits(tool: string, tier: string): number | null {
  const v = useBoosterSettings.getState().getCredits(tool, tier)
  return v == null ? null : v
}

export function calcCredits(tool: string, opts: CreditCalcOpts = {}): number {
  switch (tool) {
    case 'grok_video': {
      const sec = Math.max(1, opts.duration_s ?? 5)
      const rate = dbCredits('grok_video', 'default') ?? TOOL_CREDITS.grok_video_per_s
      return Math.ceil(sec * rate)
    }
    case 'kling_3': {
      const sec = Math.max(1, opts.duration_s ?? 5)
      const tier = opts.audio ? 'audio' : 'no_audio'
      const rate = dbCredits('kling_3', tier) ?? (opts.audio ? TOOL_CREDITS.kling_3_per_s_with_audio : TOOL_CREDITS.kling_3_per_s_no_audio)
      return Math.ceil(sec * rate)
    }
    case 'motion_control': {
      const sec = Math.max(1, opts.duration_s ?? 5)
      const tier = opts.quality === '1080p' ? '1080p' : '720p'
      const rate = dbCredits('motion_control', tier) ?? (opts.quality === '1080p' ? TOOL_CREDITS.motion_control_per_s_1080 : TOOL_CREDITS.motion_control_per_s_720)
      return Math.ceil(sec * rate)
    }
    case 'veo_video': {
      // E48d: resolução 720p/1080p substitui o antigo veo_mode lite/fast.
      // Fallback pra 'lite' (compat com chamadas antigas que ainda passam veo_mode).
      const tier = opts.resolution === '1080p' ? '1080p' : opts.resolution === '720p' ? '720p' : (opts.veo_mode === 'fast' ? 'fast' : 'lite')
      const dbVal = dbCredits('veo_video', tier)
      if (dbVal != null) return dbVal
      // Defaults hardcoded quando store ainda não carregou
      if (tier === '720p') return 15
      if (tier === '1080p') return 20
      return opts.veo_mode === 'fast' ? TOOL_CREDITS.veo_video_fast : TOOL_CREDITS.veo_video
    }
    case 'voice_clone': {
      const chars = Math.max(1, opts.chars ?? 0)
      const rate = dbCredits('voice_clone', 'default') ?? TOOL_CREDITS.voice_clone_per_1k
      return Math.ceil(chars / 1000 * rate)
    }
    case 'transcribe_audio': {
      const sec = Math.max(1, opts.duration_s ?? 60)
      const rate = dbCredits('transcribe_audio', 'default') ?? TOOL_CREDITS.transcribe_audio_per_min
      return Math.ceil(sec / 60 * rate)
    }
    case 'studio_image':
    case 'edit_image':
    case 'avatar_creator':
    case 'skin_enhancer':
    case 'sora_remover':
      return dbCredits(tool, 'default') ?? TOOL_CREDITS[tool]
    default:
      return dbCredits(tool, 'default') ?? (TOOL_CREDITS as Record<string, number>)[tool] ?? 0
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
