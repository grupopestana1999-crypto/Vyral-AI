export const HOTMART_OFFERS = {
  starter: { code: '7zmngs50', price: 147, credits: 300, url: 'https://pay.hotmart.com/W89822854F?off=7zmngs50' },
  creator: { code: '84giouqu', price: 197, credits: 600, url: 'https://pay.hotmart.com/W89822854F?off=84giouqu' },
  pro: { code: 'ui1qxdw1', price: 297, credits: 1500, url: 'https://pay.hotmart.com/W89822854F?off=ui1qxdw1' },
} as const

export type HotmartPlan = keyof typeof HOTMART_OFFERS

/**
 * Constrói URL de checkout Hotmart anexando o referral code em `sck`.
 * `sck` é o parâmetro de origem que o Hotmart repassa pro webhook em `purchase.tracking.source`.
 */
export function buildHotmartCheckoutUrl(plan: HotmartPlan): string {
  const offer = HOTMART_OFFERS[plan]
  const ref = typeof window !== 'undefined' ? localStorage.getItem('vyral_ref') : null
  const sep = offer.url.includes('?') ? '&' : '?'
  return ref ? `${offer.url}${sep}sck=${encodeURIComponent(ref)}` : offer.url
}
