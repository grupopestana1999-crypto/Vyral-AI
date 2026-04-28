import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Upload, Sparkles, User as UserIcon } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { resizeImageFile } from '../lib/imageUtils'
import { HistoryTab } from '../components/boosters/HistoryTab'
import { applyCreditsFromResponse } from '../lib/applyCreditsResponse'
import { calcCredits } from '../types/credits'
import type { Avatar } from '../types/database'

const MAX_TEXT = 600

type Tab = 'criar' | 'historico'
type Mode = 'lite' | 'fast'
type AvatarTab = 'galeria' | 'upload'

export function AvatarVideosPage() {
  const navigate = useNavigate()
  const { subscription, user } = useAuthStore()
  const credits = subscription?.credits_remaining ?? 0

  const [tab, setTab] = useState<Tab>('criar')
  const [avatarTab, setAvatarTab] = useState<AvatarTab>('galeria')
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [uploadedAvatar, setUploadedAvatar] = useState<string>('')
  const [text, setText] = useState('')
  const [mode, setMode] = useState<Mode>('lite')
  const [generating, setGenerating] = useState(false)

  const cost = calcCredits('veo_video', { veo_mode: mode })
  const insufficient = credits < cost

  // Re-roda quando user.email vira disponível: auth-store inicializa async,
  // então no primeiro mount o JWT ainda não foi setado no client Supabase →
  // RLS de `avatars` retorna vazio. Depender de user?.email resolve isso.
  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('avatars').select('*').eq('is_active', true).limit(40)
      if (!cancelled && data) setAvatars(data)
    }
    load()
    return () => { cancelled = true }
  }, [user?.email])

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await resizeImageFile(file, 1024, 0.85)
      setUploadedAvatar(data); setSelectedAvatar(null)
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally { e.target.value = '' }
  }

  async function handleGenerate() {
    const avatarSrc = avatarTab === 'upload' ? uploadedAvatar : selectedAvatar?.image_url
    if (!avatarSrc) { toast.error('Selecione ou suba um avatar'); return }
    if (!text.trim()) { toast.error('Digite o texto que o avatar vai falar'); return }
    if (insufficient) { toast.error(`Créditos insuficientes (precisa ${cost})`); return }

    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('sessão expirada')

      const prompt = `Avatar realista falando o seguinte texto em português brasileiro com sincronização labial perfeita: "${text.trim()}". Movimentos naturais e expressões faciais autênticas. Sem texto na tela.`

      const r = await fetch('https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/generate-veo-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': token },
        body: JSON.stringify({ prompt, image_url: avatarSrc, mode }),
      })
      const data = await r.json()
      if (!r.ok || data?.error) { toast.error(data?.error || `Erro ${r.status}`); return }
      if (data?.task_id) {
        applyCreditsFromResponse(data)
        toast.success('Avatar entrou na fila — acompanhe na aba Histórico')
        setTab('historico')
        setText('')
      }
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <button onClick={() => navigate('/booster')} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={14} /> Voltar para Boosters
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">AVATAR VÍDEOS · Veo 3.1</p>
          <h1 className="text-xl font-bold text-white">Avatar com áudio sincronizado · 720p · até 15s</h1>
          <p className="text-sm text-white/50">Crie vídeos ultrarrealistas com avatar e áudio sincronizado em segundos</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary-300 text-xs font-bold">
          Lite 15cr · Fast 30cr
        </div>
      </div>

      <div className="flex gap-1 bg-surface-300 rounded-xl p-1 max-w-md">
        <button onClick={() => setTab('criar')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'criar' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Criar</button>
        <button onClick={() => setTab('historico')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'historico' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Histórico</button>
      </div>

      {tab === 'criar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Avatar</p>
              <div className="flex gap-1 bg-surface-400 rounded-lg p-1 mb-3">
                <button onClick={() => setAvatarTab('galeria')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${avatarTab === 'galeria' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Galeria</button>
                <button onClick={() => setAvatarTab('upload')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${avatarTab === 'upload' ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white'}`}>Upload</button>
              </div>

              {avatarTab === 'galeria' ? (
                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                  {avatars.length === 0 ? (
                    <p className="col-span-4 text-[11px] text-white/40">Carregando avatares…</p>
                  ) : avatars.map(a => (
                    <button key={a.id} onClick={() => { setSelectedAvatar(a); setUploadedAvatar('') }} className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${selectedAvatar?.id === a.id ? 'border-primary-500' : 'border-white/10 hover:border-white/30'}`}>
                      <img src={a.image_url} alt={a.name ?? ''} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <label className="block">
                  {uploadedAvatar ? (
                    <div className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer group aspect-square max-w-[160px]">
                      <img src={uploadedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all">
                        <Upload size={16} className="text-white/0 group-hover:text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed border-white/15 hover:border-primary-500/50 cursor-pointer transition-colors">
                      <UserIcon size={20} className="text-primary-400" />
                      <p className="text-sm text-white/70">Suba uma foto sua</p>
                      <p className="text-[11px] text-white/40">PNG, JPG até 7MB</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                </label>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wide">Texto que o avatar vai falar</p>
                <span className="text-[10px] text-white/30">{text.length}/{MAX_TEXT}</span>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_TEXT))}
                placeholder="Ex: Oi gente, dá uma olhada nesse produto incrível que eu testei…"
                rows={4}
                className="w-full px-4 py-2.5 bg-surface-400 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>

            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Modelo</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode('lite')} className={`py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${mode === 'lite' ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>Veo 3.1 Lite — 15cr</button>
                <button onClick={() => setMode('fast')} className={`py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${mode === 'fast' ? 'bg-primary-600 text-white' : 'bg-surface-400 text-white/50 hover:text-white'}`}>Veo 3.1 Fast — 30cr</button>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={generating || insufficient || !text.trim() || (avatarTab === 'galeria' ? !selectedAvatar : !uploadedAvatar)} className="w-full py-3 rounded-xl bg-neon text-surface-500 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Enviando…' : `Gerar Vídeo — ${cost} cr`}
            </button>

            <p className="text-[11px] text-white/40 text-center">Saldo: <span className="text-neon font-semibold">{credits}</span> créditos</p>
          </div>

          <div className="bg-surface-300 border border-white/5 rounded-xl p-5 space-y-3 text-sm text-white/70 self-start">
            <p className="text-xs text-white/40 uppercase tracking-wide">Como funciona</p>
            <ol className="space-y-2 list-decimal list-inside text-[13px]">
              <li>Escolha um avatar da galeria OU suba uma foto sua</li>
              <li>Digite o texto que o avatar vai falar (até {MAX_TEXT} chars)</li>
              <li>Selecione o modelo: <strong>Lite</strong> (mais rápido) ou <strong>Fast</strong> (qualidade superior)</li>
              <li>Clique Gerar — debita conforme modelo e entra na fila</li>
              <li>Resultado aparece na aba <span className="text-primary-400 font-medium">Histórico</span></li>
            </ol>
            <div className="bg-surface-400/50 border border-white/5 rounded-lg p-3 text-[12px]">
              <p className="text-white/60 leading-relaxed"><span className="text-amber-300 font-medium">Dica:</span> textos curtos (1 a 2 frases) renderizam mais naturais. Avatares com fundo neutro funcionam melhor.</p>
            </div>
          </div>
        </div>
      ) : (
        <HistoryTab tool="veo_video" mediaType="video" />
      )}
    </div>
  )
}
