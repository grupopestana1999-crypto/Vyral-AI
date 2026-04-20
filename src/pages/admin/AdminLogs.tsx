import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface LogEntry {
  id: string
  user_email: string
  tool_name: string
  credits_used: number
  status: string
  created_at: string
}

export function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('credit_usage_log').select('*').order('created_at', { ascending: false }).limit(200)
      setLogs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-primary-400" />
        <p className="text-sm text-white/50">Últimas 200 operações</p>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum log encontrado</p>
      ) : (
        <div className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-300">
                <tr className="border-b border-white/5 text-white/40 text-xs">
                  <th className="text-left p-3 font-medium">Data/Hora</th>
                  <th className="text-left p-3 font-medium">Usuário</th>
                  <th className="text-left p-3 font-medium">Ferramenta</th>
                  <th className="text-center p-3 font-medium">Créditos</th>
                  <th className="text-center p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 text-white/40 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-white/80 truncate max-w-[180px]">{log.user_email}</td>
                    <td className="p-3 text-primary-400">{log.tool_name}</td>
                    <td className="p-3 text-center text-neon font-semibold">{log.credits_used}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
