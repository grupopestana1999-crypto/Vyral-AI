import { useState, useEffect } from 'react'
import { Mail, Search, RotateCw, Loader2, CheckCircle2, AlertCircle, Inbox } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

// Lista todos clientes pagantes (subscriptions) com botão pra reenviar email de acesso.
// Mostra também o último log Resend pra cada um (se houver) — útil pra ver quem já recebeu vs falhou.

interface Row {
  email: string
  plan: string | null
  status: string
  is_courtesy: boolean
  created_at: string
  // Último log Resend pra esse email (opcional)
  last_email_status: 'success' | 'error' | 'never' | string
  last_email_at: string | null
  last_email_error: string | null
}

interface SubscriptionRow {
  customer_email: string
  plan_type: string | null
  status: string
  is_courtesy: boolean
  created_at: string
}

interface ApiLogRow {
  user_email: string | null
  status: string
  error_message: string | null
  created_at: string
}

export function AdminEmail() {
  const [rows, setRows] = useState<Row[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed' | 'never'>('all')
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [subsRes, logsRes] = await Promise.all([
      supabase.from('subscriptions').select('customer_email, plan_type, status, is_courtesy, created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('api_logs').select('user_email, status, error_message, created_at').or('provider.eq.resend,function_name.like.%email%,function_name.like.%welcome%').order('created_at', { ascending: false }).limit(500),
    ])
    if (subsRes.error) toast.error('Erro ao carregar pagantes: ' + subsRes.error.message)

    const lastByEmail = new Map<string, ApiLogRow>()
    for (const log of (logsRes.data ?? []) as ApiLogRow[]) {
      const k = (log.user_email ?? '').toLowerCase()
      if (!k) continue
      if (!lastByEmail.has(k)) lastByEmail.set(k, log)
    }

    const seen = new Set<string>()
    const out: Row[] = []
    for (const s of (subsRes.data ?? []) as SubscriptionRow[]) {
      const email = s.customer_email?.toLowerCase()
      if (!email || seen.has(email)) continue
      seen.add(email)
      const log = lastByEmail.get(email)
      out.push({
        email: s.customer_email,
        plan: s.plan_type,
        status: s.status,
        is_courtesy: s.is_courtesy,
        created_at: s.created_at,
        last_email_status: log?.status ?? 'never',
        last_email_at: log?.created_at ?? null,
        last_email_error: log?.error_message ?? null,
      })
    }
    setRows(out)
    setLoading(false)
  }

  async function resend(email: string) {
    setResending(email)
    const { error } = await supabase.functions.invoke('admin-update-user', { body: { email, action: 'resend_welcome' } })
    setResending(null)
    if (error) toast.error('Falha: ' + error.message)
    else { toast.success(`Reenviado pra ${email}`); load() }
  }

  const filtered = rows.filter(r => {
    const matchSearch = !search || r.email.toLowerCase().includes(search.toLowerCase())
    let matchStatus = true
    if (statusFilter === 'sent') matchStatus = r.last_email_status === 'success'
    else if (statusFilter === 'failed') matchStatus = r.last_email_status !== 'success' && r.last_email_status !== 'never'
    else if (statusFilter === 'never') matchStatus = r.last_email_status === 'never'
    return matchSearch && matchStatus
  })

  const totals = {
    paying: rows.length,
    sent: rows.filter(r => r.last_email_status === 'success').length,
    failed: rows.filter(r => r.last_email_status !== 'success' && r.last_email_status !== 'never').length,
    never: rows.filter(r => r.last_email_status === 'never').length,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-300 border border-white/5 rounded-xl p-3 flex items-center gap-2">
          <Mail size={18} className="text-primary-400" />
          <div>
            <p className="text-lg font-bold text-white">{totals.paying}</p>
            <p className="text-[10px] text-white/40">Pagantes</p>
          </div>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-green-400" />
          <div>
            <p className="text-lg font-bold text-green-400">{totals.sent}</p>
            <p className="text-[10px] text-white/40">Email enviado</p>
          </div>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle size={18} className="text-red-400" />
          <div>
            <p className="text-lg font-bold text-red-400">{totals.failed}</p>
            <p className="text-[10px] text-white/40">Falha no envio</p>
          </div>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-3 flex items-center gap-2">
          <Inbox size={18} className="text-yellow-400" />
          <div>
            <p className="text-lg font-bold text-yellow-400">{totals.never}</p>
            <p className="text-[10px] text-white/40">Nunca enviado</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Buscar por email..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'sent' | 'failed' | 'never')}
          className="px-3 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
          <option value="all">Todos</option>
          <option value="sent">Email enviado</option>
          <option value="failed">Falha</option>
          <option value="never">Nunca enviado</option>
        </select>
        <button onClick={load} disabled={loading} className="px-3 py-2.5 rounded-lg bg-surface-300 border border-white/10 text-white/60 hover:text-white text-sm cursor-pointer disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Atualizar'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum cliente encontrado</p>
      ) : (
        <div className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs">
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Plano</th>
                <th className="text-center p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Erro último</th>
                <th className="text-right p-3 font-medium">Compra</th>
                <th className="text-center p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.email} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 text-white/80 truncate max-w-[220px]"><Mail size={12} className="inline mr-1.5 text-white/30" />{r.email}</td>
                  <td className="p-3 capitalize text-primary-300 text-xs">{r.plan ?? '—'}{r.is_courtesy && ' (cortesia)'}</td>
                  <td className="p-3 text-center">
                    {r.last_email_status === 'success' && <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium">enviado</span>}
                    {r.last_email_status === 'never' && <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-medium">nunca enviado</span>}
                    {r.last_email_status !== 'success' && r.last_email_status !== 'never' && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-medium">falha</span>}
                  </td>
                  <td className="p-3 text-xs text-red-400/80 truncate max-w-[200px]" title={r.last_email_error ?? ''}>{r.last_email_error ?? '—'}</td>
                  <td className="p-3 text-right text-white/50 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => resend(r.email)} disabled={resending === r.email}
                      title="Reenviar email de acesso" className="p-1.5 rounded-lg hover:bg-primary-600/20 text-primary-400 disabled:opacity-50 cursor-pointer">
                      {resending === r.email ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
