import { useState, useEffect } from 'react'
import { Zap, ToggleLeft, ToggleRight, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { BOOSTERS } from '../../types/boosters'

interface BoosterSetting {
  tool_name: string
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
    const { data, error } = await supabase.from('booster_settings').select('*').order('tool_name')
    if (error) toast.error('Erro: ' + error.message)
    setRows((data ?? []) as BoosterSetting[])
    setLoading(false)
  }

  async function saveCredits(tool_name: string) {
    const value = edits[tool_name]
    if (value == null || value < 0) return
    setSaving(tool_name)
    const { error } = await supabase.from('booster_settings')
      .update({ credits_charged: value, updated_at: new Date().toISOString() })
      .eq('tool_name', tool_name)
    setSaving(null)
    if (error) toast.error('Erro ao salvar: ' + error.message)
    else { toast.success('Créditos atualizados'); setEdits(p => { const n = { ...p }; delete n[tool_name]; return n }); load() }
  }

  async function toggleActive(row: BoosterSetting) {
    const next = !row.is_active
    const msg = next ? `Ativar ${row.tool_name}?` : `Desativar ${row.tool_name}? Esse booster sumirá pra todos users imediatamente.`
    if (!confirm(msg)) return
    setSaving(row.tool_name)
    const { error } = await supabase.from('booster_settings')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('tool_name', row.tool_name)
    setSaving(null)
    if (error) toast.error('Erro: ' + error.message)
    else { toast.success(next ? 'Ativado' : 'Desativado'); load() }
  }

  return (
    <div className="space-y-3">
      <div className="bg-surface-300/50 border border-white/5 rounded-lg p-3 text-xs text-white/50">
        Edite créditos cobrados por booster e ative/desative. Mudanças refletem imediatamente pra todos os users.
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {rows.map(row => {
            const meta = BOOSTERS.find(b => b.tool === row.tool_name)
            const isEditing = edits[row.tool_name] != null
            const dirtyValue = edits[row.tool_name] ?? row.credits_charged
            return (
              <div key={row.tool_name} className={`flex items-center gap-3 bg-surface-300 border rounded-xl p-4 ${row.is_active ? 'border-white/5' : 'border-red-500/20 opacity-70'}`}>
                <Zap size={16} className={row.is_active ? 'text-primary-400' : 'text-white/20'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${row.is_active ? 'text-white' : 'text-white/40 line-through'}`}>{meta?.title ?? row.tool_name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
                    <span className="font-mono">{row.tool_name}</span>
                    {meta?.edgeFunction && <span className="text-primary-300">→ {meta.edgeFunction}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} value={dirtyValue}
                    onChange={e => setEdits(p => ({ ...p, [row.tool_name]: Number(e.target.value) }))}
                    className="w-20 px-2 py-1 bg-surface-400 border border-white/10 rounded text-white text-sm text-center focus:outline-none focus:border-primary-500" />
                  <span className="text-[10px] text-white/40">cr</span>
                  {isEditing && (
                    <button onClick={() => saveCredits(row.tool_name)} disabled={saving === row.tool_name}
                      className="ml-1 px-2 py-1 rounded bg-primary-600 text-white text-xs cursor-pointer hover:brightness-110 disabled:opacity-50">
                      {saving === row.tool_name ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    </button>
                  )}
                </div>
                <button onClick={() => toggleActive(row)} disabled={saving === row.tool_name} className="cursor-pointer disabled:opacity-50">
                  {row.is_active
                    ? <ToggleRight size={28} className="text-green-400" />
                    : <ToggleLeft size={28} className="text-white/20" />
                  }
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
