import { useAuthStore } from '../stores/auth-store'

export function applyCreditsFromResponse(data: { credits_remaining?: number } | null | undefined) {
  if (data && typeof data.credits_remaining === 'number') {
    useAuthStore.getState().setCreditsRemaining(data.credits_remaining)
  }
}
