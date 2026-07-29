import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { useAuthStore } from './stores/auth-store'
import { useVersionCheck } from './hooks/useVersionCheck'
import { useGenerationErrorStore } from './stores/generation-error-store'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { ViralProductsPage } from './pages/ViralProductsPage'
import { ViralProductDetailPage } from './pages/ViralProductDetailPage'
import { ViralVideosPage } from './pages/ViralVideosPage'
import { ViralCreatorsPage } from './pages/ViralCreatorsPage'
import { StudioPage } from './pages/StudioPage'
import { BoostersPage } from './pages/BoostersPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { CalculatorPage } from './pages/CalculatorPage'
import { ReferralPage } from './pages/ReferralPage'
import { CreditsPage } from './pages/CreditsPage'
import { BoosterDetailPage } from './pages/BoosterDetailPage'
import { EditImagePage } from './pages/EditImagePage'
import { VideosIaPage } from './pages/VideosIaPage'
import { FilmesIaPage } from './pages/FilmesIaPage'
import { AvatarVideosPage } from './pages/AvatarVideosPage'
import { ImitarMovimentoPage } from './pages/ImitarMovimentoPage'
import { AvatarCreatorPage } from './pages/AvatarCreatorPage'
import { PeleUltraPage } from './pages/PeleUltraPage'
import { SoraRemoverPage } from './pages/SoraRemoverPage'
import { ClonagemVozPage } from './pages/ClonagemVozPage'
import { TranscricaoPage } from './pages/TranscricaoPage'
import { InfluencerLabPage } from './pages/InfluencerLabPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminTemplates } from './pages/admin/AdminTemplates'
import { AdminGenerations } from './pages/admin/AdminGenerations'
import { AdminBoosters } from './pages/admin/AdminBoosters'
import { AdminReferrals } from './pages/admin/AdminReferrals'
import { AdminLogs } from './pages/admin/AdminLogs'
import { AdminSettings } from './pages/admin/AdminSettings'
import { AdminViralProducts } from './pages/admin/AdminViralProducts'
import { AdminViralVideos } from './pages/admin/AdminViralVideos'
import { AdminViralCreators } from './pages/admin/AdminViralCreators'
import { AdminPagamentos } from './pages/admin/AdminPagamentos'
import { AdminEmail } from './pages/admin/AdminEmail'
import { AdminRadar } from './pages/admin/AdminRadar'
import { RadarPage } from './pages/RadarPage'
import { RadarTiktokPage } from './pages/RadarTiktokPage'
import { RadarTarefasPage } from './pages/RadarTarefasPage'
import { SuperVyralPage } from './pages/SuperVyralPage'
import { TermsPage } from './pages/TermsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { PublicCheckoutPage } from './pages/PublicCheckoutPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { useBoosterSettings } from './stores/booster-settings-store'

