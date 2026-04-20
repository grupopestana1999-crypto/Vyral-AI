import { useState, useEffect } from 'react'
import { Search, Coins, RotateCcw, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface UserRow {
  id: string
  email: string
  created_at: string
  subscription?: { plan_type: string; credits_remaining: number; status: string } | null
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
    const mapped: UserRow[] = (data ?? []).map(s => ({
      id: s.id,
      email: s.customer_email,
      created_at: s.created_at,
      subscription: { plan_type: s.plan_type, credits_remaining: s.credits_remaining, status: s.status },
    }))
    setUsers(mapped)
    setLoading(false)
  }

  async function adjustCredits(email: string) {
    if (creditAmount === 0) return
    const { error } = await supabase.functions.invoke('admin-add-credits', {
      body: { email, amount: creditAmount },
    })
    if (error) {
      toast.error('Erro ao ajustar créditos')
    } else {
      toast.success(`${creditAmount > 0 ? '+' : ''}${creditAmount} créditos para ${email}`)
      setAdjusting(null)
      setCreditAmount(0)
      load()
    }
  }

  const filtered = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Buscar por email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-300 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500"
        />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-surface-300 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-white/30 py-8">Nenhum usuário encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} className="bg-surface-300 border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.email}</p>
                  <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      u.subscription?.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>{u.subscription?.status ?? 'sem plano'}</span>
                    <span className="capitalize">{u.subscription?.plan_type ?? '-'}</span>
                    <span>{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neon">{u.subscription?.credits_remaining ?? 0}</p>
                  <p className="text-[10px] text-white/30">créditos</p>
                </div>
                <button
                  onClick={() => setAdjusting(adjusting === u.id ? null : u.id)}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-primary-400 transition-colors cursor-pointer"
                >
                  {adjusting === u.id ? <RotateCcw size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
              {adjusting === u.id && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                  <Coins size={16} className="text-white/40" />
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={e => setCreditAmount(Number(e.target.value))}
                    placeholder="Ex: 100 ou -50"
                    className="flex-1 px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                  <button
                    onClick={() => adjustCredits(u.email)}
                    className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
