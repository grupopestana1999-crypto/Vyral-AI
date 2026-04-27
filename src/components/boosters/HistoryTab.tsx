import { useEffect, useState, useCallback } from 'react'
import { Loader2, Download, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth-store'
import { toast } from 'sonner'

interface HistoryItem {
  id: string
  tool_name: string
  status: string
  result_url: string | null
  external_task_id: string | null
  created_at: string
  credits_used: number
}

interface Props {
  /** tool_name filter, ex: 'grok_video' */
  tool: string
  /** Tipo de mídia exibida — 'video' renderiza <video>, 'image' <img> */
  mediaType?: 'video' | 'image'
}

export function HistoryTab({ tool, mediaType = 'video' }: Props) {
  const { user } = useAuthStore()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user?.email) return
    const { data, error } = await supabase
      .from('credit_usage_log')
      .select('id, tool_name, status, result_url, external_task_id, created_at, credits_used')
      .eq('user_email', user.email)
      .eq('tool_name', tool)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error && data) setItems(data as HistoryItem[])
    setLoading(false)
  }, [user?.email, tool])

  useEffect(() => { load() }, [load])

  // Polling a cada 30s pra atualizar tasks pendentes
  useEffect(() => {
    if (!items.some(i => i.status === 'pending')) return
    const t = setInterval(refreshPending, 30_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  async function refreshPending() {
    const pending = items.filter(i => i.status === 'pending' && i.external_task_id)
    if (pending.length === 0) return
    setRefreshing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      await Promise.all(pending.map(async (it) => {
        try {
          await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/check-kie-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
            body: JSON.stringify({ task_id: it.external_task_id, tool_name: tool }),
          })
        } catch { /* silent */ }
      }))
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  async function manualRefresh() {
    setRefreshing(true)
    await refreshPending()
    await load()
    setRefreshing(false)
  }

  async function download(url: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const ext = mediaType === 'video' ? 'mp4' : 'png'
      a.download = `${tool}-${Date.now()}.${ext}`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Baixado!')
    } catch {
      window.open(url, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-primary-400 animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-white/40">Nenhuma geração ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">{items.length} geraç{items.length === 1 ? 'ão' : 'ões'}</p>
        <button
          onClick={manualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-lg bg-surface-400 border border-white/10 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {items.map(it => (
          <div key={it.id} className="bg-surface-300 border border-white/5 rounded-xl overflow-hidden">
            <div className="aspect-video bg-surface-400 flex items-center justify-center relative">
              {it.result_url ? (
                mediaType === 'video' ? (
                  <video src={it.result_url} className="w-full h-full object-cover" controls preload="metadata" />
                ) : (
                  <img src={it.result_url} alt="" className="w-full h-full object-cover" />
                )
              ) : it.status === 'pending' ? (
                <div className="flex flex-col items-center gap-2 text-white/40">
                  <Loader2 size={20} className="animate-spin text-primary-400" />
                  <span className="text-[11px]">Processando…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-red-400">
                  <AlertCircle size={20} />
                  <span className="text-[11px]">Falhou</span>
                </div>
              )}
              <div className="absolute top-1.5 left-1.5">
                {it.status === 'pending' ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/30 text-amber-200 backdrop-blur flex items-center gap-1">
                    <Clock size={9} /> Processando
                  </span>
                ) : it.status === 'failed' ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/30 text-red-200 backdrop-blur">Falhou</span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/30 text-emerald-200 backdrop-blur flex items-center gap-1">
                    <CheckCircle2 size={9} /> Pronto
                  </span>
                )}
              </div>
            </div>
            <div className="p-2.5 flex items-center justify-between text-[11px]">
              <span className="text-white/50">{new Date(it.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              {it.result_url && (
                <button onClick={() => download(it.result_url!)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 cursor-pointer">
                  <Download size={11} /> Baixar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
