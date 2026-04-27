export const CREDIT_VALUE_BRL = 0.05
export const USD_TO_BRL = 5.50

// Custos confirmados pelo cliente em 2026-04-27
// Studio IA + Editar Imagem + Influencer Lab Img usam Kie nano-banana (sem pro)
// Veo 3.1 tem 2 modos: lite (5) e fast (8); Grok 5; Kling 3.0 30
export const TOOL_CREDITS = {
  studio_image: 1,
  edit_image: 1,
  nano_banana_pro: 1,
  avatar_builder: 5,
  skin_enhancer: 5,
  nano_banana_2: 5,
  sora_remover: 20,
  human_engine: 35,
  grok_video: 5,
  motion_control: 30,  // Kling 3.0 video-to-video
  kling_3: 30,
  veo_video: 5,        // default Lite; Fast cobra 8 dinamicamente na edge function
  veo_video_fast: 8,
  prompt_generator: 0, // FREE 10 lifetime, depois cobra 1/uso
} as const

export const TOOL_LABELS: Record<string, string> = {
  studio_image: 'Studio IA',
  edit_image: 'Editar Imagem',
  nano_banana_pro: 'Nano Banana Pro',
  avatar_builder: 'Avatar Builder',
  skin_enhancer: 'Pele Ultra Realista',
  nano_banana_2: 'Nano Banana 2',
  sora_remover: 'Sora Remover',
  human_engine: 'Human Engine',
  grok_video: 'Grok IA',
  motion_control: 'Controle de Movimento',
  kling_3: 'Kling 3.0',
  veo_video: 'Veo 3.1',
  prompt_generator: 'Gerador de Prompt',
}

export const FREE_LIFETIME_PROMPTS = 10
export const PROMPT_OVERAGE_CREDITS = 1
export const STUDIO_DAILY_LIMIT = 20

// PLANS deriva de HOTMART_OFFERS pra ter UMA única fonte da verdade.
// Antes havia divergência: PLANS dizia 600 créditos no Starter mas o webhook Hotmart
// entregava 300. Agora ambos usam o mesmo valor — o que está cadastrado no Hotmart.
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
