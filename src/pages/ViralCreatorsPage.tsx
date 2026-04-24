import { useState, useEffect } from 'react'
import { Users, ExternalLink, DollarSign, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Creator } from '../types/database'

function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtCurrency(n: number) { return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

export function ViralCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('creators').select('*').eq('is_active', true).order('projected_monthly_sales', { ascending: false })
      setCreators(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const rankStyle = (i: number) => {
    if (i === 0) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    if (i === 1) return 'bg-gray-400/20 text-gray-300 border-gray-400/30'
    if (i === 2) return 'bg-orange-600/20 text-orange-400 border-orange-600/30'
    return 'bg-surface-400 text-white/40 border-transparent'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Users size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Criadores Virais</h1>
          <p className="text-sm text-white/50">Ranking dos criadores que mais faturam</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-surface-300 rounded-xl animate-pulse" />)}
        </div>
      ) : creators.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <UserCheck size={48} className="text-white/20 mb-3" />
          <p className="text-white/40">Nenhum criador encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {creators.map((c, i) => (
            <div key={c.id} className="flex items-center gap-4 bg-surface-300 border border-white/5 rounded-xl p-4 hover:border-primary-500/30 transition-all">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${rankStyle(i)}`}>
                {i + 1}
              </div>
              {c.avatar_url ? (
                <img src={c.avatar_url} alt={c.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10" loading="lazy" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-surface-400 flex items-center justify-center"><Users size={18} className="text-white/20" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">@{c.username ?? c.name}</p>
                <p className="text-xs text-white/40">{fmt(c.followers)} seguidores</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-semibold text-neon">
                  <DollarSign size={14} />
                  {fmtCurrency(c.projected_monthly_sales)}
                </div>
                <p className="text-[10px] text-white/30">projeção/mês</p>
              </div>
              {c.profile_url && (
                <a href={c.profile_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-primary-400 transition-colors">
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
