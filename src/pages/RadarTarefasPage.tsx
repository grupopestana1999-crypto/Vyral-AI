import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, ArrowLeft, Lock, Loader2, ExternalLink, X, Briefcase, DollarSign, TrendingUp, Activity } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'
import { toast } from 'sonner'

const HOTMART_RADAR_URL = 'https://pay.hotmart.com/S104988352E?off=yzwfekht'

interface Opportunity {
  id: string
  title: string
  description: string | null
  what_client_wants: string | null
  expected_format: string | null
  vyral_tips: string | null
  external_url: string | null
  platform: string
  payment_min_brl: number
  payment_max_brl: number
  work_type: string | null
  difficulty: 'iniciante' | 'medio' | 'avancado'
  experience_level: string[]
  content_types: string[]
  goals: string[]
}

interface UserPrefs {
  experience_level: 'iniciante' | 'intermediario' | 'avancado'
  content_types: string[]
  daily_time_minutes: number
  goal: 'renda_extra' | 'viver_disso' | 'testar_mercado'
}

const CONTENT_OPTIONS = [
  { id: 'videos_curtos', label: 'Vídeos curtos (TikTok/Reels)' },
  { id: 'ugc', label: 'UGC' },
  { id: 'vsl', label: 'VSL' },
  { id: 'criativos_anuncios', label: 'Criativos pra anúncios' },
]

const DIFFICULTY_COLOR: Record<string, string> = {
  iniciante: 'bg-green-500/20 text-green-400',
  medio: 'bg-yellow-500/20 text-yellow-400',
  avancado: 'bg-red-500/20 text-red-400',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  iniciante: 'Iniciante',
  medio: 'Médio',
  avancado: 'Avançado',
}

function fmtBRL(n: number) { return `R$ ${n.toLocaleString('pt-BR')}` }

