import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface BoosterSettingRow {
  tool_name: string
  tier: string
  credits_charged: number
  is_active: boolean
  label: string | null
}

interface BoosterSettingsStore {
  rows: BoosterSettingRow[]
  loaded: boolean
  load: () => Promise<void>
  subscribe: () => () => void
  getCredits: (tool: string, tier?: string) => number | null
  isActive: (tool: string, tier?: string) => boolean
  getTiers: (tool: string) => BoosterSettingRow[]
}

function rowKey(tool: string, tier: string) { return tool + '::' + tier }

export const useBoosterSettings = create<BoosterSettingsStore>((set, get) => ({
  rows: [],
  loaded: false,
  async load() {
    const { data, error } = await supabase.from('booster_settings').select('*').order('tool_name').order('tier')
    if (error) { console.error('booster_settings load', error); return }
    set({ rows: (data ?? []) as BoosterSettingRow[], loaded: true })
  },
  subscribe() {
    const channel = supabase.channel('booster_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booster_settings' }, () => {
        get().load()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
  getCredits(tool, tier = 'default') {
    const map = new Map<string, BoosterSettingRow>()
    for (const r of get().rows) map.set(rowKey(r.tool_name, r.tier), r)
    const row = map.get(rowKey(tool, tier)) ?? map.get(rowKey(tool, 'default'))
    return row ? row.credits_charged : null
  },
  isActive(tool, tier = 'default') {
    const map = new Map<string, BoosterSettingRow>()
    for (const r of get().rows) map.set(rowKey(r.tool_name, r.tier), r)
    // Para multi-tier: "ativo" = ao menos 1 tier ativo (consistente com o card geral)
    const tiers = get().rows.filter(r => r.tool_name === tool)
    if (tiers.length === 0) return true // sem registro = não bloqueia
    if (tier !== 'default') {
      const exact = map.get(rowKey(tool, tier))
      if (exact) return exact.is_active
    }
    return tiers.some(r => r.is_active)
  },
  getTiers(tool) {
    return get().rows.filter(r => r.tool_name === tool)
  },
}))
