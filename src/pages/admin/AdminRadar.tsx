import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, X, Save, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface Opportunity {
  id: string
  title: string
  description: string | null
  what_client_wants: string | null
  expected_format: string | null
  vyral_tips: string | null
  external_url: string | null
  platform: string
  payment_min_brl: number
  payment_max_brl: number
  work_type: string | null
  difficulty: 'iniciante' | 'medio' | 'avancado'
  experience_level: string[]
  content_types: string[]
  goals: string[]
  is_active: boolean
}

const EMPTY: Omit<Opportunity, 'id'> = {
  title: '',
  description: '',
  what_client_wants: '',
  expected_format: '',
  vyral_tips: '',
  external_url: '',
  platform: 'Outro',
  payment_min_brl: 0,
  payment_max_brl: 0,
  work_type: '',
  difficulty: 'medio',
  experience_level: ['iniciante', 'intermediario', 'avancado'],
  content_types: [],
  goals: [],
  is_active: true,
}

const CONTENT_OPTIONS = ['videos_curtos', 'ugc', 'vsl', 'criativos_anuncios']
const GOAL_OPTIONS = ['renda_extra', 'viver_disso', 'testar_mercado']
const EXP_OPTIONS = ['iniciante', 'intermediario', 'avancado']

export function AdminRadar() {
  const [rows, setRows] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<(Opportunity | (typeof EMPTY & { id?: string })) | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('radar_opportunities').select('*').order('created_at', { ascending: false })
    if (error) toast.error('Erro: ' + error.message)
    setRows((data ?? []) as Opportunity[])
    setLoading(false)
  }

  async function save() {
    if (!editing) return
    if (!editing.title) { toast.error('Título obrigatório'); return }
    setSaving(true)
    const payload = {
      title: editing.title,
      description: editing.description,
      what_client_wants: editing.what_client_wants,
      expected_format: editing.expected_format,
      vyral_tips: editing.vyral_tips,
      external_url: editing.external_url,
      platform: editing.platform,
      payment_min_brl: editing.payment_min_brl,
      payment_max_brl: editing.payment_max_brl,
      work_type: editing.work_type,
      difficulty: editing.difficulty,
      experience_level: editing.experience_level,
      content_types: editing.content_types,
      goals: editing.goals,
      is_active: editing.is_active,
      updated_at: new Date().toISOString(),
    }
    const isUpdate = 'id' in editing && editing.id
    const { error } = isUpdate
      ? await supabase.from('radar_opportunities').update(payload).eq('id', editing.id!)
      : await supabase.from('radar_opportunities').insert(payload)
    setSaving(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success(isUpdate ? 'Atualizado' : 'Criado')
    setEditing(null)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Remover essa oportunidade?')) return
    const { error } = await supabase.from('radar_opportunities').delete().eq('id', id)
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Removido')
    load()
  }

  function toggleArr(field: 'experience_level' | 'content_types' | 'goals', value: string) {
    setEditing(e => {
      if (!e) return e
      const arr = e[field] as string[]
      const next = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]
      return { ...e, [field]: next }
    })
  }

  const filtered = rows.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.platform.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="px-3 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium cursor-pointer hover:brightness-110 flex items-center gap-1.5">
          <Plus size={14} /> Nova oportunidade
        </button>
      </div>

      <p className="text-xs text-white/40">{filtered.length} oportunidades</p>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhuma oportunidade cadastrada</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className={`bg-surface-300 border rounded-xl p-4 ${r.is_active ? 'border-white/5' : 'border-red-500/20 opacity-60'}`}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.title}</p>
                  <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5 flex-wrap">
                    <span className="text-blue-400">{r.platform}</span>
                    <span>·</span>
                    <span>{r.work_type ?? '—'}</span>
                    <span>·</span>
                    <span className="text-emerald-400">R$ {r.payment_min_brl}–{r.payment_max_brl}</span>
                    <span>·</span>
                    <span className="capitalize">{r.difficulty}</span>
                    {!r.is_active && <span className="text-red-400">· INATIVO</span>}
                  </div>
                </div>
                <button onClick={() => setEditing(r)} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-primary-400 cursor-pointer"><Pencil size={14} /></button>
                <button onClick={() => remove(r.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !saving && setEditing(null)}>
          <div className="bg-surface-300 border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{('id' in editing && editing.id) ? 'Editar oportunidade' : 'Nova oportunidade'}</h3>
              <button onClick={() => !saving && setEditing(null)} className="text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>

            <Field label="Título *">
              <input type="text" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plataforma">
                <select value={editing.platform} onChange={e => setEditing({ ...editing, platform: e.target.value })} className="input">
                  <option>Upwork</option><option>Fiverr</option><option>Workana</option><option>99Freelas</option><option>GetNinjas</option><option>Outro</option>
                </select>
              </Field>
              <Field label="Tipo de trabalho">
                <input type="text" value={editing.work_type ?? ''} onChange={e => setEditing({ ...editing, work_type: e.target.value })} className="input" placeholder="Ex: Vídeo curto, VSL, UGC..." />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pagamento mín (R$)">
                <input type="number" value={editing.payment_min_brl} onChange={e => setEditing({ ...editing, payment_min_brl: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="Pagamento máx (R$)">
                <input type="number" value={editing.payment_max_brl} onChange={e => setEditing({ ...editing, payment_max_brl: Number(e.target.value) })} className="input" />
              </Field>
            </div>
            <Field label="Dificuldade">
              <div className="grid grid-cols-3 gap-2">
                {(['iniciante','medio','avancado'] as const).map(d => (
                  <button key={d} onClick={() => setEditing({ ...editing, difficulty: d })}
                    className={`py-1.5 rounded text-xs font-medium capitalize cursor-pointer ${editing.difficulty === d ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'}`}>{d}</button>
                ))}
              </div>
            </Field>
            <Field label="Nível de experiência (segmentação)">
              <div className="flex gap-2 flex-wrap">
                {EXP_OPTIONS.map(x => (
                  <button key={x} onClick={() => toggleArr('experience_level', x)}
                    className={`px-2 py-1 rounded text-[10px] font-medium capitalize cursor-pointer ${editing.experience_level.includes(x) ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/40'}`}>{x}</button>
                ))}
              </div>
            </Field>
            <Field label="Tipos de conteúdo (segmentação)">
              <div className="flex gap-2 flex-wrap">
                {CONTENT_OPTIONS.map(x => (
                  <button key={x} onClick={() => toggleArr('content_types', x)}
                    className={`px-2 py-1 rounded text-[10px] font-medium cursor-pointer ${editing.content_types.includes(x) ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/40'}`}>{x}</button>
                ))}
              </div>
            </Field>
            <Field label="Objetivos (segmentação)">
              <div className="flex gap-2 flex-wrap">
                {GOAL_OPTIONS.map(x => (
                  <button key={x} onClick={() => toggleArr('goals', x)}
                    className={`px-2 py-1 rounded text-[10px] font-medium cursor-pointer ${editing.goals.includes(x) ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/40'}`}>{x}</button>
                ))}
              </div>
            </Field>
            <Field label="Descrição"><textarea value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="input min-h-[60px]" /></Field>
            <Field label="O que o cliente quer"><textarea value={editing.what_client_wants ?? ''} onChange={e => setEditing({ ...editing, what_client_wants: e.target.value })} className="input min-h-[60px]" /></Field>
            <Field label="Formato esperado"><textarea value={editing.expected_format ?? ''} onChange={e => setEditing({ ...editing, expected_format: e.target.value })} className="input min-h-[40px]" /></Field>
            <Field label="Dicas usando o Vyral AI"><textarea value={editing.vyral_tips ?? ''} onChange={e => setEditing({ ...editing, vyral_tips: e.target.value })} className="input min-h-[60px]" /></Field>
            <Field label="URL externa (plataforma)"><input type="url" value={editing.external_url ?? ''} onChange={e => setEditing({ ...editing, external_url: e.target.value })} className="input" /></Field>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
              <span className="text-xs text-white/70">Ativa (visível pros usuários)</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg bg-surface-400 text-white/70 hover:text-white text-sm cursor-pointer disabled:opacity-50">Cancelar</button>
              <button onClick={save} disabled={saving || !editing.title}
                className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium cursor-pointer hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input { width: 100%; padding: 8px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #fff; font-size: 13px; outline: none; }
        .input:focus { border-color: rgb(168 85 247 / 0.5); }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-white/60 block mb-1">{label}</span>
      {children}
    </label>
  )
}
