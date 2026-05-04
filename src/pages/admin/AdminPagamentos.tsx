import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, CreditCard, Send, Loader2, ExternalLink, Gift } from 'lucide-react'
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
  purchase_price_brl: number | null
  is_courtesy: boolean
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

export function AdminPagamentos() {
  const [rows, setRows] = useState<SubRow[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [originFilter, setOriginFilter] = useState<'all' | 'hotmart' | 'stripe' | 'courtesy'>('all')
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(500)
    if (error && !silent) toast.error('Erro: ' + error.message)
    setRows((data ?? []) as SubRow[])
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime + polling fallback: refund/credit flip aparece sem refresh manual.
  const reloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const channel = supabase.channel('admin-pagamentos-subs-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        if (reloadDebounceRef.current) clearTimeout(reloadDebounceRef.current)
        reloadDebounceRef.current = setTimeout(() => load(true), 400)
      })
      .subscribe()
    const pollInterval = setInterval(() => load(true), 15_000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
      if (reloadDebounceRef.current) clearTimeout(reloadDebounceRef.current)
    }
  }, [load])

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
    const matchSearch = r.customer_email?.toLowerCase().includes(search.toLowerCase()) || r.hotmart_transaction_id?.includes(search) || r.stripe_session_id?.includes(search)
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const origin = r.is_courtesy ? 'courtesy' : r.hotmart_transaction_id ? 'hotmart' : r.stripe_session_id ? 'stripe' : 'courtesy'
    const matchOrigin = originFilter === 'all' || origin === originFilter
    return matchSearch && matchStatus && matchOrigin
  })

  const statuses = ['all', 'active', 'approved', 'expired', 'cancelled', 'refunded']

  // Totais visíveis
  const totalRevenue = filtered.reduce((sum, r) => sum + (r.purchase_price_brl || 0), 0)
  const courtesyCount = filtered.filter(r => r.is_courtesy).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-surface-300 border border-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase">Total visível</p>
          <p className="text-lg font-bold text-white">{filtered.length}</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase">Receita visível</p>
          <p className="text-lg font-bold text-neon">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase">Cortesias</p>
          <p className="text-lg font-bold text-yellow-400">{courtesyCount}</p>
        </div>
      </div>

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
        <select value={originFilter} onChange={e => setOriginFilter(e.target.value as 'all' | 'hotmart' | 'stripe' | 'courtesy')}
          className="px-3 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
          <option value="all">Todas origens</option>
          <option value="hotmart">Hotmart</option>
          <option value="stripe">Stripe</option>
          <option value="courtesy">Cortesia</option>
        </select>
        <button onClick={() => load()} disabled={loading} className="px-3 py-2.5 rounded-lg bg-surface-300 border border-white/10 text-white/60 hover:text-white text-sm cursor-pointer disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Atualizar'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum pagamento encontrado</p>
      ) : (
        <div className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs">
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Plano</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Valor pago</th>
                <th className="text-left p-3 font-medium">Origem / TX ID</th>
                <th className="text-right p-3 font-medium">Data</th>
                <th className="text-center p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isHotmart = !!r.hotmart_transaction_id
                const isStripe = !!r.stripe_session_id
                const txId = r.hotmart_transaction_id ?? r.stripe_session_id
                const valor = r.is_courtesy ? null : r.purchase_price_brl
                return (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 text-white/80 truncate max-w-[200px]">{r.customer_email}</td>
                    <td className="p-3"><span className="capitalize text-primary-300">{r.plan_type ?? '—'}</span></td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-500/20 text-gray-400'}`}>{r.status}</span></td>
                    <td className="p-3 text-right font-semibold">
                      {r.is_courtesy ? (
                        <span className="text-yellow-400">Cortesia</span>
                      ) : valor != null ? (
                        <span className="text-neon">R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {r.is_courtesy ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/20 text-yellow-400">
                          <Gift size={10} />Cortesia Admin
                        </span>
                      ) : (
                        <>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isHotmart ? 'bg-orange-500/20 text-orange-400' : isStripe ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            <CreditCard size={10} />{isHotmart ? 'Hotmart' : isStripe ? 'Stripe' : '—'}
                          </span>
                          {txId && <span className="font-mono text-white/30 ml-2">{txId.slice(0, 16) + '…'}</span>}
                        </>
                      )}
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
        <span>Webhook Hotmart configurado em <code className="text-primary-400">/functions/v1/hotmart-webhook</code>. Compras aprovadas criam conta automaticamente + enviam email com magic link. <strong>Cortesias</strong> são contas criadas pelo admin (sem pagamento real).</span>
      </div>
    </div>
  )
}
