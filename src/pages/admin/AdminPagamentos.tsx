import { useState, useEffect } from 'react'
import { Search, CreditCard, Send, Loader2, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface SubRow {
  id: string
  customer_email: string
  offer_name: string | null
  status: string
  plan_type: string | null
  credits_total: number
  credits_remaining: number
  hotmart_transaction_id: string | null
  stripe_session_id: string | null
  created_at: string
  expires_at: string | null
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  approved: 'bg-green-500/20 text-green-400',
  expired: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-red-500/20 text-red-400',
}

const PLAN_PRICE: Record<string, number> = { starter: 47, creator: 97, pro: 197 }

export function AdminPagamentos() {
  const [rows, setRows] = useState<SubRow[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) toast.error('Erro: ' + error.message)
    setRows((data ?? []) as SubRow[])
    setLoading(false)
  }

  async function resend(email: string) {
    setResending(email)
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: { email, action: 'resend_welcome' },
    })
    setResending(null)
    if (error) toast.error('Falha ao reenviar: ' + error.message)
    else toast.success(`Email reenviado pra ${email}`)
  }

  const filtered = rows.filter(r => {
    const matchSearch = r.customer_email?.toLowerCase().includes(search.toLowerCase()) || r.hotmart_transaction_id?.includes(search)
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const statuses = ['all', 'active', 'approved', 'expired', 'cancelled']

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Buscar email ou transaction_id..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
          {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'Todos status' : s}</option>)}
        </select>
        <button onClick={load} disabled={loading} className="px-3 py-2.5 rounded-lg bg-surface-300 border border-white/10 text-white/60 hover:text-white text-sm cursor-pointer disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Atualizar'}
        </button>
      </div>

      <p className="text-xs text-white/40">{filtered.length} {filtered.length === 1 ? 'pagamento' : 'pagamentos'}</p>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum pagamento encontrado</p>
      ) : (
        <div className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs">
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Plano</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium">Origem / TX ID</th>
                <th className="text-right p-3 font-medium">Data</th>
                <th className="text-center p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isHotmart = !!r.hotmart_transaction_id
                const txId = r.hotmart_transaction_id ?? r.stripe_session_id
                const valor = r.plan_type ? PLAN_PRICE[r.plan_type] ?? 0 : 0
                return (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 text-white/80 truncate max-w-[200px]">{r.customer_email}</td>
                    <td className="p-3"><span className="capitalize text-primary-300">{r.plan_type ?? '—'}</span></td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-500/20 text-gray-400'}`}>{r.status}</span></td>
                    <td className="p-3 text-right text-neon font-semibold">R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-xs">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isHotmart ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        <CreditCard size={10} />{isHotmart ? 'Hotmart' : 'Stripe'}
                      </span>
                      <span className="font-mono text-white/30 ml-2">{txId ? txId.slice(0, 16) + '…' : '—'}</span>
                    </td>
                    <td className="p-3 text-right text-white/50 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => resend(r.customer_email)} disabled={resending === r.customer_email}
                        title="Reenviar email com magic link" className="p-1.5 rounded-lg hover:bg-primary-600/20 text-primary-400 disabled:opacity-50 cursor-pointer">
                        {resending === r.customer_email ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-white/40 bg-surface-300/50 border border-white/5 rounded-lg p-3">
        <ExternalLink size={12} className="mt-0.5 shrink-0" />
        <span>Webhook Hotmart configurado em <code className="text-primary-400">/functions/v1/hotmart-webhook</code>. Compras aprovadas criam conta automaticamente + enviam email com magic link (1 hora de validade).</span>
      </div>
    </div>
  )
}
