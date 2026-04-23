export interface StudioOption {
  id: string
  name: string
  description?: string
  emoji?: string
}

export const POSES: StudioOption[] = [
  { id: 'front', name: 'De Frente', description: 'Produto de frente pra câmera', emoji: '🎯' },
  { id: 'selfie', name: 'Selfie', description: 'Segurando o produto', emoji: '🤳' },
  { id: 'hands', name: 'POV', description: 'Visão em 1ª pessoa', emoji: '👐' },
  { id: 'mirror', name: 'Mirror Selfie', description: 'Selfie no espelho', emoji: '🪞' },
  { id: 'sitting', name: 'Sentada', description: 'Casualmente sentada', emoji: '💺' },
  { id: 'product_solo', name: 'Só Produto', description: 'Produto sem pessoa', emoji: '📦' },
]

export const STYLES: StudioOption[] = [
  { id: 'casual', name: 'Casual', description: 'Relaxado' },
  { id: 'professional', name: 'Profissional', description: 'Corporativo' },
  { id: 'sporty', name: 'Esportivo', description: 'Atlético' },
  { id: 'elegant', name: 'Elegante', description: 'Sofisticado' },
  { id: 'minimalist', name: 'Minimalista', description: 'Clean' },
  { id: 'streetwear', name: 'Streetwear', description: 'Urbano' },
  { id: 'bohemian', name: 'Boho', description: 'Artístico' },
  { id: 'soft', name: 'Suave', description: 'Delicado' },
  { id: 'colorful', name: 'Colorido', description: 'Vibrante' },
  { id: 'summer', name: 'Verão', description: 'Tropical' },
  { id: 'trendy', name: 'Trendy', description: 'Na moda' },
  { id: 'basic', name: 'Básico', description: 'Versátil' },
]

export const FORMATS: StudioOption[] = [
  { id: '9:16', name: '📱 9:16', description: 'TikTok, Reels' },
  { id: '1:1', name: '⏹️ 1:1', description: 'Feed' },
  { id: '3:4', name: '📸 3:4', description: 'Pinterest' },
  { id: '16:9', name: '🖥️ 16:9', description: 'YouTube' },
]

export interface EnhancementOption {
  id: string
  name: string
  emoji: string
  defaultActive: boolean
}

export const ENHANCEMENTS: EnhancementOption[] = [
  { id: 'skin', name: 'Skin', emoji: '🧬', defaultActive: true },
  { id: 'light', name: 'Luz', emoji: '☀️', defaultActive: false },
  { id: 'sharpness', name: 'Nitidez', emoji: '🔍', defaultActive: true },
  { id: 'anti_ai', name: 'Anti-IA', emoji: '🚫', defaultActive: true },
  { id: 'bokeh', name: 'Bokeh', emoji: '📷', defaultActive: false },
  { id: 'hands', name: 'Mãos', emoji: '🤲', defaultActive: true },
]

export interface Scenario {
  id: string
  name: string
  description: string
  thumbnail: string
  promptHint: string
}

// Cenários prontos com thumbnails de placeholder
export const SCENARIOS: Scenario[] = [
  {
    id: 'studio',
    name: 'Estúdio Profissional',
    description: 'Fundo neutro, iluminação cuidadosa',
    thumbnail: 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=400&h=400&fit=crop',
    promptHint: 'professional photo studio with soft lighting, seamless backdrop, clean composition',
  },
  {
    id: 'home_lifestyle',
    name: 'Casa Lifestyle',
    description: 'Sala moderna com luz natural',
    thumbnail: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=400&fit=crop',
    promptHint: 'modern living room with natural sunlight, cozy home interior, lifestyle photography',
  },
  {
    id: 'bathroom',
    name: 'Banheiro Iluminado',
    description: 'Perfeito para produtos de beleza',
    thumbnail: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=400&fit=crop',
    promptHint: 'bright modern bathroom with marble counter, soft natural light, skincare aesthetic',
  },
  {
    id: 'kitchen',
    name: 'Cozinha Gourmet',
    description: 'Utensílios e produtos de cozinha',
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    promptHint: 'modern kitchen countertop, warm lighting, culinary aesthetic',
  },
  {
    id: 'outdoor',
    name: 'Ao Ar Livre',
    description: 'Natureza, luz solar',
    thumbnail: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop',
    promptHint: 'outdoor setting with golden hour lighting, natural environment, lifestyle shot',
  },
  {
    id: 'cafe',
    name: 'Café Aconchegante',
    description: 'Ambiente urbano, acolhedor',
    thumbnail: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=400&h=400&fit=crop',
    promptHint: 'cozy cafe interior, warm ambient lighting, aesthetic vibes',
  },
  {
    id: 'gym',
    name: 'Academia / Fitness',
    description: 'Produtos esportivos e saúde',
    thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
    promptHint: 'modern gym environment, sporty energetic vibe, fitness lifestyle',
  },
  {
    id: 'bedroom',
    name: 'Quarto Moderno',
    description: 'Ambiente íntimo, produtos pessoais',
    thumbnail: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&h=400&fit=crop',
    promptHint: 'modern bedroom with soft morning light, minimalist decor, lifestyle aesthetic',
  },
]
