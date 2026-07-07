import { create } from 'zustand'

// E65: store global pro modal de "Créditos esgotados" (código internal_cap_reached).
// Qualquer página pode abrir o modal via `useGenerationErrorStore.getState().openCapExhausted()`.
interface GenerationErrorStore {
  capExhaustedOpen: boolean
  openCapExhausted: () => void
  closeCapExhausted: () => void
}

export const useGenerationErrorStore = create<GenerationErrorStore>((set) => ({
  capExhaustedOpen: false,
  openCapExhausted: () => set({ capExhaustedOpen: true }),
  closeCapExhausted: () => set({ capExhaustedOpen: false }),
}))
