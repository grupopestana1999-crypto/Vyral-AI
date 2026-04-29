import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import logoImg from '../assets/logo.png'

type State = 'verifying' | 'ready' | 'no_session' | 'saving' | 'done'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    let cancelled = false
    let resolved = false

    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      if (cancelled || resolved) return
      if (data.session?.user) {
        resolved = true
        setState('ready')
      }
    }

    // Listener primário — o link de recovery dispara PASSWORD_RECOVERY ou SIGNED_IN
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        resolved = true
        setState('ready')
      }
    })

    // Check imediato (caso a sessão já esteja no localStorage)
    checkSession()

    // Fallback timeout — se em 5s não resolveu, considera link inválido
    const timeoutId = setTimeout(() => {
      if (!cancelled && !resolved) setState('no_session')
    }, 5000)

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Senha precisa ter pelo menos 6 caracteres'); return }
    if (password !== confirm) { toast.error('As senhas não conferem'); return }
    setState('saving')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('Erro: ' + error.message)
      setState('ready')
      return
    }
    setState('done')
    toast.success('Senha atualizada com sucesso!')
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface-500 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="Vyral AI" className="h-16 mx-auto mb-2" />
        </div>

        <div className="bg-surface-300 rounded-2xl border border-white/5 p-6">
          {state === 'verifying' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 size={20} className="animate-spin text-primary-400" />
              <p className="text-sm text-white/60">Validando link…</p>
              <p className="text-[10px] text-white/30">Se demorar mais de 5s, o link expirou.</p>
            </div>
          )}

          {state === 'no_session' && (
            <div className="text-center py-4 space-y-3">
              <AlertCircle size={32} className="text-red-400 mx-auto" />
              <h2 className="text-lg font-semibold text-white">Link inválido ou expirado</h2>
              <p className="text-sm text-white/60">O link de recuperação não é mais válido. Peça um novo na tela de login.</p>
              <button onClick={() => navigate('/auth')}
                className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:brightness-110 transition-all cursor-pointer">
                Ir pra tela de login
              </button>
            </div>
          )}

          {(state === 'ready' || state === 'saving') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Defina sua nova senha</h2>
                <p className="text-xs text-white/50">Use pelo menos 6 caracteres.</p>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Nova senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Confirmar senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500" />
                </div>
              </div>

              <button type="submit" disabled={state === 'saving'}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {state === 'saving' ? <><Loader2 size={18} className="animate-spin" /> Salvando…</> : 'Salvar nova senha'}
              </button>
            </form>
          )}

          {state === 'done' && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 size={32} className="text-green-400 mx-auto" />
              <h2 className="text-lg font-semibold text-white">Senha atualizada!</h2>
              <p className="text-sm text-white/60">Redirecionando…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
