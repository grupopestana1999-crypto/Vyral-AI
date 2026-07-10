import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Coins, ChevronRight, Ban, ShieldCheck, Mail, History, Crown, X, Loader2, UserPlus, Radar, Send, Infinity as InfinityIcon, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { extractEdgeError } from '../../lib/adminErrors'

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
  // E65: campos do modelo unlimited/cap oculto vindos da RPC admin_list_users estendida.
  unlimited_daily: boolean
  lifetime_credits_used: number
  hidden_cap: number
  credits_used_today: number
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
  const [radarUnlocked, setRadarUnlocked] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', plan_type: 'starter' as 'starter' | 'creator' | 'pro', credits: 0, send_welcome: true })
  const [creating, setCreating] = useState(false)
  // E64: modo (Ilimitado/Créditos) do usuário aberto no drawer. Vem da RPC agora (E65).
  const [currentMode, setCurrentMode] = useState<'unlimited' | 'credits' | null>(null)
  // E65: filtro por modo na barra de busca.
  const [modeFilter, setModeFilter] = useState<'all' | 'unlimited' | 'credits'>('all')

  // load() pode rodar em modo "loud" (mostra skeleton — uso manual ou primeiro carregamento)
  // ou "silent" (atualiza dados sem skeleton — uso pelo realtime ou polling em background).
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const [usersRes, unlocksRes] = await Promise.all([
      supabase.rpc('admin_list_users'),
      supabase.from('radar_unlocks').select('user_email'),
    ])
    if (usersRes.error && !silent) toast.error('Erro ao carregar usuários: ' + usersRes.error.message)
    setRadarUnlocked(new Set((unlocksRes.data ?? []).map((r: { user_email: string }) => r.user_email)))
    setUsers((usersRes.data ?? []) as UserRow[])
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime: assina mudanças em subscriptions e em credit_usage_log pra refletir crédito/status
  // em tempo real. Reload silencioso (sem skeleton) pra atualização ser invisível.
  const reloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const triggerReload = () => {
      if (reloadDebounceRef.current) clearTimeout(reloadDebounceRef.current)
      reloadDebounceRef.current = setTimeout(() => load(true), 400)
    }
    const channel = supabase.channel('admin-users-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, triggerReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'credit_usage_log' }, triggerReload)
      .subscribe()
    // Polling de fallback a cada 15s — caso o realtime perca conexão (ex: rede instável),
    // o painel ainda fica fresco. Bem leve (1 RPC).
    const pollInterval = setInterval(() => load(true), 15_000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
      if (reloadDebounceRef.current) clearTimeout(reloadDebounceRef.current)
    }
  }, [load])

  async function toggleRadar(u: UserRow) {
    const isUnlocked = radarUnlocked.has(u.email)
    const action = isUnlocked ? 'revoke_radar' : 'grant_radar'
    const msg = isUnlocked ? `Revogar acesso ao Radar de Tarefas de ${u.email}?` : `Liberar acesso ao Radar de Tarefas pra ${u.email} (cortesia)?`
    if (!confirm(msg)) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
      body: { user_id: u.id, email: u.email, action },
    })
    setBusy(false)
    if (error || (data as { error?: string })?.error) toast.error(await extractEdgeError(error, data))
    else { toast.success(isUnlocked ? 'Acesso revogado' : 'Radar liberado'); load() }
  }

  async function adjustCredits(email: string) {
    if (creditAmount === 0) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-add-credits', { body: { email, amount: creditAmount } })
    setBusy(false)
    if (error || (data as { error?: string })?.error) toast.error(await extractEdgeError(error, data))
    else { toast.success(`${creditAmount > 0 ? '+' : ''}${creditAmount} créditos para ${email}`); setCreditAmount(0); load() }
  }

  // E65: pra user unlimited, "adicionar créditos" = resetar lifetime_credits_used (libera outros 600 do cap oculto).
  async function resetCap(email: string) {
    if (!confirm(`Resetar o cap oculto de ${email}?\n\nLibera outros ${users.find(u => u.email === email)?.hidden_cap ?? 600} créditos de uso pra ele. O contador volta pra zero.`)) return
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_reset_lifetime_credits', { _email: email })
    setBusy(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    const resp = data as { success?: boolean; error?: string; rows?: number }
    if (!resp?.success) { toast.error('Erro: ' + (resp?.error ?? 'desconhecido')); return }
    toast.success(`Cap resetado — ${email} liberado`)
    load(true)
  }

  async function changePlan(u: UserRow) {
    if (!newPlan || !PLAN_OPTIONS.includes(newPlan as typeof PLAN_OPTIONS[number])) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
      body: { user_id: u.id, email: u.email, action: 'change_plan', payload: { plan_type: newPlan } },
    })
    setBusy(false)
    if (error || (data as { error?: string })?.error) toast.error(await extractEdgeError(error, data))
    else { toast.success(`Plano alterado para ${newPlan}`); setNewPlan(''); load() }
  }

  async function toggleBan(u: UserRow) {
    if (!confirm(u.is_banned ? `Desbloquear ${u.email}?` : `Bloquear ${u.email}? Ele não conseguirá mais logar.`)) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
      body: { user_id: u.id, email: u.email, action: u.is_banned ? 'unban' : 'ban' },
    })
    setBusy(false)
    if (error || (data as { error?: string })?.error) toast.error(await extractEdgeError(error, data))
    else { toast.success(u.is_banned ? 'Desbloqueado' : 'Bloqueado'); load() }
  }

  async function changeEmail(u: UserRow) {
    if (!newEmail || !newEmail.includes('@')) { toast.error('Email inválido'); return }
    if (!confirm(`Trocar email de ${u.email} para ${newEmail}?`)) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
      body: { user_id: u.id, email: u.email, action: 'change_email', payload: { email: newEmail } },
    })
    setBusy(false)
    if (error || (data as { error?: string })?.error) toast.error(await extractEdgeError(error, data))
    else { toast.success('Email trocado'); setNewEmail(''); load() }
  }

  async function loadHistory(email: string) {
    setHistoryLoading(true)
    const { data, error } = await supabase.rpc('admin_user_history', { p_email: email, p_limit: 50 })
    setHistoryLoading(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    setHistory((data ?? []) as HistoryRow[])
  }

  async function resendWelcome(u: UserRow) {
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
      body: { user_id: u.id, email: u.email, action: 'resend_welcome' },
    })
    setBusy(false)
    if (error || (data as { error?: string })?.error) toast.error(await extractEdgeError(error, data))
    else toast.success(`Email de acesso reenviado pra ${u.email}`)
  }

  function openDrawer(u: UserRow) {
    setOpenId(u.id)
    setNewPlan(u.plan_type ?? '')
    setNewEmail('')
    setHistory(null)
    setCreditAmount(0)
    // E65: modo agora vem da RPC admin_list_users (não precisa mais SELECT extra).
    setCurrentMode(u.unlimited_daily ? 'unlimited' : 'credits')
  }

  function closeDrawer() {
    setOpenId(null)
    setHistory(null)
    setCurrentMode(null)
  }

  // E64: troca o modo de um usuário específico (acima do toggle global de venda).
  async function setMode(u: UserRow, mode: 'unlimited' | 'credits') {
    if (mode === currentMode || busy) return
    const label = mode === 'unlimited' ? 'ILIMITADO' : 'CRÉDITOS'
    const detail = mode === 'unlimited'
      ? 'Zera o saldo de créditos (não consome no modo ilimitado).'
      : 'Dá os créditos cheios do plano atual dele (Starter 600 / Creator 900 / Pro 1500).'
    if (!confirm(`Mudar ${u.email} para modo ${label}?\n\n${detail}`)) return
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_set_user_mode', { _email: u.email, _mode: mode })
    setBusy(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    const resp = data as { success?: boolean; error?: string; credits?: number }
    if (!resp?.success) { toast.error('Erro: ' + (resp?.error ?? 'desconhecido')); return }
    toast.success(mode === 'unlimited' ? 'Usuário agora é ILIMITADO' : `Usuário agora é CRÉDITOS (saldo: ${resp.credits} cr)`)
    setCurrentMode(mode)
    load(true)
  }

  async function createUser() {
    if (!createForm.email.includes('@')) { toast.error('Email inválido'); return }
    if (createForm.credits < 0) { toast.error('Créditos não pode ser negativo'); return }
    setCreating(true)
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
      body: { action: 'create_user', payload: createForm },
    })
    setCreating(false)
    if (error || (data as { error?: string })?.error) {
      toast.error(await extractEdgeError(error, data))
      return
    }
    toast.success(`Usuário ${createForm.email} criado com ${createForm.credits} créditos`)
    setCreateOpen(false)
    setCreateForm({ email: '', plan_type: 'starter', credits: 0, send_welcome: true })
    load()
  }

  const filtered = users.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search)
    if (!matchesSearch) return false
    if (modeFilter === 'unlimited') return u.unlimited_daily === true
    if (modeFilter === 'credits') return u.unlimited_daily === false && !!u.status
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Buscar por email ou ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
        </div>
        <div className="flex bg-surface-300 border border-white/10 rounded-lg p-0.5">
          {(['all','unlimited','credits'] as const).map(m => (
            <button key={m} onClick={() => setModeFilter(m)}
              className={`px-2.5 py-2 rounded-md text-xs font-medium cursor-pointer transition-colors ${modeFilter === m ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>
              {m === 'all' ? 'Todos' : m === 'unlimited' ? 'Ilimitados' : 'Créditos'}
            </button>
          ))}
        </div>
        <button onClick={() => setCreateOpen(true)} className="px-3 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium cursor-pointer hover:brightness-110 flex items-center gap-1.5">
          <UserPlus size={14} /> Criar usuário
        </button>
        <button onClick={() => load()} disabled={loading} className="px-3 py-2.5 rounded-lg bg-surface-300 border border-white/10 text-white/60 hover:text-white text-sm cursor-pointer disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Atualizar'}
        </button>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !creating && setCreateOpen(false)}>
          <div className="bg-surface-300 border border-white/10 rounded-xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><UserPlus size={18} className="text-primary-400" /> Criar novo usuário</h3>
              <button onClick={() => !creating && setCreateOpen(false)} className="text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <p className="text-xs text-white/50">Cria conta + subscription cortesia. Se ativado, envia email com magic link de primeiro acesso.</p>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-white/60">Email</span>
                <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="cliente@exemplo.com" autoFocus
                  className="mt-1 w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
              </label>
              <label className="block">
                <span className="text-xs text-white/60">Plano</span>
                <select value={createForm.plan_type} onChange={e => setCreateForm({ ...createForm, plan_type: e.target.value as 'starter' | 'creator' | 'pro' })}
                  className="mt-1 w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500">
                  <option value="starter">STARTER</option>
                  <option value="creator">CREATOR</option>
                  <option value="pro">PRO</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-white/60">Créditos iniciais</span>
                <input type="number" value={createForm.credits} onChange={e => setCreateForm({ ...createForm, credits: Number(e.target.value) })}
                  min={0} className="mt-1 w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={createForm.send_welcome} onChange={e => setCreateForm({ ...createForm, send_welcome: e.target.checked })} />
                <span className="text-xs text-white/70">Enviar email de boas-vindas com magic link</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setCreateOpen(false)} disabled={creating}
                className="flex-1 px-4 py-2 rounded-lg bg-surface-400 text-white/70 hover:text-white text-sm cursor-pointer disabled:opacity-50">Cancelar</button>
              <button onClick={createUser} disabled={creating || !createForm.email}
                className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium cursor-pointer hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1.5">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Criar
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-white/40">{filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'} {search && `(filtrado de ${users.length})`}</p>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum usuário encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} className={`bg-surface-300 border rounded-xl p-4 ${u.is_banned || u.status === 'cancelled' || u.status === 'refunded' ? 'border-red-500/30' : 'border-white/5'}`}>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white truncate">{u.email}</p>
                    {u.is_banned && <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold">BLOQUEADO</span>}
                    {!u.is_banned && (u.status === 'cancelled' || u.status === 'refunded') && <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold">REEMBOLSADO</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 mt-1 flex-wrap">
                    <span className="font-mono text-[10px] text-white/30">{u.id.slice(0, 8)}…</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.status === 'active' || u.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{u.status ?? 'sem plano'}</span>
                    <span className="capitalize text-white/60">{u.plan_type ?? '—'}</span>
                    <span>Cadastro: {new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                    <span>Último: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') : 'nunca'}</span>
                  </div>
                </div>
                <div className="text-right min-w-[110px]">
                  {u.unlimited_daily ? (
                    <>
                      <div className="flex items-center gap-1 justify-end text-purple-300">
                        <InfinityIcon size={13} />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Ilimitado</span>
                      </div>
                      <p className="text-[10px] text-white/40 mt-0.5">{u.lifetime_credits_used}/{u.hidden_cap} cap · {u.credits_used_today} hoje</p>
                      <div className="mt-1 h-1 w-full bg-surface-400 rounded-full overflow-hidden">
                        <div className={`h-full ${u.lifetime_credits_used >= u.hidden_cap ? 'bg-red-500' : u.lifetime_credits_used > u.hidden_cap * 0.8 ? 'bg-amber-500' : 'bg-purple-500'}`}
                          style={{ width: `${Math.min(100, (u.lifetime_credits_used / Math.max(1, u.hidden_cap)) * 100)}%` }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-neon">{u.credits_remaining}</p>
                      <p className="text-[10px] text-white/30">de {u.credits_total} cr</p>
                    </>
                  )}
                </div>
                <button onClick={() => openId === u.id ? closeDrawer() : openDrawer(u)}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-primary-400 transition-colors cursor-pointer">
                  {openId === u.id ? <X size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>

              {openId === u.id && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                  {/* E64: Modo do usuário (Ilimitado x Créditos) */}
                  <div>
                    <p className="text-[10px] text-white/40 uppercase mb-1.5">Modo</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setMode(u, 'unlimited')} disabled={busy || currentMode === null}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${currentMode === 'unlimited' ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>
                        <InfinityIcon size={13} /> Ilimitado{currentMode === 'unlimited' ? ' ✓' : ''}
                      </button>
                      <button onClick={() => setMode(u, 'credits')} disabled={busy || currentMode === null}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${currentMode === 'credits' ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>
                        <Coins size={13} /> Créditos{currentMode === 'credits' ? ' ✓' : ''}
                      </button>
                    </div>
                  </div>

                  {/* E65: Botão de reset do cap oculto — só faz sentido pra unlimited. */}
                  {currentMode === 'unlimited' && (
                    <div>
                      <div className="bg-surface-400/50 rounded-lg p-3 mb-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-white/40 uppercase">Cap oculto (E65)</span>
                          <span className="text-[10px] text-white/60 font-mono">{u.lifetime_credits_used}/{u.hidden_cap}</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-300 rounded-full overflow-hidden">
                          <div className={`h-full ${u.lifetime_credits_used >= u.hidden_cap ? 'bg-red-500' : u.lifetime_credits_used > u.hidden_cap * 0.8 ? 'bg-amber-500' : 'bg-purple-500'}`}
                            style={{ width: `${Math.min(100, (u.lifetime_credits_used / Math.max(1, u.hidden_cap)) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-white/40 mt-1.5">Consumo hoje: {u.credits_used_today} cr</p>
                      </div>
                      <button onClick={() => resetCap(u.email)} disabled={busy}
                        className="w-full px-3 py-2 rounded-lg bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                        <RefreshCw size={13} /> Resetar cap oculto (libera +{u.hidden_cap} cr)
                      </button>
                    </div>
                  )}

                  {/* Ajustar créditos — só faz sentido pra credit-mode. Pra unlimited, o botão "Resetar cap" acima cumpre o papel. */}
                  {currentMode !== 'unlimited' && (
                    <div className="flex items-center gap-2">
                      <Coins size={14} className="text-white/40 shrink-0" />
                      <input type="number" value={creditAmount} onChange={e => setCreditAmount(Number(e.target.value))} placeholder="Ex: 100 ou -50"
                        className="flex-1 px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
                      <button onClick={() => adjustCredits(u.email)} disabled={busy || creditAmount === 0}
                        className="px-3 py-2 rounded-lg bg-primary-600 text-white text-xs font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer">Ajustar</button>
                    </div>
                  )}

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

                  {/* Reenviar email de acesso */}
                  <div>
                    <button onClick={() => resendWelcome(u)} disabled={busy}
                      className="w-full px-3 py-2 rounded-lg bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Reenviar email de acesso
                    </button>
                  </div>

                  {/* Radar de Tarefas */}
                  <div>
                    <button onClick={() => toggleRadar(u)} disabled={busy}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 ${radarUnlocked.has(u.email) ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30' : 'bg-surface-400 text-white/70 hover:text-white'}`}>
                      <Radar size={14} /> {radarUnlocked.has(u.email) ? 'Revogar Radar de Tarefas' : 'Liberar Radar de Tarefas (cortesia)'}
                    </button>
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
