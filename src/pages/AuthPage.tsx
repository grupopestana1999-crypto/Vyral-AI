import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { toast } from 'sonner'
import logoImg from '../assets/logo.png'

type Tab = 'login' | 'register' | 'forgot'

export function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, resetPassword } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (tab === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        toast.error(error)
      } else {
        navigate('/dashboard')
      }
    } else if (tab === 'register') {
      const { error } = await signUp(email, password)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Conta criada! Verifique seu e-mail.')
        setTab('login')
      }
    } else {
      const { error } = await resetPassword(email)
      if (error) {
        toast.error(error)
      } else {
        toast.success('E-mail de recuperação enviado!')
        setTab('login')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface-500 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="Vyral AI" className="h-16 mx-auto mb-2" />
          <p className="text-white/50 mt-2">
            {tab === 'login' && 'Acesse sua conta para continuar gerando conteúdo viral'}
            {tab === 'register' && 'Crie sua conta e comece a gerar conteúdo viral'}
            {tab === 'forgot' && 'Informe seu e-mail para recuperar sua senha'}
          </p>
        </div>

        <div className="bg-surface-300 rounded-2xl border border-white/5 p-6">
          {tab !== 'forgot' && (
            <div className="flex mb-6 bg-surface-400 rounded-lg p-1">
              <button
                onClick={() => setTab('login')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  tab === 'login'
                    ? 'bg-primary-600 text-white'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setTab('register')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  tab === 'register'
                    ? 'bg-primary-600 text-white'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Cadastrar
              </button>
            </div>
          )}

          {tab === 'forgot' && (
            <button
              onClick={() => setTab('login')}
              className="flex items-center gap-1 text-sm text-white/50 hover:text-white mb-4 cursor-pointer"
            >
              <ArrowLeft size={14} /> Voltar
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            {tab !== 'forgot' && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm text-white/60">Senha</label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setTab('forgot')}
                      className="text-xs text-primary-400 hover:text-primary-300 cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Sparkles size={18} />
                  {tab === 'login' && 'Entrar'}
                  {tab === 'register' && 'Criar conta'}
                  {tab === 'forgot' && 'Enviar e-mail de recuperação'}
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/30 mt-4">
          Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
        </p>
      </div>
    </div>
  )
}
