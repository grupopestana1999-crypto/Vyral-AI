export type PlanType = 'starter' | 'creator' | 'pro'
export type UserRole = 'user' | 'admin' | 'super_admin'
export type SubscriptionStatus = 'active' | 'approved' | 'expired' | 'cancelled'
export type GenerationStatus = 'queued' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface Subscription {
  id: string
  customer_email: string
  offer_name: string
  status: SubscriptionStatus
  plan_type: PlanType
  credits_total: number
  credits_remaining: number
  expires_at: string | null
  hotmart_transaction_id: string | null
  stripe_session_id: string | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  image_url: string
  price_min: number
  price_max: number
  category: string
  heat_score: number
  revenue: number
  items_sold: number
  sales: number
  additional_images: string[]
  tiktok_url: string | null
  commission_rate: number
  is_active: boolean
  source_url: string | null
  created_at: string
}

export interface ProductVideo {
  id: string
  product_id: string
  video_url: string
  thumbnail_url: string
  tiktok_video_url: string | null
  title: string
  duration: number | null
  revenue: number
  views: number
  likes: number
  items_sold: number
  creator_name: string
  creator_avatar_url: string | null
  creator_profile_url: string | null
  transcription: string | null
  insight_hook: string | null
  insight_pain: string | null
  insight_solution: string | null
  insight_cta: string | null
  country: string | null
  published_at: string | null
  products?: Product
}

export interface Creator {
  id: string
  name: string
  display_name: string | null
  username: string
  avatar_url: string
  profile_url: string
  followers: number
  following: number
  total_likes: number
  total_videos: number
  niche: string | null
  projected_monthly_sales: number
  is_active: boolean
  created_at: string
}

export interface Avatar {
  id: string
  name: string
  image_url: string
  category: string
  description: string | null
  gender: string | null
  is_active: boolean
}

export interface PromptTemplate {
  id: string
  title: string
  category: string
  type: 'video' | 'image'
  prompt: string
  description: string | null
  media_url: string | null
  thumbnail_url: string | null
  tags: string[] | null
  author: string | null
  created_at: string
}

export interface CreditUsageLog {
  id: string
  user_email: string
  tool_name: string
  credits_used: number
  edge_function: string
  status: string
  created_at: string
}

export interface CreditPurchase {
  id: string
  user_email: string
  package_name: string
  amount_brl: number
  credits: number
  payment_method: 'hotmart' | 'stripe'
  payment_id: string
  status: string
  created_at: string
}

export interface ReferralCode {
  id: string
  user_id: string
  code: string
  link: string
  created_at: string
}

export interface ReferralConversion {
  id: string
  referral_code_id: string
  invited_user_id: string | null
  event_type: string
  credits_awarded: number
  created_at: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_active: boolean
  created_at: string
}

export interface VideoGenerationQueue {
  id: string
  user_email: string
  tool_name: string
  status: GenerationStatus
  input_payload: Record<string, unknown>
  output_url: string | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}
