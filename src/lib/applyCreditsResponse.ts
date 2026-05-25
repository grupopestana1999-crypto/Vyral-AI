import { useAuthStore } from '../stores/auth-store'

export function applyCreditsFromResponse(data: { credits_remaining?: number } | null | undefined) {
  if (data && typeof data.credits_remaining === 'number') {
    useAuthStore.getState().setCreditsRemaining(data.credits_remaining)
  }
  // E53: pra usuários do modelo cota, re-busca contadores diários depois de cada geração.
  // (síncronos contam na hora; async contam quando check-kie-task marca completed —
  // o HistoryTab/polling chama de novo então.)
  const st = useAuthStore.getState()
  if (st.subscription?.unlimited_daily) {
    st.refreshDailyQuota()
  }
}
