import { useState, useEffect, useMemo } from 'react'
import { Zap, ToggleLeft, ToggleRight, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { BOOSTERS } from '../../types/boosters'

interface BoosterSetting {
  tool_name: string
  tier: string
  label: string | null
  credits_charged: number
  is_active: boolean
  updated_at: string | null
}

export function AdminBoosters() {
  const [rows, setRows] = useState<BoosterSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('booster_settings').select('*').order('tool_name').order('tier')
    if (error) toast.error('Erro: ' + error.message)
    setRows((data ?? []) as BoosterSetting[])
    setLoading(false)
  }

  function rowKey(tool: string, tier: string) { return `${tool}::${tier}` }

  async function saveCredits(tool_name: string, tier: string) {
    const value = edits[rowKey(tool_name, tier)]
    if (value == null || value < 0) return
    setSaving(rowKey(tool_name, tier))
    const { error } = await supabase.from('booster_settings')
      .update({ credits_charged: value, updated_at: new Date().toISOString() })
      .eq('tool_name', tool_name).eq('tier', tier)
    setSaving(null)
    if (error) toast.error('Erro ao salvar: ' + error.message)
    else { toast.success('Créditos atualizados (vale pra todos os users imediatamente)'); setEdits(p => { const n = { ...p }; delete n[rowKey(tool_name, tier)]; return n }); load() }
  }

  async function toggleActive(row: BoosterSetting) {
    const next = !row.is_active
    const tierLabel = row.tier !== 'default' ? ` (${row.label ?? row.tier})` : ''
    const msg = next ? `Ativar ${row.tool_name}${tierLabel}?` : `Desativar ${row.tool_name}${tierLabel}? Booster ficará indisponível pra todos users imediatamente.`
    if (!confirm(msg)) return
    setSaving(rowKey(row.tool_name, row.tier))
    const { error } = await supabase.from('booster_settings')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('tool_name', row.tool_name).eq('tier', row.tier)
    setSaving(null)
    if (error) toast.error('Erro: ' + error.message)
    else { toast.success(next ? 'Ativado' : 'Desativado'); load() }
  }

  // Agrupar por tool_name
  const grouped = useMemo(() => {
    const map = new Map<string, BoosterSetting[]>()
    for (const r of rows) {
      if (!map.has(r.tool_name)) map.set(r.tool_name, [])
      map.get(r.tool_name)!.push(r)
    }
    return Array.from(map.entries())
  }, [rows])

  return (
    <div className="space-y-3">
      <div className="bg-surface-300/50 border border-white/5 rounded-lg p-3 text-xs text-white/50">
        Edite créditos cobrados por booster e ative/desative. Mudanças refletem <strong>imediatamente</strong> pra todos os users (gravadas no banco).
        Boosters de vídeo (Filmes IA, Imitar Movimento, Avatar Vídeos) têm 2 modelos de cobrança configuráveis separadamente.
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([tool, tiers]) => {
            const meta = BOOSTERS.find(b => b.tool === tool)
            const isMultiTier = tiers.length > 1
            const allActive = tiers.every(t => t.is_active)
            return (
              <div key={tool} className={`bg-surface-300 border rounded-xl overflow-hidden ${allActive ? 'border-white/5' : 'border-red-500/20'}`}>
                <div className="flex items-center gap-3 p-4 border-b border-white/5">
                  <Zap size={16} className={allActive ? 'text-primary-400' : 'text-white/20'} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${allActive ? 'text-white' : 'text-white/40'}`}>{meta?.title ?? tool}</p>
                    <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
                      <span className="font-mono">{tool}</span>
                      {meta?.edgeFunction && <span className="text-primary-300">→ {meta.edgeFunction}</span>}
                      {isMultiTier && <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">2 modelos</span>}
                    </div>
                  </div>
                </div>
                {tiers.map(row => {
                  const k = rowKey(row.tool_name, row.tier)
                  const isEditing = edits[k] != null
                  const dirtyValue = edits[k] ?? row.credits_charged
                  return (
                    <div key={k} className={`flex items-center gap-3 px-4 py-3 ${row.is_active ? '' : 'opacity-60 bg-red-500/5'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70">{row.label ?? (row.tier === 'default' ? 'Cobrança única' : row.tier)}</p>
                        <p className="text-[10px] text-white/30 font-mono">tier: {row.tier}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} value={dirtyValue}
                          onChange={e => setEdits(p => ({ ...p, [k]: Number(e.target.value) }))}
                          className="w-20 px-2 py-1 bg-surface-400 border border-white/10 rounded text-white text-sm text-center focus:outline-none focus:border-primary-500" />
                        <span className="text-[10px] text-white/40">cr</span>
                        {isEditing && (
                          <button onClick={() => saveCredits(row.tool_name, row.tier)} disabled={saving === k}
                            className="ml-1 px-2 py-1 rounded bg-primary-600 text-white text-xs cursor-pointer hover:brightness-110 disabled:opacity-50">
                            {saving === k ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          </button>
                        )}
                      </div>
                      <button onClick={() => toggleActive(row)} disabled={saving === k} className="cursor-pointer disabled:opacity-50" title={row.is_active ? 'Desativar' : 'Ativar'}>
                        {row.is_active
                          ? <ToggleRight size={28} className="text-green-400" />
                          : <ToggleLeft size={28} className="text-white/20" />
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
