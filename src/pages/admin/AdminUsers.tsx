import { useState, useEffect } from 'react'
import { Search, Coins, ChevronRight, Ban, ShieldCheck, Mail, History, Crown, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface UserRow {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  is_banned: boolean
  plan_type: string | null
  status: string | null
  credits_remaining: number
  credits_total: number
  subscription_id: string | null
}

interface HistoryRow {
  id: string
  tool_name: string
  credits_used: number
  status: string
  created_at: string
  result_url: string | null
}

const PLAN_OPTIONS = ['starter', 'creator', 'pro'] as const

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState(0)
  const [newPlan, setNewPlan] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error) toast.error('Erro ao carregar usuários: ' + error.message)
    setUsers((data ?? []) as UserRow[])
    setLoading(false)
  }

  async function adjustCredits(email: string) {
    if (creditAmount === 0) return
    setBusy(true)
    const { error } = await supabase.functions.invoke('admin-add-credits', { body: { email, amount: creditAmount } })
    setBusy(false)
    if (error) toast.error('Erro ao ajustar créditos')
    else { toast.success(`${creditAmount > 0 ? '+' : ''}${creditAmount} créditos para ${email}`); setCreditAmount(0); load() }
  }

  async function changePlan(u: UserRow) {
    if (!newPlan || !PLAN_OPTIONS.includes(newPlan as typeof PLAN_OPTIONS[number])) return
    setBusy(true)
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: { user_id: u.id, email: u.email, action: 'change_plan', payload: { plan_type: newPlan } },
    })
    setBusy(false)
    if (error) toast.error('Erro ao alterar plano')
    else { toast.success(`Plano alterado para ${newPlan}`); setNewPlan(''); load() }
  }

  async function toggleBan(u: UserRow) {
    if (!confirm(u.is_banned ? `Desbloquear ${u.email}?` : `Bloquear ${u.email}? Ele não conseguirá mais logar.`)) return
    setBusy(true)
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: { user_id: u.id, email: u.email, action: u.is_banned ? 'unban' : 'ban' },
    })
    setBusy(false)
    if (error) toast.error('Erro ao bloquear/desbloquear')
    else { toast.success(u.is_banned ? 'Desbloqueado' : 'Bloqueado'); load() }
  }

  async function changeEmail(u: UserRow) {
    if (!newEmail || !newEmail.includes('@')) { toast.error('Email inválido'); return }
    if (!confirm(`Trocar email de ${u.email} para ${newEmail}?`)) return
    setBusy(true)
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: { user_id: u.id, email: u.email, action: 'change_email', payload: { email: newEmail } },
    })
    setBusy(false)
    if (error) toast.error('Erro ao trocar email')
    else { toast.success('Email trocado'); setNewEmail(''); load() }
  }

  async function loadHistory(email: string) {
    setHistoryLoading(true)
    const { data, error } = await supabase.rpc('admin_user_history', { p_email: email, p_limit: 50 })
    setHistoryLoading(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    setHistory((data ?? []) as HistoryRow[])
  }

  function openDrawer(u: UserRow) {
    setOpenId(u.id)
    setNewPlan(u.plan_type ?? '')
    setNewEmail('')
    setHistory(null)
    setCreditAmount(0)
  }

  function closeDrawer() {
    setOpenId(null)
    setHistory(null)
  }

  const filtered = users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Buscar por email ou ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
        </div>
        <button onClick={load} disabled={loading} className="px-3 py-2.5 rounded-lg bg-surface-300 border border-white/10 text-white/60 hover:text-white text-sm cursor-pointer disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Atualizar'}
        </button>
      </div>

      <p className="text-xs text-white/40">{filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'} {search && `(filtrado de ${users.length})`}</p>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum usuário encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} className={`bg-surface-300 border rounded-xl p-4 ${u.is_banned ? 'border-red-500/30' : 'border-white/5'}`}>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{u.email}</p>
                    {u.is_banned && <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold">BLOQUEADO</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 mt-1 flex-wrap">
                    <span className="font-mono text-[10px] text-white/30">{u.id.slice(0, 8)}…</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.status === 'active' || u.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{u.status ?? 'sem plano'}</span>
                    <span className="capitalize text-white/60">{u.plan_type ?? '—'}</span>
                    <span>Cadastro: {new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                    <span>Último: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') : 'nunca'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neon">{u.credits_remaining}</p>
                  <p className="text-[10px] text-white/30">de {u.credits_total} cr</p>
                </div>
                <button onClick={() => openId === u.id ? closeDrawer() : openDrawer(u)}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-primary-400 transition-colors cursor-pointer">
                  {openId === u.id ? <X size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>

              {openId === u.id && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                  {/* Ajustar créditos */}
                  <div className="flex items-center gap-2">
                    <Coins size={14} className="text-white/40 shrink-0" />
                    <input type="number" value={creditAmount} onChange={e => setCreditAmount(Number(e.target.value))} placeholder="Ex: 100 ou -50"
                      className="flex-1 px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
                    <button onClick={() => adjustCredits(u.email)} disabled={busy || creditAmount === 0}
                      className="px-3 py-2 rounded-lg bg-primary-600 text-white text-xs font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer">Ajustar</button>
                  </div>

                  {/* Alterar plano */}
                  <div className="flex items-center gap-2">
                    <Crown size={14} className="text-white/40 shrink-0" />
                    <select value={newPlan} onChange={e => setNewPlan(e.target.value)}
                      className="flex-1 px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500">
                      <option value="">Selecionar plano…</option>
                      {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                    </select>
                    <button onClick={() => changePlan(u)} disabled={busy || !newPlan || newPlan === u.plan_type}
                      className="px-3 py-2 rounded-lg bg-primary-600 text-white text-xs font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer">Trocar plano</button>
                  </div>

                  {/* Trocar email */}
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-white/40 shrink-0" />
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="novo@email.com"
                      className="flex-1 px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
                    <button onClick={() => changeEmail(u)} disabled={busy || !newEmail}
                      className="px-3 py-2 rounded-lg bg-primary-600 text-white text-xs font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer">Trocar</button>
                  </div>

                  {/* Bloquear / histórico */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleBan(u)} disabled={busy}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 ${u.is_banned ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'}`}>
                      {u.is_banned ? <><ShieldCheck size={14} /> Desbloquear</> : <><Ban size={14} /> Bloquear</>}
                    </button>
                    <button onClick={() => loadHistory(u.email)} disabled={historyLoading}
                      className="flex-1 px-3 py-2 rounded-lg bg-surface-400 text-white/70 hover:text-white text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5">
                      {historyLoading ? <Loader2 size={14} className="animate-spin" /> : <><History size={14} /> Ver histórico</>}
                    </button>
                  </div>

                  {/* Histórico */}
                  {history && (
                    <div className="bg-surface-400 rounded-lg p-3 max-h-64 overflow-y-auto">
                      <p className="text-[10px] text-white/40 mb-2">Últimas {history.length} operações</p>
                      {history.length === 0 ? (
                        <p className="text-xs text-white/30">Nenhum uso ainda</p>
                      ) : (
                        <ul className="space-y-1">
                          {history.map(h => (
                            <li key={h.id} className="flex items-center justify-between text-[11px]">
                              <span className="text-white/70">{h.tool_name}</span>
                              <span className="text-white/40">{h.credits_used} cr · <span className={h.status === 'success' ? 'text-green-400' : 'text-red-400'}>{h.status}</span> · {new Date(h.created_at).toLocaleString('pt-BR')}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
