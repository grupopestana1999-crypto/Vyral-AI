import { useState, useEffect } from 'react'
import { Sparkles, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CreditUsageLog } from '../../types/database'
import { TOOL_LABELS } from '../../types/credits'

export function AdminGenerations() {
  const [logs, setLogs] = useState<CreditUsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [toolFilter, setToolFilter] = useState('all')

  useEffect(() => { load() }, [toolFilter])

  async function load() {
    setLoading(true)
    let q = supabase.from('credit_usage_log').select('*').order('created_at', { ascending: false }).limit(100)
    if (toolFilter !== 'all') q = q.eq('tool_name', toolFilter)
    const { data } = await q
    setLogs(data ?? [])
    setLoading(false)
  }

  const tools = ['all', ...Object.keys(TOOL_LABELS)]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={14} className="text-white/40 shrink-0" />
        {tools.map(t => (
          <button key={t} onClick={() => setToolFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              toolFilter === t ? 'bg-primary-600 text-white' : 'bg-surface-300 text-white/50 border border-white/10 hover:text-white'
            }`}>{t === 'all' ? 'Todos' : TOOL_LABELS[t] ?? t}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhuma geração encontrada</p>
      ) : (
        <div className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs">
                <th className="text-left p-3 font-medium">Usuário</th>
                <th className="text-left p-3 font-medium">Ferramenta</th>
                <th className="text-center p-3 font-medium">Créditos</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 text-white/80 truncate max-w-[200px]">{log.user_email}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1.5 text-primary-400">
                      <Sparkles size={12} />
                      {TOOL_LABELS[log.tool_name] ?? log.tool_name}
                    </span>
                  </td>
                  <td className="p-3 text-center text-neon font-semibold">{log.credits_used}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>{log.status}</span>
                  </td>
                  <td className="p-3 text-right text-white/40 text-xs">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
