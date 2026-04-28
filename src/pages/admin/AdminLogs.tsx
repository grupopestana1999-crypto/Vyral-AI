import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, Webhook, Server, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface LogRow {
  id: string
  user_email: string | null
  function_name: string
  provider: string
  status: string
  http_status: number | null
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

type FilterType = 'all' | 'errors' | 'hotmart' | 'edge_fns'

const FILTERS: { id: FilterType; label: string; icon: typeof Activity }[] = [
  { id: 'all', label: 'Todos', icon: Activity },
  { id: 'errors', label: 'Erros (HTTP ≥ 400)', icon: AlertTriangle },
  { id: 'hotmart', label: 'Webhook Hotmart', icon: Webhook },
  { id: 'edge_fns', label: 'Edge Functions', icon: Server },
]

export function AdminLogs() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase.from('api_logs').select('*').order('created_at', { ascending: false }).limit(300)
    if (filter === 'errors') q = q.gte('http_status', 400)
    else if (filter === 'hotmart') q = q.eq('function_name', 'hotmart-webhook')
    else if (filter === 'edge_fns') q = q.neq('provider', 'resend')
    const { data } = await q
    setLogs((data ?? []) as LogRow[])
    setLoading(false)
  }

  const filtered = search
    ? logs.filter(l => l.user_email?.toLowerCase().includes(search.toLowerCase()) || l.function_name?.toLowerCase().includes(search.toLowerCase()) || l.error_message?.toLowerCase().includes(search.toLowerCase()))
    : logs

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {FILTERS.map(f => {
          const Icon = f.icon
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filter === f.id ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
              }`}>
              <Icon size={12} />{f.label}
            </button>
          )
        })}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input type="text" placeholder="Buscar email, function ou mensagem de erro..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
      </div>

      <p className="text-xs text-white/40">{filtered.length} {filtered.length === 1 ? 'entrada' : 'entradas'}</p>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum log encontrado</p>
      ) : (
        <div className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-300">
                <tr className="border-b border-white/5 text-white/40 text-xs">
                  <th className="text-left p-3 font-medium">Data/Hora</th>
                  <th className="text-left p-3 font-medium">Usuário</th>
                  <th className="text-left p-3 font-medium">Function</th>
                  <th className="text-left p-3 font-medium">Provider</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Duração</th>
                  <th className="text-left p-3 font-medium">Erro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const isError = (log.http_status ?? 200) >= 400 || log.status !== 'success'
                  return (
                    <tr key={log.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${isError ? 'bg-red-500/5' : ''}`}>
                      <td className="p-3 text-white/40 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                      <td className="p-3 text-white/70 truncate max-w-[160px]">{log.user_email ?? '—'}</td>
                      <td className="p-3 text-primary-400 text-xs">{log.function_name}</td>
                      <td className="p-3 text-white/50 text-xs">{log.provider ?? '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isError ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {log.http_status ?? log.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-white/40 text-xs">{log.duration_ms ? `${log.duration_ms}ms` : '—'}</td>
                      <td className="p-3 text-red-400/80 text-xs truncate max-w-[200px]" title={log.error_message ?? ''}>{log.error_message ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