export function RadarTarefasPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [unlocked, setUnlocked] = useState(false)
  const [prefs, setPrefs] = useState<UserPrefs | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)

  // Form state
  const [form, setForm] = useState<UserPrefs>({
    experience_level: 'iniciante',
    content_types: [],
    daily_time_minutes: 60,
    goal: 'renda_extra',
  })

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [unlockRes, prefsRes] = await Promise.all([
        supabase.from('radar_unlocks').select('*').eq('user_email', user!.email!).maybeSingle(),
        supabase.from('radar_user_preferences').select('*').eq('user_email', user!.email!).maybeSingle(),
      ])
      if (cancelled) return
      const isUnlocked = !!unlockRes.data
      setUnlocked(isUnlocked)
      const userPrefs = prefsRes.data as UserPrefs | null
      setPrefs(userPrefs)
      if (isUnlocked && !userPrefs) setShowOnboarding(true)
      if (isUnlocked && userPrefs) await loadOpportunities(userPrefs)
      setLoading(false)
    }
    load()

    // Realtime: se admin libera/revoga acesso, atualiza UI sem F5
    const channel = supabase.channel('radar-unlock-' + user.email)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'radar_unlocks', filter: `user_email=eq.${user.email}` },
        () => { if (!cancelled) load() })
      .subscribe()

    // Refetch ao voltar pra aba (caso Realtime não chegue)
    function onFocus() { if (!cancelled) load() }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
    }
  }, [user?.email])

  async function loadOpportunities(p: UserPrefs) {
    const { data, error } = await supabase.from('radar_opportunities').select('*')
      .eq('is_active', true)
      .contains('experience_level', [p.experience_level])
      .order('payment_max_brl', { ascending: false })
      .limit(30)
    if (error) { console.error(error); return }
    // Filtro adicional client-side: pelo menos 1 content_type ou goal em comum
    const filtered = (data ?? []).filter(o => {
      const c = (o.content_types ?? []) as string[]
      const g = (o.goals ?? []) as string[]
      const matchContent = p.content_types.length === 0 || c.length === 0 || p.content_types.some(x => c.includes(x))
      const matchGoal = g.length === 0 || g.includes(p.goal)
      return matchContent && matchGoal
    })
    setOpportunities(filtered as Opportunity[])
  }

  function toggleContent(id: string) {
    setForm(f => ({
      ...f,
      content_types: f.content_types.includes(id) ? f.content_types.filter(x => x !== id) : [...f.content_types, id],
    }))
  }

  async function activateRadar() {
    if (!user?.email) return
    if (form.content_types.length === 0) { toast.error('Selecione pelo menos 1 tipo de conteúdo'); return }
    setAnalyzing(true)
    // Salvar preferências
    const { error } = await supabase.from('radar_user_preferences').upsert({
      user_email: user.email,
      ...form,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_email' })
    if (error) { toast.error('Erro: ' + error.message); setAnalyzing(false); return }
    // Animação de "análise" (UX)
    await new Promise(r => setTimeout(r, 1800))
    setPrefs(form)
    await loadOpportunities(form)
    setAnalyzing(false)
    setShowOnboarding(false)
    toast.success('Radar ativado! Veja as oportunidades selecionadas pra você.')
  }

  function resetPrefs() {
    setShowOnboarding(true)
    if (prefs) setForm(prefs)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-primary-400 animate-spin" />
      </div>
    )
  }

  // Paywall — usuário não comprou o produto
  if (!unlocked) {
    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
          <ArrowLeft size={14} /> Voltar
        </button>

        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Radar de Tarefas Vyral</h1>
          <p className="text-sm text-white/70 mb-6 max-w-md mx-auto">
            Acesso exclusivo. Receba oportunidades de freela personalizadas pra seu nível, tempo disponível e objetivo profissional.
          </p>
          <ul className="text-sm text-white/60 space-y-1.5 mb-6 max-w-md mx-auto text-left">
            <li>✓ Oportunidades atualizadas em tempo real</li>
            <li>✓ Filtragem por experiência, conteúdo e objetivo</li>
            <li>✓ Faixas de pagamento pra cada tarefa</li>
            <li>✓ Dicas de execução usando o próprio Vyral AI</li>
            <li>✓ Links diretos pra plataformas (Upwork, Fiverr, Workana)</li>
          </ul>
          <a
            href={HOTMART_RADAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:brightness-110 transition-all"
          >
            Desbloquear acesso <ArrowLeft size={16} className="rotate-180" />
          </a>
          <p className="text-[10px] text-white/30 mt-3">Compra única no Hotmart · libera acesso vitalício</p>
        </div>
      </div>
    )
  }

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Target size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Personalize seu Radar</h2>
              <p className="text-xs text-white/50">Responda 4 perguntas pra recebermos as melhores oportunidades pra você.</p>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/60 block mb-2">Nível de experiência</label>
            <div className="grid grid-cols-3 gap-2">
              {(['iniciante','intermediario','avancado'] as const).map(lvl => (
                <button key={lvl} onClick={() => setForm(f => ({ ...f, experience_level: lvl }))}
                  className={`py-2 rounded-lg text-xs font-medium capitalize cursor-pointer transition-all ${
                    form.experience_level === lvl ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                  }`}>{lvl === 'iniciante' ? 'Iniciante' : lvl === 'intermediario' ? 'Intermediário' : 'Avançado'}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/60 block mb-2">Tipo de conteúdo que quer trabalhar (1+)</label>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => toggleContent(opt.id)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all text-left ${
                    form.content_types.includes(opt.id) ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/60 block mb-2">Tempo disponível por dia (minutos)</label>
            <input type="number" min={15} max={480} value={form.daily_time_minutes}
              onChange={e => setForm(f => ({ ...f, daily_time_minutes: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface-400 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
          </div>

          <div>
            <label className="text-xs text-white/60 block mb-2">Objetivo principal</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'renda_extra', label: 'Renda extra' },
                { id: 'viver_disso', label: 'Viver disso' },
                { id: 'testar_mercado', label: 'Testar mercado' },
              ] as const).map(g => (
                <button key={g.id} onClick={() => setForm(f => ({ ...f, goal: g.id }))}
                  className={`py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    form.goal === g.id ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/60 hover:text-white'
                  }`}>{g.label}</button>
              ))}
            </div>
          </div>

          <button onClick={activateRadar} disabled={analyzing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:brightness-110 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
            {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analisando seu perfil...</> : <><Activity size={16} /> Ativar meu Radar</>}
          </button>
        </div>
      </div>
    )
  }

  // Lista de oportunidades
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
          <ArrowLeft size={14} /> Voltar
        </button>
        <button onClick={resetPrefs} className="text-xs text-white/40 hover:text-white cursor-pointer underline">Atualizar minhas preferências</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Target size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Radar de Tarefas Vyral</h1>
          <p className="text-sm text-white/50">{opportunities.length} oportunidades selecionadas pra você</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <p className="text-xs text-white/70"><span className="font-semibold text-green-400">Sistema ativo</span> · monitorando e atualizando em tempo real</p>
      </div>

      {opportunities.length === 0 ? (
        <p className="text-center text-white/40 py-12">Nenhuma oportunidade encontrada com suas preferências. Tente atualizar seu perfil.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {opportunities.map(o => (
            <div key={o.id} className="bg-surface-300 border border-white/5 rounded-xl p-4 hover:border-primary-500/30 transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white mb-1">{o.title}</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">{o.platform} · {o.work_type}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${DIFFICULTY_COLOR[o.difficulty]}`}>{DIFFICULTY_LABEL[o.difficulty]}</span>
              </div>
              <div className="flex items-center gap-2 text-xs mb-3">
                <DollarSign size={12} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold">{fmtBRL(o.payment_min_brl)} – {fmtBRL(o.payment_max_brl)}</span>
              </div>
              <button onClick={() => setSelectedOpp(o)}
                className="w-full py-2 rounded-lg bg-primary-600/20 text-primary-400 text-xs font-medium hover:bg-primary-600/30 cursor-pointer">
                Ver oportunidade
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalhes */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedOpp(null)}>
          <div className="bg-surface-300 border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{selectedOpp.title}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-medium">{selectedOpp.platform}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${DIFFICULTY_COLOR[selectedOpp.difficulty]}`}>{DIFFICULTY_LABEL[selectedOpp.difficulty]}</span>
                  <span className="text-xs text-emerald-400 font-semibold">{fmtBRL(selectedOpp.payment_min_brl)} – {fmtBRL(selectedOpp.payment_max_brl)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedOpp(null)} className="text-white/40 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            {selectedOpp.description && (
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wide mb-1 flex items-center gap-1.5"><Briefcase size={11} /> Descrição</p>
                <p className="text-sm text-white/80">{selectedOpp.description}</p>
              </div>
            )}

            {selectedOpp.what_client_wants && (
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wide mb-1">O que o cliente quer</p>
                <p className="text-sm text-white/80">{selectedOpp.what_client_wants}</p>
              </div>
            )}

            {selectedOpp.expected_format && (
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Formato esperado</p>
                <p className="text-sm text-white/80">{selectedOpp.expected_format}</p>
              </div>
            )}

            {selectedOpp.vyral_tips && (
              <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg p-3">
                <p className="text-xs text-purple-300 uppercase tracking-wide mb-1 flex items-center gap-1.5"><TrendingUp size={11} /> Dicas usando Vyral AI</p>
                <p className="text-sm text-white/80">{selectedOpp.vyral_tips}</p>
              </div>
            )}

            {selectedOpp.external_url && (
              <a href={selectedOpp.external_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:brightness-110 transition-all">
                <ExternalLink size={16} /> Ir pra plataforma de freelancer
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