export default function App() {
  const initialize = useAuthStore((s: { initialize: () => Promise<void> }) => s.initialize)
  const loadBooster = useBoosterSettings(s => s.load)
  const subscribeBooster = useBoosterSettings(s => s.subscribe)
  const [mostrarAviso, setMostrarAviso] = useState(true)
  // E65 dia 5: avisa user quando a aba tá com bundle antigo depois de deploy Railway.
  useVersionCheck()

  useEffect(() => {
    initialize()
    loadBooster()
    const unsub = subscribeBooster()
    return unsub
  }, [initialize, loadBooster, subscribeBooster])

  // E65 dia 5: preview do modal "Créditos esgotados" via query param.
  // Uso: acesse qualquer rota autenticada com ?preview=credits-esgotados
  // Zero credito consumido, zero dado alterado — só mostra a UI.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('preview') === 'credits-esgotados') {
      useGenerationErrorStore.getState().openCapExhausted()
    }
  }, [])

  return (
<BrowserRouter>
  <Toaster
    position="top-right"
    theme="dark"
    toastOptions={{
      style: {
        background: '#1a1828',
        border: '1px solid rgba(255,255,255,0.05)',
        color: '#fff',
      },
    }}
  />

  {/* COLE O AVISO AQUI */}
  {mostrarAviso && (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
      }}
    >
      <div
        style={{
          background: '#1a1828',
          color: '#fff',
          width: '90%',
          maxWidth: '500px',
          borderRadius: '16px',
          padding: '30px',
          textAlign: 'center',
        }}
      >
        <h2>⚠️ Aviso Importante</h2>

        <p style={{ marginTop: 20 }}>
         🚨ATENÇÃO: O APLICATIVO DO VYRAL AI ATUALIZOU!
O nosso aplicativo atualizou e agora você consegue acessar o Vyral AI nesse link: https://vyral-ia.bolt.host/
        </p>

        <button
onClick={() => {
  window.location.href = 'https://vyral-ia.bolt.host/'
}}
          style={{
            marginTop: 25,
            padding: '12px 30px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            background: '#7c3aed',
            color: '#fff',
            fontWeight: 'bold',
          }}
        >
          Acessar o novo Aplicativo!
        </button>
      </div>
    </div>
  )}

  <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/comprar" element={<PublicCheckoutPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/viral-products" element={<ViralProductsPage />} />
          <Route path="/viral-products/:id" element={<ViralProductDetailPage />} />
          <Route path="/viral-videos" element={<ViralVideosPage />} />
          <Route path="/viral-creators" element={<ViralCreatorsPage />} />
          <Route path="/influencer" element={<StudioPage />} />
          <Route path="/radar" element={<RadarPage />} />
          <Route path="/radar/tiktok" element={<RadarTiktokPage />} />
          <Route path="/radar/tarefas" element={<RadarTarefasPage />} />
          <Route path="/booster" element={<BoostersPage />} />
          <Route path="/booster/super-vyral" element={<SuperVyralPage />} />
          <Route path="/booster/edit-image" element={<EditImagePage />} />
          <Route path="/booster/influencer-lab" element={<InfluencerLabPage />} />
          <Route path="/booster/avatar-video" element={<AvatarVideosPage />} />
          <Route path="/booster/avatar-creator" element={<AvatarCreatorPage />} />
          <Route path="/booster/pele-ultra" element={<PeleUltraPage />} />
          <Route path="/booster/sora-remover" element={<SoraRemoverPage />} />
          <Route path="/booster/clonagem-voz" element={<ClonagemVozPage />} />
          <Route path="/booster/transcricao" element={<TranscricaoPage />} />
          <Route path="/booster/motion" element={<ImitarMovimentoPage />} />
          <Route path="/booster/videos-ia" element={<VideosIaPage />} />
          <Route path="/booster/filmes-ia" element={<FilmesIaPage />} />
          {/* Aliases legados pra evitar 404 em links antigos */}
          <Route path="/booster/grok" element={<Navigate to="/booster/videos-ia" replace />} />
          <Route path="/booster/veo" element={<Navigate to="/booster/avatar-video" replace />} />
          <Route path="/booster/kling" element={<Navigate to="/booster/filmes-ia" replace />} />
          <Route path="/booster/:tool" element={<BoosterDetailPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/referral" element={<ReferralPage />} />
          <Route path="/credits" element={<CreditsPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="pagamentos" element={<AdminPagamentos />} />
            <Route path="credits" element={<AdminGenerations />} />
            <Route path="email" element={<AdminEmail />} />
            <Route path="viral-products" element={<AdminViralProducts />} />
            <Route path="viral-videos" element={<AdminViralVideos />} />
            <Route path="viral-creators" element={<AdminViralCreators />} />
            <Route path="templates" element={<AdminTemplates />} />
            <Route path="boosters" element={<AdminBoosters />} />
            <Route path="radar" element={<AdminRadar />} />
            <Route path="referrals" element={<AdminReferrals />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

