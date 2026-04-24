export type LabNodeType = 'product' | 'avatar' | 'scene' | 'settings' | 'generate'

export interface ProductNodeData {
  productId?: string
  productName?: string
  imageUrl?: string
  [key: string]: unknown
}

export interface AvatarNodeData {
  avatarId?: string
  avatarName?: string
  imageUrl?: string
  gender?: 'female' | 'male'
  [key: string]: unknown
}

export interface SceneNodeData {
  scenarioId?: string
  scenarioName?: string
  customPrompt?: string
  [key: string]: unknown
}

export interface SettingsNodeData {
  pose: string
  style: string
  enhancements: string[]
  format: string
  additionalInfo?: string
  [key: string]: unknown
}

export interface GenerateNodeData {
  status: 'idle' | 'ready' | 'generating' | 'done' | 'error'
  resultUrl?: string
  errorMessage?: string
  [key: string]: unknown
}

export interface WorkflowPayload {
  product_id?: string
  avatar_id?: string
  scenarioId?: string
  customScenePrompt?: string
  pose: string
  style: string
  enhancements: string[]
  format: string
  additionalInfo?: string
}
