import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lightbulb, Gift, ChevronLeft, ChevronRight, Radar, Target, MessageCircle, GraduationCap, ArrowRight, Sparkles } from 'lucide-react'
import { LazyVideo } from '../components/LazyVideo'

const TIPS = [
  { title: 'Regra do 3-5-7 pra Trocar Produto', tag: 'Estratégia', text: 'Faça 3-5 vídeos com abordagens diferentes antes de desistir de um produto. Se após 7 vídeos não vendeu nada, troque.' },
  { title: 'Use o Studio IA para criar UGC', tag: 'Produtividade', text: 'Combine produtos virais com influencers virtuais para gerar conteúdo UGC ultra-realista em segundos.' },
  { title: 'Analise os Vídeos Virais', tag: 'Análise', text: 'Observe os hooks, dores e CTAs dos vídeos que mais faturam. Replique o padrão no seu conteúdo.' },
  { title: 'Compre créditos extras quando precisar', tag: 'Créditos', text: 'Use os pacotes avulsos para não ficar sem créditos nos momentos mais importantes de produção.' },
  { title: 'Indique amigos e ganhe créditos', tag: 'Referral', text: 'Cada indicação pode render até 300 créditos extras dependendo do seu plano.' },
  { title: 'Foque em categorias com alta demanda', tag: 'Tendência', text: 'Beleza, Roupas e Equipamentos costumam ter os melhores resultados no TikTok Shop.' },
]

const COMMUNITY_URL = 'https://chat.whatsapp.com/HA2D0OQnnYr27rduhDGKgo?mode=gi_t'
const TRAINING_URL = 'https://hotmart.com/pt-br/club/area-de-membros-vyral-ai'

interface FeatureCard {
  title: string
  description: string
  videoUrl: string
  pricingHint?: string
  route: string
}

const FEATURED: FeatureCard[] = [
  {
    title: 'Studio IA',
    description: 'Crie imagens UGC ultrarrealistas com produtos e influencers virtuais',
    videoUrl: 'https://mdueuksfunifyxfqpmdv.supabase.co/storage/v1/object/public/public-media/boosters/veo-preview.png',
    pricingHint: '2 cr · 1ª grátis',
    route: '/influencer',
  },
  {
    title: 'Influencer Lab',
    description: 'Workflow visual por nodes pra criar imagens UGC com influencers virtuais',
    videoUrl: 'https://static.higgsfield.ai/explore/soul-character.mp4',
    pricingHint: '2 cr',
    route: '/booster/influencer-lab',
  },
  {
    title: 'Avatar Vídeos',
    description: 'Crie vídeos ultrarrealistas com avatar e áudio sincronizado em segundos',
    videoUrl: 'https://mdueuksfunifyxfqpmdv.supabase.co/storage/v1/object/public/public-media/boosters/video%20do%20BOOSTER%20=%20Avatar%20.mp4',
    pricingHint: '720p 15cr / 1080p 20cr',
    route: '/booster/avatar-video',
  },
  {
    title: 'Avatar Creator',
    description: 'Crie seu influencer personalizado com ajustes de pele, corpo e cabelo',
    videoUrl: 'https://cdn.higgsfield.ai/application_main/bb9d59e1-0493-4031-a97d-27fc7f660c89.mp4',
    pricingHint: '2 cr',
    route: '/booster/avatar-creator',
  },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [tipIdx, setTipIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 8000)
    return () => clearInterval(interval)
  }, [])

  const tip = TIPS[tipIdx]

  return (
    <div className="space-y-6">
      {/* Dica do Dia */}
      <div className="bg-surface-300 border border-white/5 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-white/40 uppercase tracking-wide">Dica do dia</p>
              <span className="px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400 text-[10px] font-medium">{tip.tag}</span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">{tip.title}</p>
            <p className="text-sm text-white/50">{tip.text}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setTipIdx(i => (i - 1 + TIPS.length) % TIPS.length)} className="p-1 rounded hover:bg-white/5 text-white/30 cursor-pointer"><ChevronLeft size={16} /></button>
            <button onClick={() => setTipIdx(i => (i + 1) % TIPS.length)} className="p-1 rounded hover:bg-white/5 text-white/30 cursor-pointer"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* 4 Cards estilo boosters */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Comece já</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURED.map(f => (
            <button
              key={f.title}
              onClick={() => navigate(f.route)}
              className="group relative aspect-[4/5] bg-surface-300 border border-white/5 rounded-xl overflow-hidden text-left transition-all cursor-pointer hover:border-primary-500/40"
            >
              <div className="absolute inset-0">
                {/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(f.videoUrl) ? (
                  <img src={f.videoUrl} alt={f.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <LazyVideo src={f.videoUrl} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
              {f.pricingHint && (
                <div className="absolute top-2 right-2 z-30">
                  <span className="px-2 py-0.5 rounded-full bg-primary-600/90 text-white text-[10px] font-bold backdrop-blur">{f.pricingHint}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 z-30">
                <h3 className="text-sm font-bold text-white mb-0.5 truncate">{f.title}</h3>
                <p className="text-[11px] text-white/70 line-clamp-2 mb-2">{f.description}</p>
                <div className="flex items-center gap-1 text-[11px] text-primary-300 font-semibold">
                  Abrir <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Radar de Oportunidades — 2 ícones */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Radar size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Radar de Oportunidades</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/radar/tiktok')}
            className="group flex items-center gap-3 bg-surface-300 border border-white/5 rounded-xl p-4 hover:border-cyan-500/40 transition-all cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
              <Radar size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Tik Tok Shop Radar</p>
              <p className="text-xs text-white/50">Produtos · Vídeos · Criadores virais</p>
            </div>
            <ArrowRight size={14} className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
          <button
            onClick={() => navigate('/radar/tarefas')}
            className="group flex items-center gap-3 bg-surface-300 border border-white/5 rounded-xl p-4 hover:border-purple-500/40 transition-all cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
              <Target size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Radar de Tarefas Vyral</p>
              <p className="text-xs text-white/50">Oportunidades de freela personalizadas</p>
            </div>
            <ArrowRight size={14} className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>

      {/* 2 botões de acesso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4 hover:border-green-500/50 transition-colors cursor-pointer"
        >
          <MessageCircle size={20} className="text-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Acesse a Comunidade VIP</p>
            <p className="text-xs text-white/50">WhatsApp exclusivo Vyral AI</p>
          </div>
          <ArrowRight size={14} className="text-white/40 shrink-0" />
        </a>
        <a
          href={TRAINING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-4 hover:border-amber-500/50 transition-colors cursor-pointer"
        >
          <GraduationCap size={20} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Descubra como usar o Vyral</p>
            <p className="text-xs text-white/50">Treinamento completo no Hotmart Club</p>
          </div>
          <ArrowRight size={14} className="text-white/40 shrink-0" />
        </a>
      </div>

      {/* Ganhe créditos */}
      <Link to="/referral" className="block bg-gradient-to-r from-primary-600/20 to-accent-600/20 border border-primary-500/20 rounded-xl p-4 hover:border-primary-500/40 transition-colors">
        <div className="flex items-center gap-3">
          <Gift size={20} className="text-primary-400" />
          <div>
            <p className="text-sm font-semibold text-white">Ganhe créditos grátis</p>
            <p className="text-xs text-white/50">Convide e ganhe +600 créditos</p>
          </div>
        </div>
      </Link>
    </div>
  )
}
