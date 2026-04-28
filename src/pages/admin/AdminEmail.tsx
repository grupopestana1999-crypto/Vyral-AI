import { useState, useEffect } from 'react'
import { Mail, Search, RotateCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface EmailLog {
  id: string
  user_email: string | null
  function_name: string
  provider: string
  status: string
  http_status: number | null
  error_message: string | null
  created_at: string
}

export function AdminEmail() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all')
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('api_logs').select('*')
      .or('provider.eq.resend,function_name.like.*email*,function_name.like.*welcome*')
      .order('created_at', { ascending: false }).limit(200)
    if (error) toast.error('Erro: ' + error.message)
    setLogs((data ?? []) as EmailLog[])
    setLoading(false)
  }

  async function resend(email: string) {
    setResending(email)
    const { error } = await supabase.functions.invoke('admin-update-user', { body: { email, action: 'resend_welcome' } })
    setResending(null)
    if (error) toast.error('Falha: ' + error.message)
    else toast.success(`Reenviado pra ${email}`)
  }

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.user_email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || (statusFilter === 'success' ? l.status === 'success' : l.status !== 'success')
    return matchSearch && matchStatus
  })

  const totals = {
    sent: logs.filter(l => l.status === 'success').length,
    failed: logs.filter(l => l.status !== 'success').length,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-400" />
          <div>
            <p className="text-2xl font-bold text-green-400">{totals.sent}</p>
            <p className="text-[10px] text-white/40">Entregues (últ. 200)</p>
          </div>
        </div>
        <div className="bg-surface-300 border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-400" />
          <div>
            <p className="text-2xl font-bold text-red-400">{totals.failed}</p>
            <p className="text-[10px] text-white/40">Falhas (últ. 200)</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Buscar por email..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'success' | 'error')}
          className="px-3 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
          <option value="all">Todos</option>
          <option value="success">Entregues</option>
          <option value="error">Falhas</option>
        </select>
        <button onClick={load} disabled={loading} className="px-3 py-2.5 rounded-lg bg-surface-300 border border-white/10 text-white/60 hover:text-white text-sm cursor-pointer disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Atualizar'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum email encontrado</p>
      ) : (
        <div className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs">
                <th className="text-left p-3 font-medium">Destinatário</th>
                <th className="text-left p-3 font-medium">Template</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Erro</th>
                <th className="text-right p-3 font-medium">Data</th>
                <th className="text-center p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 text-white/80 truncate max-w-[200px]"><Mail size={12} className="inline mr-1.5 text-white/30" />{l.user_email ?? '—'}</td>
                  <td className="p-3 text-primary-400 text-xs">{l.function_name}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${l.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {l.status}{l.http_status ? ` (${l.http_status})` : ''}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-red-400/80 truncate max-w-[200px]" title={l.error_message ?? ''}>{l.error_message ?? '—'}</td>
                  <td className="p-3 text-right text-white/50 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                  <td className="p-3 text-center">
                    {l.user_email && (
                      <button onClick={() => resend(l.user_email!)} disabled={resending === l.user_email}
                        title="Reenviar email" className="p-1.5 rounded-lg hover:bg-primary-600/20 text-primary-400 disabled:opacity-50 cursor-pointer">
                        {resending === l.user_email ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                      </button>
                    )}
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
